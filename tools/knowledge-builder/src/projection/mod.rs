//! Coordinates contract construction, persistence, verification, and atomic
//! publication through focused projection submodules.

mod build;
pub(crate) mod contract;
pub(crate) mod coverage;
mod execution;
mod filesystem;
mod inventory;
pub(crate) mod ledger;
mod reporting;
mod reuse;

#[cfg(test)]
pub(crate) use execution::writers::write_system_row;

#[cfg(test)]
mod tests;

pub use build::build_artifacts;

use self::{
    contract::ProjectionContract,
    execution::{
        commit_cas, confirm_compilation, stage_cas_objects, write_system, write_system_media,
    },
    filesystem::remove_stale_staging,
    inventory::expected_obligations,
    ledger::{CompletedLedger, ProjectionLedger},
    reporting::projection_report,
    reuse::{assert_shared_fingerprint, database_artifact, reuse_or_reject_existing, set_digest},
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
            BUILD_RESULT_SCHEMA_VERSION, PROJECTION_REPORT_SCHEMA_VERSION,
            SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION,
        },
    },
    databases::{self, DatabaseKind},
    media::{cas_relative_path, sha256_hex},
    report::{
        self, BuildContext, BuildResult, CasResult, DatabaseArtifact, LocaleArtifacts,
        LocaleProjection, MediaProjection, ProjectionReport, ProjectionResult, ProjectionSource,
        TypeProjection,
    },
    schemas,
    validation::ValidatedSource,
    verification::artifact::ArtifactVerifier,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
};
