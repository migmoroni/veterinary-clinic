//! Owns the closed vocabulary shared by inventory, contracts, execution, and ledger proofs.

mod model;

pub(crate) use model::{
    CompilationOperationId, EntityIdentity, ObligationClass, ProjectionObligation,
    ProjectionOperationId, ProjectionTarget, RowEvent, RowIdentity, SourceToken, SystemColumn,
    SystemTable,
};
