//! Stages, verifies, and confirms content-addressed media objects.

use super::receipts::{ConfirmedReceiptBatch, PendingReceipt, ProjectionEvent};
use crate::{
    contracts::locale::KnowledgeLocale,
    media::{cas_relative_path, sha256_hex},
    projection::{
        contract::LocaleProjectionPlan, coverage::ProjectionOperationId,
        filesystem::recursive_files,
    },
    CasError,
};
use std::{collections::BTreeMap, fs, io::Write, path::Path};

pub(crate) fn stage_cas_objects(
    plans: &BTreeMap<KnowledgeLocale, LocaleProjectionPlan>,
    staging: &Path,
) -> Result<BTreeMap<KnowledgeLocale, ConfirmedReceiptBatch>, CasError> {
    let mut objects = BTreeMap::<String, &[u8]>::new();
    for plan in plans.values() {
        let contract = &plan.contract;
        for operation in &contract.cas {
            if let Some(existing) = objects.insert(operation.content_hash.clone(), &operation.bytes)
            {
                if existing != operation.bytes {
                    return Err(CasError::invalid(
                        &operation.content_hash,
                        "deduplicate source objects",
                        "content hash has divergent source bytes",
                    ));
                }
            }
        }
    }
    for (hash, bytes) in objects {
        if sha256_hex(bytes) != hash {
            return Err(CasError::invalid(
                hash,
                "verify source hash",
                "source media hash changed during build",
            ));
        }
        let path = staging.join(
            cas_relative_path(&hash)
                .map_err(|detail| CasError::invalid(&hash, "resolve staging path", detail))?,
        );
        let parent = path
            .parent()
            .ok_or_else(|| CasError::invalid(&path, "resolve staging parent", "missing parent"))?;
        fs::create_dir_all(parent).map_err(|source| CasError::Io {
            artifact: parent.to_path_buf(),
            operation: "create staging directory",
            source,
        })?;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .map_err(|source| CasError::Io {
                artifact: path.clone(),
                operation: "create staging object",
                source,
            })?;
        file.write_all(bytes).map_err(|source| CasError::Io {
            artifact: path.clone(),
            operation: "write staging object",
            source,
        })?;
        file.sync_all().map_err(|source| CasError::Io {
            artifact: path.clone(),
            operation: "sync staging object",
            source,
        })?;
        drop(file);
        let persisted = fs::read(&path).map_err(|source| CasError::Io {
            artifact: path.clone(),
            operation: "reread staging object",
            source,
        })?;
        if sha256_hex(&persisted) != hash {
            return Err(CasError::invalid(
                &path,
                "post-write verification",
                "content hash mismatch",
            ));
        }
    }
    let mut receipts = BTreeMap::new();
    for (locale, plan) in plans {
        let contract = &plan.contract;
        let mut pending = Vec::new();
        for operation in &contract.cas {
            let path = staging.join(cas_relative_path(&operation.content_hash).map_err(
                |detail| CasError::invalid(&operation.content_hash, "resolve receipt path", detail),
            )?);
            let persisted = fs::read(&path).map_err(|source| CasError::Io {
                artifact: path.clone(),
                operation: "read object for receipt",
                source,
            })?;
            if sha256_hex(&persisted) != operation.content_hash {
                return Err(CasError::invalid(
                    &path,
                    "receipt verification",
                    "content hash mismatch",
                ));
            }
            pending.push(
                PendingReceipt::new(
                    ProjectionOperationId::CasObject {
                        content_hash: operation.content_hash.clone(),
                    },
                    operation.obligations.clone(),
                    ProjectionEvent::CasObject {
                        content_hash: operation.content_hash.clone(),
                    },
                    1,
                )
                .map_err(|source| CasError::Contract {
                    artifact: path.clone(),
                    operation: "create receipt",
                    source: Box::new(source),
                })?,
            );
        }
        if !pending.is_empty() {
            receipts.insert(
                *locale,
                ConfirmedReceiptBatch::confirm(pending).map_err(|source| CasError::Contract {
                    artifact: staging.to_path_buf(),
                    operation: "confirm receipts",
                    source: Box::new(source),
                })?,
            );
        }
    }
    Ok(receipts)
}

pub(crate) fn commit_cas(staging: &Path, final_root: &Path) -> Result<(), CasError> {
    fs::create_dir_all(final_root).map_err(|source| CasError::Io {
        artifact: final_root.to_path_buf(),
        operation: "create final root",
        source,
    })?;
    for staged in recursive_files(staging)? {
        let relative = staged.strip_prefix(staging).map_err(|_| {
            CasError::invalid(&staged, "resolve final path", "path escapes staging")
        })?;
        let final_path = final_root.join(relative);
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent).map_err(|source| CasError::Io {
                artifact: parent.to_path_buf(),
                operation: "create fragment directory",
                source,
            })?;
        }
        if final_path.exists() {
            let expected = final_path
                .file_stem()
                .and_then(|value| value.to_str())
                .ok_or_else(|| {
                    CasError::invalid(&final_path, "read object identity", "invalid object name")
                })?;
            let bytes = fs::read(&final_path).map_err(|source| CasError::Io {
                artifact: final_path.clone(),
                operation: "verify existing object",
                source,
            })?;
            if sha256_hex(&bytes) != expected {
                return Err(CasError::invalid(
                    &final_path,
                    "verify existing object",
                    "content hash mismatch",
                ));
            }
            fs::remove_file(&staged).map_err(|source| CasError::Io {
                artifact: staged.clone(),
                operation: "discard duplicate staged object",
                source,
            })?;
        } else {
            fs::rename(&staged, &final_path).map_err(|source| CasError::Io {
                artifact: final_path.clone(),
                operation: "commit object",
                source,
            })?;
        }
    }
    Ok(())
}
