use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::Path};

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct BuildContext {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "buildVersion")]
    pub build_version: u64,
    pub release: Option<ReleaseContext>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ReleaseContext {
    #[serde(rename = "releaseId")]
    pub release_id: String,
    pub generation: u64,
    pub revision: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct DatabaseArtifact {
    pub path: String,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
    #[serde(rename = "checksumSha256")]
    pub checksum_sha256: String,
    #[serde(rename = "schemaFingerprintSha256")]
    pub schema_fingerprint_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct LocaleArtifacts {
    pub system: DatabaseArtifact,
    #[serde(rename = "systemMedia")]
    pub system_media: DatabaseArtifact,
    #[serde(rename = "casSetDigestSha256")]
    pub cas_set_digest_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct CasResult {
    pub algorithm: String,
    #[serde(rename = "hashEncoding")]
    pub hash_encoding: String,
    pub root: String,
    pub layout: String,
    #[serde(rename = "pathPattern")]
    pub path_pattern: String,
    #[serde(rename = "objectCount")]
    pub object_count: usize,
    #[serde(rename = "setDigestSha256")]
    pub set_digest_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectionResult {
    #[serde(rename = "reportPath")]
    pub report_path: String,
    #[serde(rename = "checksumSha256")]
    pub checksum_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct BuildResult {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "builderVersion")]
    pub builder_version: String,
    #[serde(rename = "buildVersion")]
    pub build_version: u64,
    pub release: Option<ReleaseContext>,
    #[serde(rename = "sourceDigestSha256")]
    pub source_digest_sha256: String,
    #[serde(rename = "systemSchemaVersion")]
    pub system_schema_version: u32,
    #[serde(rename = "systemMediaSchemaVersion")]
    pub system_media_schema_version: u32,
    pub locales: BTreeMap<String, LocaleArtifacts>,
    pub cas: CasResult,
    pub projection: ProjectionResult,
    #[serde(rename = "checksumFile")]
    pub checksum_file: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectionReport {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "sourceDigestSha256")]
    pub source_digest_sha256: String,
    #[serde(rename = "buildVersion")]
    pub build_version: u64,
    #[serde(rename = "systemSchemaVersion")]
    pub system_schema_version: u32,
    #[serde(rename = "systemMediaSchemaVersion")]
    pub system_media_schema_version: u32,
    pub source: ProjectionSource,
    pub locales: BTreeMap<String, LocaleProjection>,
    pub media: MediaProjection,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ProjectionSource {
    #[serde(rename = "entitiesByType")]
    pub entities_by_type: BTreeMap<String, usize>,
    #[serde(rename = "relationCount")]
    pub relation_count: usize,
    #[serde(rename = "localizedFragmentsByLocale")]
    pub localized_fragments_by_locale: BTreeMap<String, usize>,
    #[serde(rename = "sourceFiles")]
    pub source_files: usize,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct LocaleProjection {
    #[serde(rename = "projectedByType")]
    pub projected_by_type: BTreeMap<String, TypeProjection>,
    #[serde(rename = "rowsByDatabase")]
    pub rows_by_database: BTreeMap<String, BTreeMap<String, usize>>,
    #[serde(rename = "expectedObligationCount")]
    pub expected_obligation_count: usize,
    #[serde(rename = "completedObligationCount")]
    pub completed_obligation_count: usize,
    #[serde(rename = "rowEventCount")]
    pub row_event_count: usize,
    #[serde(rename = "resolvedRelationCount")]
    pub resolved_relation_count: usize,
    #[serde(rename = "consumedLocalizedFragments")]
    pub consumed_localized_fragments: usize,
    #[serde(rename = "evidenceDigestSha256")]
    pub evidence_digest_sha256: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TypeProjection {
    pub entities: usize,
    #[serde(rename = "rowsByTable")]
    pub rows_by_table: BTreeMap<String, usize>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct MediaProjection {
    #[serde(rename = "sourceFiles")]
    pub source_files: usize,
    #[serde(rename = "referencedMediaKeys")]
    pub referenced_media_keys: usize,
    #[serde(rename = "uniqueContentHashes")]
    pub unique_content_hashes: usize,
}

pub fn read_context(path: &Path) -> Result<BuildContext, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read build context {}: {error}", path.display()))?;
    let context: BuildContext = serde_json::from_slice(&bytes)
        .map_err(|error| format!("invalid build context {}: {error}", path.display()))?;
    if context.schema_version != 1 {
        return Err("build context schemaVersion must be 1".to_string());
    }
    if context.build_version == 0 {
        return Err("buildVersion must be a positive integer".to_string());
    }
    if let Some(release) = &context.release {
        if !is_uuid(release.release_id.as_str()) {
            return Err("releaseId must be a lowercase UUID".to_string());
        }
        if release.generation == 0 || release.revision == 0 {
            return Err("release generation and revision must be positive".to_string());
        }
    }
    Ok(context)
}

pub fn canonical_json<T: Serialize>(value: &T) -> Result<Vec<u8>, String> {
    let mut bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("cannot serialize deterministic JSON: {error}"))?;
    bytes.push(b'\n');
    Ok(bytes)
}

pub fn write_json(path: &Path, value: &impl Serialize) -> Result<Vec<u8>, String> {
    let bytes = canonical_json(value)?;
    fs::write(path, &bytes)
        .map_err(|error| format!("cannot write report {}: {error}", path.display()))?;
    Ok(bytes)
}

pub fn normalized_relative_path(path: &Path) -> Result<String, String> {
    let mut result = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(value) => result.push(
                value
                    .to_str()
                    .ok_or_else(|| "artifact path is not UTF-8".to_string())?,
            ),
            _ => return Err("artifact path must be normalized and relative".to_string()),
        }
    }
    if result.is_empty() {
        return Err("artifact path must not be empty".to_string());
    }
    Ok(result.join("/"))
}

fn is_uuid(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes.iter().enumerate().all(|(index, byte)| {
            [8, 13, 18, 23].contains(&index) || matches!(*byte, b'0'..=b'9' | b'a'..=b'f')
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_positive_build_version() {
        let context = serde_json::from_str::<BuildContext>(
            r#"{"schemaVersion":1,"buildVersion":0,"release":null}"#,
        )
        .unwrap();
        assert_eq!(context.build_version, 0);
    }
}
