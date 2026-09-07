//! Verifies reusable builds and computes artifact metadata and shared digests.

use crate::{
    contracts::{
        artifact::{VersionArtifact, CAS_ROOT},
        locale::KnowledgeLocale,
        version::{
            BUILD_RESULT_SCHEMA_VERSION, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION,
        },
    },
    media::sha256_hex,
    projection::contract::LocaleProjectionPlan,
    report::{BuildContext, BuildResult, DatabaseArtifact},
    schemas,
    validation::ValidatedSource,
    verification::artifact::ArtifactVerifier,
    VerificationError,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::Path,
};

pub(super) fn reuse_or_reject_existing(
    source: &ValidatedSource,
    output: &Path,
    final_version: &Path,
    context: &BuildContext,
    plans: &BTreeMap<KnowledgeLocale, LocaleProjectionPlan>,
) -> Result<BuildResult, VerificationError> {
    let result_path = final_version.join(VersionArtifact::BuildResult.filename());
    let bytes = fs::read(&result_path).map_err(|source| VerificationError::Io {
        artifact: "build-result.json".to_string(),
        path: result_path.clone(),
        source,
    })?;
    let raw: serde_json::Value =
        serde_json::from_slice(&bytes).map_err(|source| VerificationError::Json {
            artifact: "build-result.json".to_string(),
            path: result_path.clone(),
            source,
        })?;
    schemas::validate_build_result(&raw)
        .map_err(|detail| VerificationError::invalid("build-result.json schema", detail))?;
    let result: BuildResult =
        serde_json::from_value(raw).map_err(|source| VerificationError::Json {
            artifact: "build-result.json".to_string(),
            path: result_path,
            source,
        })?;
    if result.build_version != context.build_version
        || result.release != context.release
        || result.source_digest_sha256 != source.source_digest_sha256
        || result.builder_version != env!("CARGO_PKG_VERSION")
        || result.schema_version != BUILD_RESULT_SCHEMA_VERSION
        || result.system_schema_version != SYSTEM_SCHEMA_VERSION
        || result.system_media_schema_version != SYSTEM_MEDIA_SCHEMA_VERSION
    {
        return Err(VerificationError::invalid(
            "build-result.json identity",
            format!(
                "build version {} has divergent content or context",
                context.build_version
            ),
        ));
    }
    ArtifactVerifier::new(
        source,
        context,
        plans,
        final_version,
        &output.join(CAS_ROOT),
        &result,
    )
    .verify()?;
    Ok(result)
}

pub(super) fn database_artifact(
    path: &Path,
    relative: String,
    fingerprint: String,
) -> Result<DatabaseArtifact, crate::DatabaseError> {
    let bytes = fs::read(path).map_err(|source| crate::DatabaseError::Io {
        path: path.to_path_buf(),
        operation: "read artifact metadata",
        source,
    })?;
    Ok(DatabaseArtifact {
        path: relative,
        size_bytes: u64::try_from(bytes.len()).map_err(|_| {
            crate::DatabaseError::invariant(path, "measure artifact", "database size overflow")
        })?,
        checksum_sha256: sha256_hex(&bytes),
        schema_fingerprint_sha256: fingerprint,
    })
}

pub(super) fn assert_shared_fingerprint(
    expected: &mut Option<String>,
    current: &str,
    kind: &str,
    locale: KnowledgeLocale,
) -> Result<(), crate::DatabaseError> {
    if let Some(expected) = expected {
        if expected != current {
            return Err(crate::DatabaseError::invariant(
                kind,
                "compare locale fingerprints",
                format!("schema fingerprint differs for locale {locale}"),
            ));
        }
    } else {
        *expected = Some(current.to_string());
    }
    Ok(())
}

pub(super) fn set_digest(values: &BTreeSet<String>) -> String {
    sha256_hex(
        values
            .iter()
            .flat_map(|value| [value.as_bytes(), b"\n"].concat())
            .collect::<Vec<_>>()
            .as_slice(),
    )
}
