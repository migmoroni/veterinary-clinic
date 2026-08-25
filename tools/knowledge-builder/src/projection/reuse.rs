//! Verifies reusable builds and computes artifact metadata and shared digests.

use super::*;

pub(super) fn reuse_or_reject_existing(
    source: &ValidatedSource,
    output: &Path,
    final_version: &Path,
    context: &BuildContext,
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
) -> Result<BuildResult, String> {
    let result_path = final_version.join(VersionArtifact::BuildResult.filename());
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
        || result.schema_version != BUILD_RESULT_SCHEMA_VERSION
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

pub(super) fn assert_shared_fingerprint(
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

pub(super) fn set_digest(values: &BTreeSet<String>) -> String {
    sha256_hex(
        values
            .iter()
            .flat_map(|value| [value.as_bytes(), b"\n"].concat())
            .collect::<Vec<_>>()
            .as_slice(),
    )
}
