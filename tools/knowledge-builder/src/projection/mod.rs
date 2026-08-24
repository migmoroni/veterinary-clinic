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
    reuse::{
        artifact_database_path, assert_shared_fingerprint, database_artifact,
        reuse_or_reject_existing, set_digest,
    },
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
