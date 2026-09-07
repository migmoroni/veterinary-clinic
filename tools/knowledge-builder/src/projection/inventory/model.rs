//! Stores the independent expected inventory and enforces unique insertion.

use super::{ObligationClass, ProjectionTarget, SourceToken, SystemColumn};
use crate::projection::coverage::ProjectionObligation;
use std::collections::BTreeSet;

#[derive(Clone, Debug)]
pub(super) struct OperationDisposition {
    pub(super) target: ProjectionTarget,
}

impl OperationDisposition {
    pub(super) fn column(&self, column: SystemColumn) -> Self {
        let ProjectionTarget::TableRow {
            database,
            table,
            row,
        } = &self.target
        else {
            panic!("only a SQLite row disposition can select a column");
        };
        Self {
            target: ProjectionTarget::TableColumn {
                database: *database,
                table: *table,
                row: row.clone(),
                column,
            },
        }
    }
}

#[derive(Clone, Debug, Default)]
pub(super) struct ExpectedInventory {
    expected: BTreeSet<ProjectionObligation>,
}

impl ExpectedInventory {
    pub(super) fn insert(
        &mut self,
        disposition: OperationDisposition,
        source: SourceToken,
        class: ObligationClass,
    ) -> Result<(), crate::ContractError> {
        let obligation = ProjectionObligation {
            source,
            target: disposition.target,
            class,
        };
        if !self.expected.insert(obligation.clone()) {
            return Err(crate::ContractError::invariant(
                "expected inventory",
                format!("projection obligation is declared more than once: {obligation}"),
            ));
        }
        Ok(())
    }

    pub(super) fn finish(self) -> BTreeSet<ProjectionObligation> {
        self.expected
    }
}
