//! Tracks source-to-projection obligations, explicit operation ownership,
//! transactional completion journals, row events, and canonical evidence.

mod entity_obligations;
mod evidence;
mod journal;
mod model;
mod obligation_helpers;
mod ownership;
mod search;

#[cfg(test)]
mod tests;

pub(crate) use evidence::evidence_digest;
pub(crate) use journal::{CompletedLedger, ProjectionLedger};
pub(crate) use model::{
    CompilationOperationId, EntityIdentity, ObligationClass, ProjectionObligation,
    ProjectionOperationId, ProjectionTarget, RowEvent, SourceToken, SystemColumn, SystemTable,
};
pub(crate) use ownership::{owned_obligations, ObligationOwnership};
pub(crate) use search::search_candidates;

#[cfg(test)]
use obligation_helpers::{operation_disposition, table_row};
