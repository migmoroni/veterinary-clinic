pub(crate) mod contract;
mod writers;

use self::{
    contract::ProjectionContract,
    writers::{write_metadata, write_system, write_system_media},
};
use crate::{
    artifact_verifier::ArtifactVerifier,
    databases::{self, DatabaseKind, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION},
    ledger::{CompletedLedger, ProjectionLedger},
    media::{cas_relative_path, sha256_hex},
    report::{
        self, BuildContext, BuildResult, CasResult, DatabaseArtifact, LocaleArtifacts,
        LocaleProjection, MediaProjection, ProjectionReport, ProjectionResult, ProjectionSource,
        TypeProjection,
    },
    schemas,
    source::{KnowledgeLocale, LOCALES},
    validation::ValidatedSource,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
};

pub fn build_artifacts(
    source: &ValidatedSource,
    output: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    fs::create_dir_all(output).map_err(|error| {
        format!(
            "cannot create output directory {}: {error}",
            output.display()
        )
    })?;
    let versions_root = output.join("versions");
    fs::create_dir_all(&versions_root)
        .map_err(|error| format!("cannot create versions directory: {error}"))?;
    let final_version = versions_root.join(context.build_version.to_string());
    let contracts = build_contracts(source, context)?;
    if final_version.exists() {
        return reuse_or_reject_existing(source, output, &final_version, context, &contracts);
    }

    let staging_version = versions_root.join(format!(".{}.staging", context.build_version));
    let staging_cas = output.join(format!(".cas-{}.staging", context.build_version));
    remove_stale_staging(&staging_version)?;
    remove_stale_staging(&staging_cas)?;
    fs::create_dir_all(&staging_version)
        .map_err(|error| format!("cannot create version staging directory: {error}"))?;
    fs::create_dir_all(&staging_cas)
        .map_err(|error| format!("cannot create CAS staging directory: {error}"))?;

    let result = build_in_staging(source, &contracts, &staging_version, &staging_cas, context);
    match result {
        Ok(result) => {
            commit_cas(&staging_cas, &output.join("CAS/system"))?;
            if staging_cas.exists() {
                fs::remove_dir_all(&staging_cas)
                    .map_err(|error| format!("cannot remove CAS staging directory: {error}"))?;
            }
            fs::rename(&staging_version, &final_version).map_err(|error| {
                format!(
                    "cannot atomically finalize version {}: {error}",
                    context.build_version
                )
            })?;
            Ok(result)
        }
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_version);
            let _ = fs::remove_dir_all(&staging_cas);
            Err(error)
        }
    }
}

fn build_contracts(
    source: &ValidatedSource,
    context: &BuildContext,
) -> Result<BTreeMap<KnowledgeLocale, ProjectionContract>, String> {
    LOCALES
        .into_iter()
        .map(|locale| {
            ProjectionContract::build(source, locale, context).map(|contract| (locale, contract))
        })
        .collect()
}

fn build_in_staging(
    source: &ValidatedSource,
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
    staging_version: &Path,
    staging_cas: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    let mut locale_artifacts = BTreeMap::new();
    let mut completed_ledgers = BTreeMap::new();
    let mut checksum_entries = BTreeMap::new();
    let mut system_fingerprint = None;
    let mut media_fingerprint = None;
    let mut all_cas_hashes = BTreeSet::new();

    for locale in LOCALES {
        let contract = contracts.get(&locale).unwrap();
        let mut ledger = ProjectionLedger::new(locale, contract.expected_obligations.clone());
        let mut compilation_journal = ledger.journal();
        for operation in &contract.compilation {
            for obligation in &operation.obligations {
                compilation_journal.complete(obligation.clone());
            }
        }
        ledger.commit(compilation_journal)?;

        let locale_directory = staging_version.join("locales").join(locale.as_str());
        fs::create_dir_all(&locale_directory)
            .map_err(|error| format!("cannot create locale directory {locale}: {error}"))?;
        let system_path = locale_directory.join("veterinary_clinic_system.db");
        let system_media_path = locale_directory.join("veterinary_clinic_system_media.db");

        let mut system = databases::create(&system_path, DatabaseKind::System)?;
        write_metadata(
            &system,
            DatabaseKind::System,
            &contract.metadata,
            &mut ledger,
        )?;
        write_system(&mut system, &contract.system, &mut ledger)?;
        let current_system_fingerprint = databases::finalize(system, &system_path)?;
        assert_shared_fingerprint(
            &mut system_fingerprint,
            &current_system_fingerprint,
            "system",
            locale,
        )?;

        let mut system_media = databases::create(&system_media_path, DatabaseKind::SystemMedia)?;
        write_metadata(
            &system_media,
            DatabaseKind::SystemMedia,
            &contract.metadata,
            &mut ledger,
        )?;
        write_system_media(&mut system_media, &contract.system_media, &mut ledger)?;
        let current_media_fingerprint = databases::finalize(system_media, &system_media_path)?;
        assert_shared_fingerprint(
            &mut media_fingerprint,
            &current_media_fingerprint,
            "system_media",
            locale,
        )?;

        let locale_hashes = contract
            .cas
            .iter()
            .map(|operation| operation.content_hash.clone())
            .collect::<BTreeSet<_>>();
        all_cas_hashes.extend(locale_hashes.iter().cloned());
        let system_relative =
            artifact_database_path(context.build_version, locale, "veterinary_clinic_system.db");
        let media_relative = artifact_database_path(
            context.build_version,
            locale,
            "veterinary_clinic_system_media.db",
        );
        let system_artifact = database_artifact(
            &system_path,
            system_relative.clone(),
            current_system_fingerprint,
        )?;
        let media_artifact = database_artifact(
            &system_media_path,
            media_relative.clone(),
            current_media_fingerprint,
        )?;
        checksum_entries.insert(system_relative, system_artifact.checksum_sha256.clone());
        checksum_entries.insert(media_relative, media_artifact.checksum_sha256.clone());
        locale_artifacts.insert(
            locale.to_string(),
            LocaleArtifacts {
                system: system_artifact,
                system_media: media_artifact,
                cas_set_digest_sha256: set_digest(&locale_hashes),
            },
        );
        completed_ledgers.insert(locale, ledger);
    }

    stage_cas_objects(contracts, staging_cas)?;
    let mut finished_ledgers = BTreeMap::new();
    for (locale, mut ledger) in completed_ledgers {
        let contract = contracts.get(&locale).unwrap();
        let mut journal = ledger.journal();
        for operation in &contract.cas {
            for obligation in &operation.obligations {
                journal.complete(obligation.clone());
            }
        }
        ledger.commit(journal)?;
        finished_ledgers.insert(locale, ledger.finish()?);
    }
    for hash in &all_cas_hashes {
        let relative = format!(
            "CAS/system/{}",
            report::normalized_relative_path(&cas_relative_path(hash)?)?
        );
        checksum_entries.insert(relative, hash.clone());
    }

    let projection_report = projection_report(source, context, contracts, &finished_ledgers);
    schemas::validate_projection_report(&projection_report)?;
    let projection_path = staging_version.join("projection-report.json");
    let projection_bytes = report::write_json(&projection_path, &projection_report)?;
    let projection_checksum = sha256_hex(&projection_bytes);
    let projection_relative = format!("versions/{}/projection-report.json", context.build_version);
    checksum_entries.insert(projection_relative.clone(), projection_checksum.clone());

    let checksum_path = staging_version.join("checksums.sha256");
    let checksum_contents = checksum_entries
        .iter()
        .map(|(path, checksum)| format!("{checksum}  {path}\n"))
        .collect::<String>();
    fs::write(&checksum_path, checksum_contents.as_bytes())
        .map_err(|error| format!("cannot write checksums.sha256: {error}"))?;

    let result = BuildResult {
        schema_version: 1,
        builder_version: env!("CARGO_PKG_VERSION").to_string(),
        build_version: context.build_version,
        release: context.release.clone(),
        source_digest_sha256: source.source_digest_sha256.clone(),
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
        locales: locale_artifacts,
        cas: CasResult {
            algorithm: "sha256".to_string(),
            hash_encoding: "lowercase_hex".to_string(),
            root: "CAS/system".to_string(),
            layout: "sha256_hex_2_2_bin".to_string(),
            path_pattern: "{hash[0..2]}/{hash[2..4]}/{hash}.bin".to_string(),
            object_count: all_cas_hashes.len(),
            set_digest_sha256: set_digest(&all_cas_hashes),
        },
        projection: ProjectionResult {
            report_path: projection_relative,
            checksum_sha256: projection_checksum,
        },
        checksum_file: format!("versions/{}/checksums.sha256", context.build_version),
    };
    schemas::validate_build_result(&result)?;
    report::write_json(&staging_version.join("build-result.json"), &result)?;
    ArtifactVerifier::new(
        source,
        context,
        contracts,
        staging_version,
        staging_cas,
        &result,
    )
    .verify()?;
    Ok(result)
}

fn projection_report(
    source: &ValidatedSource,
    context: &BuildContext,
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
    ledgers: &BTreeMap<KnowledgeLocale, CompletedLedger>,
) -> ProjectionReport {
    let entities_by_type = source
        .entities
        .iter()
        .fold(BTreeMap::new(), |mut result, entry| {
            *result
                .entry(entry.source.entity.entity_type().to_string())
                .or_insert(0) += 1;
            result
        });
    let localized_fragments = source
        .localized_fragments_by_locale
        .iter()
        .map(|(locale, count)| (locale.to_string(), *count))
        .collect::<BTreeMap<_, _>>();
    let locales = ledgers
        .iter()
        .map(|(locale, ledger)| {
            debug_assert_eq!(ledger.locale, *locale);
            let contract = contracts.get(locale).unwrap();
            let consumed_entities = ledger.entities_by_type();
            let rows = ledger.rows_by_type();
            let projected_by_type = entities_by_type
                .keys()
                .map(|entity_type| {
                    (
                        entity_type.clone(),
                        TypeProjection {
                            entities: *consumed_entities.get(entity_type).unwrap_or(&0),
                            rows_by_table: rows.get(entity_type).cloned().unwrap_or_default(),
                        },
                    )
                })
                .collect();
            (
                locale.to_string(),
                LocaleProjection {
                    projected_by_type,
                    rows_by_database: contract.rows_by_database(),
                    expected_obligation_count: ledger.expected_count(),
                    completed_obligation_count: ledger.completed_count(),
                    row_event_count: ledger.row_event_count(),
                    operation_count: contract.operation_count(),
                    resolved_relation_count: ledger.relation_count(),
                    consumed_localized_fragments: ledger.localized_fragment_count(),
                    evidence_digest_sha256: ledger.evidence_digest(),
                },
            )
        })
        .collect();
    let unique_hashes = source
        .media
        .values()
        .map(|asset| asset.content_hash_sha256.as_str())
        .collect::<BTreeSet<_>>()
        .len();
    ProjectionReport {
        schema_version: 3,
        source_digest_sha256: source.source_digest_sha256.clone(),
        build_version: context.build_version,
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
        source: ProjectionSource {
            entities_by_type,
            relation_count: source.relation_count,
            localized_fragments_by_locale: localized_fragments,
            source_files: source.source_files,
        },
        locales,
        media: MediaProjection {
            source_files: source
                .media
                .values()
                .map(|asset| asset.source_path.as_path())
                .collect::<BTreeSet<_>>()
                .len(),
            referenced_media_keys: source.media.len(),
            unique_content_hashes: unique_hashes,
        },
    }
}

fn stage_cas_objects(
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
    staging: &Path,
) -> Result<(), String> {
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
    Ok(())
}

fn commit_cas(staging: &Path, final_root: &Path) -> Result<(), String> {
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

fn reuse_or_reject_existing(
    source: &ValidatedSource,
    output: &Path,
    final_version: &Path,
    context: &BuildContext,
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
) -> Result<BuildResult, String> {
    let result_path = final_version.join("build-result.json");
    let bytes = fs::read(&result_path).map_err(|error| {
        format!(
            "build version {} already exists without a readable build-result.json: {error}",
            context.build_version
        )
    })?;
    let raw: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("existing build-result.json is invalid: {error}"))?;
    schemas::validate_build_result(&raw)?;
    let result: BuildResult = serde_json::from_value(raw)
        .map_err(|error| format!("existing build-result.json is invalid: {error}"))?;
    if result.build_version != context.build_version
        || result.release != context.release
        || result.source_digest_sha256 != source.source_digest_sha256
        || result.builder_version != env!("CARGO_PKG_VERSION")
        || result.system_schema_version != SYSTEM_SCHEMA_VERSION
        || result.system_media_schema_version != SYSTEM_MEDIA_SCHEMA_VERSION
    {
        return Err(format!(
            "build version {} already exists with divergent content or context",
            context.build_version
        ));
    }
    ArtifactVerifier::new(
        source,
        context,
        contracts,
        final_version,
        &output.join("CAS/system"),
        &result,
    )
    .verify()?;
    Ok(result)
}

fn database_artifact(
    path: &Path,
    relative: String,
    fingerprint: String,
) -> Result<DatabaseArtifact, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read database artifact {}: {error}", path.display()))?;
    Ok(DatabaseArtifact {
        path: relative,
        size_bytes: u64::try_from(bytes.len()).map_err(|_| "database size overflow".to_string())?,
        checksum_sha256: sha256_hex(&bytes),
        schema_fingerprint_sha256: fingerprint,
    })
}

fn artifact_database_path(build_version: u64, locale: KnowledgeLocale, filename: &str) -> String {
    format!("versions/{build_version}/locales/{locale}/{filename}")
}

fn assert_shared_fingerprint(
    expected: &mut Option<String>,
    current: &str,
    kind: &str,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    if let Some(expected) = expected {
        if expected != current {
            return Err(format!(
                "{kind} schema fingerprint differs for locale {locale}"
            ));
        }
    } else {
        *expected = Some(current.to_string());
    }
    Ok(())
}

fn set_digest(values: &BTreeSet<String>) -> String {
    sha256_hex(
        values
            .iter()
            .flat_map(|value| [value.as_bytes(), b"\n"].concat())
            .collect::<Vec<_>>()
            .as_slice(),
    )
}

fn remove_stale_staging(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|error| {
            format!(
                "cannot remove stale staging directory {}: {error}",
                path.display()
            )
        })?;
    }
    Ok(())
}

fn recursive_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    fn visit(path: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
        let mut entries = fs::read_dir(path)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            if entry
                .file_type()
                .map_err(|error| error.to_string())?
                .is_dir()
            {
                visit(&path, files)?;
            } else {
                files.push(path);
            }
        }
        Ok(())
    }
    let mut files = Vec::new();
    visit(root, &mut files)?;
    files.sort();
    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cas_set_digest_is_order_independent() {
        assert_eq!(
            set_digest(&BTreeSet::from(["b".to_string(), "a".to_string()])),
            set_digest(&BTreeSet::from(["a".to_string(), "b".to_string()]))
        );
    }
}
