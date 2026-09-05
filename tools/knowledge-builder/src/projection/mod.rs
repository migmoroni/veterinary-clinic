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
    execution::{confirm_compilation, stage_cas_objects, write_system, write_system_media},
    filesystem::remove_stale_staging,
    inventory::expected_obligations,
    ledger::ProjectionLedger,
    reporting::projection_report,
    reuse::{assert_shared_fingerprint, database_artifact, reuse_or_reject_existing, set_digest},
};
#[cfg(test)]
use std::collections::BTreeSet;
