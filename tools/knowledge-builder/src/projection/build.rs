//! Orchestrates locale contract execution, staging, verification, and atomic publication.

use super::*;

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
