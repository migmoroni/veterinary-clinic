//! Defines the closed receipt contract emitted only after concrete effect confirmation.

use crate::projection::coverage::{
    CompilationOperationId, ProjectionObligation, ProjectionOperationId, RowEvent,
};
use std::collections::BTreeSet;

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectionEvent {
    SqliteRow(RowEvent),
    Compilation(CompilationOperationId),
    CasObject { content_hash: String },
}

#[derive(Clone, Debug)]
pub(crate) struct PendingReceipt {
    operation: ProjectionOperationId,
    obligations: BTreeSet<ProjectionObligation>,
    event: ProjectionEvent,
    observed_count: usize,
}

impl PendingReceipt {
    pub(super) fn new(
        operation: ProjectionOperationId,
        obligations: BTreeSet<ProjectionObligation>,
        event: ProjectionEvent,
        observed_count: usize,
    ) -> Result<Self, String> {
        if obligations.is_empty() {
            return Err(format!(
                "pending operation has no obligations: {operation:?}"
            ));
        }
        if observed_count != 1 {
            return Err(format!(
                "projection operation {operation:?} observed {observed_count} effects instead of 1"
            ));
        }
        Ok(Self {
            operation,
            obligations,
            event,
            observed_count,
        })
    }

    pub(super) fn confirm(self) -> ConfirmedReceipt {
        ConfirmedReceipt {
            operation: self.operation,
            obligations: self.obligations,
            event: self.event,
            observed_count: self.observed_count,
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct ConfirmedReceipt {
    pub operation: ProjectionOperationId,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: ProjectionEvent,
    pub observed_count: usize,
}

#[derive(Clone, Debug)]
pub(crate) struct ConfirmedReceiptBatch(Vec<ConfirmedReceipt>);

impl ConfirmedReceiptBatch {
    pub(super) fn confirm(pending: Vec<PendingReceipt>) -> Result<Self, String> {
        if pending.is_empty() {
            return Err("a confirmed receipt batch cannot be empty".to_string());
        }
        Ok(Self(
            pending.into_iter().map(PendingReceipt::confirm).collect(),
        ))
    }

    pub(crate) fn iter(&self) -> impl Iterator<Item = &ConfirmedReceipt> {
        self.0.iter()
    }
}

#[cfg(test)]
impl ConfirmedReceiptBatch {
    pub(crate) fn from_test_receipts(receipts: Vec<ConfirmedReceipt>) -> Result<Self, String> {
        if receipts.is_empty() {
            return Err("a confirmed receipt batch cannot be empty".to_string());
        }
        Ok(Self(receipts))
    }
}
