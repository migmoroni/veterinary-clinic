//! Orchestrates locale contract execution, staging, verification, and atomic publication.

use super::{
    assert_shared_fingerprint, confirm_compilation, database_artifact, expected_obligations,
    projection_report, remove_stale_staging, reuse_or_reject_existing, set_digest,
    stage_cas_objects, write_system, write_system_media, ProjectionContract, ProjectionLedger,
};
use crate::{
    contracts::{
        artifact::{
            locale_artifact, locale_directory, version_artifact, version_root, VersionArtifact,
            CAS_ALGORITHM, CAS_HASH_ENCODING, CAS_LAYOUT, CAS_PATH_PATTERN, CAS_ROOT,
            VERSIONS_DIRECTORY,
        },
        locale::{KnowledgeLocale, LOCALES},
        version::{
            BUILD_RESULT_SCHEMA_VERSION, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION,
        },
    },
    databases::{self, DatabaseKind},
    media::{cas_relative_path, sha256_hex},
    projection::{contract::LocaleProjectionPlan, execution::commit_cas},
    report::{self, BuildContext, BuildResult, CasResult, LocaleArtifacts, ProjectionResult},
    schemas,
    validation::ValidatedSource,
    verification::artifact::ArtifactVerifier,
    CasError, ContractError, KnowledgeBuilderError, PublicationError,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

pub fn build_artifacts(
    source: &ValidatedSource,
    output: &Path,
    context: &BuildContext,
) -> Result<BuildResult, KnowledgeBuilderError> {
    fs::create_dir_all(output).map_err(|source| PublicationError::Io {
        path: output.to_path_buf(),
        operation: "create output directory",
        source,
    })?;
    let versions_root = output.join(VERSIONS_DIRECTORY);
    fs::create_dir_all(&versions_root).map_err(|source| PublicationError::Io {
        path: versions_root.clone(),
        operation: "create versions directory",
        source,
    })?;
    let final_version = output.join(version_root(context.build_version));
    let plans = build_plans(source, context)?;
    if final_version.exists() {
        return reuse_or_reject_existing(source, output, &final_version, context, &plans)
            .map_err(Into::into);
    }

    let staging_version = versions_root.join(format!(".{}.staging", context.build_version));
    let staging_cas = output.join(format!(".cas-{}.staging", context.build_version));
    remove_stale_staging(&staging_version)?;
    remove_stale_staging(&staging_cas)?;
    fs::create_dir_all(&staging_version).map_err(|source| PublicationError::Io {
        path: staging_version.clone(),
        operation: "create version staging directory",
        source,
    })?;
    fs::create_dir_all(&staging_cas).map_err(|source| PublicationError::Io {
        path: staging_cas.clone(),
        operation: "create CAS staging directory",
        source,
    })?;

    let result = build_in_staging(source, &plans, &staging_version, &staging_cas, context);
    match result {
        Ok(result) => {
            commit_cas(&staging_cas, &output.join(CAS_ROOT))?;
            if staging_cas.exists() {
                fs::remove_dir_all(&staging_cas).map_err(|source| PublicationError::Io {
                    path: staging_cas.clone(),
                    operation: "remove CAS staging directory",
                    source,
                })?;
            }
            fs::rename(&staging_version, &final_version).map_err(|source| {
                PublicationError::Io {
                    path: final_version.clone(),
                    operation: "atomically finalize version",
                    source,
                }
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

fn build_plans(
    source: &ValidatedSource,
    context: &BuildContext,
) -> Result<BTreeMap<KnowledgeLocale, LocaleProjectionPlan>, ContractError> {
    LOCALES
        .into_iter()
        .map(|locale| {
            let expected = expected_obligations(source, locale, context.release.is_some())?;
            let contract = ProjectionContract::build(source, locale, context)?;
            LocaleProjectionPlan::new(expected, contract).map(|plan| (locale, plan))
        })
        .collect()
}

fn build_in_staging(
    source: &ValidatedSource,
    plans: &BTreeMap<KnowledgeLocale, LocaleProjectionPlan>,
    staging_version: &Path,
    staging_cas: &Path,
    context: &BuildContext,
) -> Result<BuildResult, KnowledgeBuilderError> {
    let mut locale_artifacts = BTreeMap::new();
    let mut completed_ledgers = BTreeMap::new();
    let mut checksum_entries = BTreeMap::new();
    let mut system_fingerprint = None;
    let mut media_fingerprint = None;
    let mut all_cas_hashes = BTreeSet::new();

    for locale in LOCALES {
        let plan = plans.get(&locale).unwrap();
        let contract = &plan.contract;
        let mut ledger =
            ProjectionLedger::new(locale, plan.expected.clone(), contract.ownership()?)?;
        if let Some(receipts) = confirm_compilation(source, locale, &contract.compilation)? {
            ledger.observe(receipts)?;
        }

        let locale_directory = staging_version.join(locale_directory(locale));
        fs::create_dir_all(&locale_directory).map_err(|source| PublicationError::Io {
            path: locale_directory.clone(),
            operation: "create locale staging directory",
            source,
        })?;
        let system_path = locale_directory.join(DatabaseKind::System.identity().artifact_filename);
        let system_media_path =
            locale_directory.join(DatabaseKind::SystemMedia.identity().artifact_filename);

        let mut system = databases::create(&system_path, DatabaseKind::System)?;
        let system_receipts = write_system(&mut system, &contract.metadata, &contract.system)?;
        ledger.observe(system_receipts)?;
        let current_system_fingerprint = databases::finalize(system, &system_path)?;
        assert_shared_fingerprint(
            &mut system_fingerprint,
            &current_system_fingerprint,
            "system",
            locale,
        )?;

        let mut system_media = databases::create(&system_media_path, DatabaseKind::SystemMedia)?;
        let media_receipts = write_system_media(
            &mut system_media,
            &contract.metadata,
            &contract.system_media,
        )?;
        ledger.observe(media_receipts)?;
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
        let system_relative = report::normalized_relative_path(&locale_artifact(
            context.build_version,
            locale,
            *DatabaseKind::System.identity(),
        ))?;
        let media_relative = report::normalized_relative_path(&locale_artifact(
            context.build_version,
            locale,
            *DatabaseKind::SystemMedia.identity(),
        ))?;
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

    let mut cas_receipts = stage_cas_objects(plans, staging_cas)?;
    let mut finished_ledgers = BTreeMap::new();
    for (locale, mut ledger) in completed_ledgers {
        if let Some(receipts) = cas_receipts.remove(&locale) {
            ledger.observe(receipts)?;
        }
        finished_ledgers.insert(locale, ledger.finish()?);
    }
    for hash in &all_cas_hashes {
        let relative = format!(
            "{CAS_ROOT}/{}",
            report::normalized_relative_path(
                &cas_relative_path(hash).map_err(|detail| CasError::invalid(
                    hash,
                    "resolve object path",
                    detail
                ))?
            )
            .map_err(|source| CasError::Contract {
                artifact: hash.into(),
                operation: "normalize object path",
                source: Box::new(source),
            })?
        );
        checksum_entries.insert(relative, hash.clone());
    }

    let projection_report = projection_report(source, context, plans, &finished_ledgers);
    schemas::validate_projection_report(&projection_report)
        .map_err(|detail| ContractError::invariant("projection report schema", detail))?;
    let projection_path = staging_version.join(VersionArtifact::ProjectionReport.filename());
    let projection_bytes = report::write_json(&projection_path, &projection_report)?;
    let projection_checksum = sha256_hex(&projection_bytes);
    let projection_relative = report::normalized_relative_path(&version_artifact(
        context.build_version,
        VersionArtifact::ProjectionReport,
    ))?;
    checksum_entries.insert(projection_relative.clone(), projection_checksum.clone());

    let checksum_path = staging_version.join(VersionArtifact::Checksums.filename());
    let checksum_contents = checksum_entries
        .iter()
        .map(|(path, checksum)| format!("{checksum}  {path}\n"))
        .collect::<String>();
    fs::write(&checksum_path, checksum_contents.as_bytes()).map_err(|source| {
        PublicationError::Io {
            path: checksum_path.clone(),
            operation: "write checksum manifest",
            source,
        }
    })?;

    let result = BuildResult {
        schema_version: BUILD_RESULT_SCHEMA_VERSION,
        builder_version: env!("CARGO_PKG_VERSION").to_string(),
        build_version: context.build_version,
        release: context.release.clone(),
        source_digest_sha256: source.source_digest_sha256.clone(),
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
        locales: locale_artifacts,
        cas: CasResult {
            algorithm: CAS_ALGORITHM.to_string(),
            hash_encoding: CAS_HASH_ENCODING.to_string(),
            root: CAS_ROOT.to_string(),
            layout: CAS_LAYOUT.to_string(),
            path_pattern: CAS_PATH_PATTERN.to_string(),
            object_count: all_cas_hashes.len(),
            set_digest_sha256: set_digest(&all_cas_hashes),
        },
        projection: ProjectionResult {
            report_path: projection_relative,
            checksum_sha256: projection_checksum,
        },
        checksum_file: report::normalized_relative_path(&version_artifact(
            context.build_version,
            VersionArtifact::Checksums,
        ))?,
    };
    schemas::validate_build_result(&result)
        .map_err(|detail| ContractError::invariant("build result schema", detail))?;
    report::write_json(
        &staging_version.join(VersionArtifact::BuildResult.filename()),
        &result,
    )?;
    ArtifactVerifier::new(
        source,
        context,
        plans,
        staging_version,
        staging_cas,
        &result,
    )
    .verify()?;
    Ok(result)
}
