//! Coordinates contract construction, persistence, verification, and atomic
//! publication through focused projection submodules.

mod build;
mod cas;
pub(crate) mod contract;
mod filesystem;
mod reporting;
mod reuse;
mod writers;

#[cfg(test)]
mod tests;

pub use build::build_artifacts;

use self::{
    cas::{commit_cas, stage_cas_objects},
    contract::ProjectionContract,
    filesystem::{recursive_files, remove_stale_staging},
    reporting::projection_report,
    reuse::{assert_shared_fingerprint, database_artifact, reuse_or_reject_existing, set_digest},
    writers::{write_metadata, write_system, write_system_media},
};
use crate::{
    artifact_verifier::ArtifactVerifier,
    contracts::{
        artifact::{
            locale_artifact, locale_directory, version_artifact, version_root, VersionArtifact,
            CAS_ALGORITHM, CAS_HASH_ENCODING, CAS_LAYOUT, CAS_PATH_PATTERN, CAS_ROOT,
            VERSIONS_DIRECTORY,
        },
        locale::{KnowledgeLocale, LOCALES},
        version::{
            BUILD_RESULT_SCHEMA_VERSION, PROJECTION_REPORT_SCHEMA_VERSION,
            SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION,
        },
    },
    databases::{self, DatabaseKind},
    ledger::{CompletedLedger, ProjectionLedger},
    media::{cas_relative_path, sha256_hex},
    report::{
        self, BuildContext, BuildResult, CasResult, DatabaseArtifact, LocaleArtifacts,
        LocaleProjection, MediaProjection, ProjectionReport, ProjectionResult, ProjectionSource,
        TypeProjection,
    },
    schemas,
    validation::ValidatedSource,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
};
