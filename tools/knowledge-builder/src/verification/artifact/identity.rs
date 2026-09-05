//! Verifies build context identity and resolves canonical public descriptors.

use super::VerificationContext;
use crate::{
    contracts::{
        artifact::{
            version_artifact, version_root, VersionArtifact, CAS_ALGORITHM, CAS_HASH_ENCODING,
            CAS_LAYOUT, CAS_PATH_PATTERN, CAS_ROOT, VERSIONS_DIRECTORY,
        },
        version::{
            BUILD_RESULT_SCHEMA_VERSION, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION,
        },
    },
    report, schemas,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug)]
pub(super) struct VerifiedIdentity {
    pub(super) projection_path: PathBuf,
    pub(super) checksum_path: PathBuf,
}

pub(super) fn verify(context: &VerificationContext<'_>) -> Result<VerifiedIdentity, String> {
    schemas::validate_build_result(context.result)?;
    let expected_projection = report::normalized_relative_path(&version_artifact(
        context.context.build_version,
        VersionArtifact::ProjectionReport,
    ))?;
    let expected_checksums = report::normalized_relative_path(&version_artifact(
        context.context.build_version,
        VersionArtifact::Checksums,
    ))?;
    if context.result.schema_version != BUILD_RESULT_SCHEMA_VERSION
        || context.result.build_version != context.context.build_version
        || context.result.release != context.context.release
        || context.result.source_digest_sha256 != context.source.source_digest_sha256
        || context.result.builder_version != env!("CARGO_PKG_VERSION")
        || context.result.system_schema_version != SYSTEM_SCHEMA_VERSION
        || context.result.system_media_schema_version != SYSTEM_MEDIA_SCHEMA_VERSION
        || context.result.projection.report_path != expected_projection
        || context.result.checksum_file != expected_checksums
        || context.result.cas.algorithm != CAS_ALGORITHM
        || context.result.cas.hash_encoding != CAS_HASH_ENCODING
        || context.result.cas.root != CAS_ROOT
        || context.result.cas.layout != CAS_LAYOUT
        || context.result.cas.path_pattern != CAS_PATH_PATTERN
    {
        return Err("artifact identity differs from source or build context".to_string());
    }

    let result_path = context
        .version_root
        .join(VersionArtifact::BuildResult.filename());
    let raw: serde_json::Value = serde_json::from_slice(
        &fs::read(&result_path)
            .map_err(|error| format!("cannot read {}: {error}", result_path.display()))?,
    )
    .map_err(|error| format!("build-result.json is invalid JSON: {error}"))?;
    schemas::validate_build_result(&raw)?;
    let expected = serde_json::to_value(context.result)
        .map_err(|error| format!("cannot compare build result: {error}"))?;
    if raw != expected {
        return Err("build-result.json differs from the verified manifest".to_string());
    }

    Ok(VerifiedIdentity {
        projection_path: resolve_version_path(context, &expected_projection)?,
        checksum_path: resolve_version_path(context, &expected_checksums)?,
    })
}

pub(super) fn resolve_version_path(
    context: &VerificationContext<'_>,
    declared: &str,
) -> Result<PathBuf, String> {
    let suffix = canonical_version_suffix(context.context.build_version, declared)?;
    Ok(context.version_root.join(suffix))
}

fn canonical_version_suffix(build_version: u64, declared: &str) -> Result<&str, String> {
    let prefix = format!(
        "{}/",
        report::normalized_relative_path(&version_root(build_version))?
    );
    let suffix = declared
        .strip_prefix(&prefix)
        .ok_or_else(|| format!("artifact path is outside version: {declared}"))?;
    if report::normalized_relative_path(Path::new(suffix))? != suffix {
        return Err(format!("artifact path is not canonical: {declared}"));
    }
    Ok(suffix)
}

pub(super) fn resolve_declared_path(
    context: &VerificationContext<'_>,
    declared: &str,
) -> Result<PathBuf, String> {
    if declared.starts_with(&format!("{VERSIONS_DIRECTORY}/")) {
        resolve_version_path(context, declared)
    } else if let Some(suffix) = declared.strip_prefix(&format!("{CAS_ROOT}/")) {
        if report::normalized_relative_path(Path::new(suffix))? != suffix {
            return Err(format!("CAS path is not canonical: {declared}"));
        }
        Ok(context.cas_root.join(suffix))
    } else {
        Err(format!("unexpected artifact path: {declared}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_paths_are_bound_to_identity_and_canonical_form() {
        assert_eq!(
            canonical_version_suffix(7, "versions/7/locales/pt-BR/system.db").unwrap(),
            "locales/pt-BR/system.db"
        );
        assert!(canonical_version_suffix(7, "versions/8/system.db").is_err());
        assert!(canonical_version_suffix(7, "versions/7/../system.db").is_err());
    }
}
