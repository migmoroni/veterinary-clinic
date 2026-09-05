//! Stages, verifies, and confirms content-addressed media objects.

use super::receipts::{ConfirmedReceiptBatch, PendingReceipt, ProjectionEvent};
use crate::{
    contracts::locale::KnowledgeLocale,
    media::{cas_relative_path, sha256_hex},
    projection::{
        contract::ProjectionContract, coverage::ProjectionOperationId, filesystem::recursive_files,
    },
};
use std::{collections::BTreeMap, fs, io::Write, path::Path};

pub(crate) fn stage_cas_objects(
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
    staging: &Path,
) -> Result<BTreeMap<KnowledgeLocale, ConfirmedReceiptBatch>, String> {
    let mut objects = BTreeMap::<String, &[u8]>::new();
    for contract in contracts.values() {
        for operation in &contract.cas {
            if let Some(existing) = objects.insert(operation.content_hash.clone(), &operation.bytes)
            {
                if existing != operation.bytes {
                    return Err(format!(
                        "CAS hash has divergent source bytes: {}",
                        operation.content_hash
                    ));
                }
            }
        }
    }
    for (hash, bytes) in objects {
        if sha256_hex(bytes) != hash {
            return Err(format!("source media hash changed during build: {hash}"));
        }
        let path = staging.join(cas_relative_path(&hash)?);
        let parent = path
            .parent()
            .ok_or_else(|| "invalid CAS staging path".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create CAS staging directory: {error}"))?;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .map_err(|error| {
                format!(
                    "cannot create CAS staging object {}: {error}",
                    path.display()
                )
            })?;
        file.write_all(bytes)
            .map_err(|error| format!("cannot write CAS staging object: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("cannot sync CAS staging object: {error}"))?;
        drop(file);
        let persisted = fs::read(&path)
            .map_err(|error| format!("cannot reread CAS staging object: {error}"))?;
        if sha256_hex(&persisted) != hash {
            return Err(format!(
                "CAS staging object failed post-write verification: {}",
                path.display()
            ));
        }
    }
    let mut receipts = BTreeMap::new();
    for (locale, contract) in contracts {
        let mut pending = Vec::new();
        for operation in &contract.cas {
            let path = staging.join(cas_relative_path(&operation.content_hash)?);
            let persisted = fs::read(&path)
                .map_err(|error| format!("cannot reread CAS staging object: {error}"))?;
            if sha256_hex(&persisted) != operation.content_hash {
                return Err(format!(
                    "CAS staging object failed receipt verification: {}",
                    path.display()
                ));
            }
            pending.push(PendingReceipt::new(
                ProjectionOperationId::CasObject {
                    content_hash: operation.content_hash.clone(),
                },
                operation.obligations.clone(),
                ProjectionEvent::CasObject {
                    content_hash: operation.content_hash.clone(),
                },
                1,
            )?);
        }
        if !pending.is_empty() {
            receipts.insert(*locale, ConfirmedReceiptBatch::confirm(pending)?);
        }
    }
    Ok(receipts)
}

pub(crate) fn commit_cas(staging: &Path, final_root: &Path) -> Result<(), String> {
    fs::create_dir_all(final_root).map_err(|error| format!("cannot create CAS/system: {error}"))?;
    for staged in recursive_files(staging)? {
        let relative = staged
            .strip_prefix(staging)
            .map_err(|_| "invalid staged CAS path".to_string())?;
        let final_path = final_root.join(relative);
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("cannot create CAS fragment directory: {error}"))?;
        }
        if final_path.exists() {
            let expected = final_path
                .file_stem()
                .and_then(|value| value.to_str())
                .ok_or_else(|| "invalid CAS object name".to_string())?;
            let bytes = fs::read(&final_path)
                .map_err(|error| format!("cannot verify existing CAS object: {error}"))?;
            if sha256_hex(&bytes) != expected {
                return Err(format!(
                    "existing CAS object is corrupt: {}",
                    final_path.display()
                ));
            }
            fs::remove_file(&staged)
                .map_err(|error| format!("cannot discard duplicate staged CAS object: {error}"))?;
        } else {
            fs::rename(&staged, &final_path).map_err(|error| {
                format!("cannot commit CAS object {}: {error}", final_path.display())
            })?;
        }
    }
    Ok(())
}
