//! Defines public artifact names, CAS descriptors, and canonical relative path constructors.

use super::{database::DatabaseIdentity, locale::KnowledgeLocale};
use std::path::PathBuf;

pub(crate) const BUILD_RESULT_FILENAME: &str = "build-result.json";
pub(crate) const PROJECTION_REPORT_FILENAME: &str = "projection-report.json";
pub(crate) const CHECKSUMS_FILENAME: &str = "checksums.sha256";
pub(crate) const VERSIONS_DIRECTORY: &str = "versions";
pub(crate) const LOCALES_DIRECTORY: &str = "locales";
pub(crate) const CAS_ROOT: &str = "CAS/system";
pub(crate) const CAS_ALGORITHM: &str = "sha256";
pub(crate) const CAS_HASH_ENCODING: &str = "lowercase_hex";
pub(crate) const CAS_LAYOUT: &str = "sha256_hex_2_2_bin";
pub(crate) const CAS_PATH_PATTERN: &str = "{hash[0..2]}/{hash[2..4]}/{hash}.bin";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum VersionArtifact {
    BuildResult,
    ProjectionReport,
    Checksums,
}

impl VersionArtifact {
    pub(crate) const fn filename(self) -> &'static str {
        match self {
            Self::BuildResult => BUILD_RESULT_FILENAME,
            Self::ProjectionReport => PROJECTION_REPORT_FILENAME,
            Self::Checksums => CHECKSUMS_FILENAME,
        }
    }
}

pub(crate) fn version_root(build_version: u64) -> PathBuf {
    PathBuf::from(VERSIONS_DIRECTORY).join(build_version.to_string())
}

pub(crate) fn version_artifact(build_version: u64, artifact: VersionArtifact) -> PathBuf {
    version_root(build_version).join(artifact.filename())
}

pub(crate) fn locale_directory(locale: KnowledgeLocale) -> PathBuf {
    PathBuf::from(LOCALES_DIRECTORY).join(locale.as_str())
}

pub(crate) fn locale_artifact(
    build_version: u64,
    locale: KnowledgeLocale,
    database: DatabaseIdentity,
) -> PathBuf {
    version_root(build_version)
        .join(locale_directory(locale))
        .join(database.artifact_filename)
}
