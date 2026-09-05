//! Defines the typed projection contract and delegates construction, validation,
//! row semantics, and domain projection to focused submodules.

mod build;
mod catalog;
mod helpers;
mod metrics;
mod model;
mod operations;
mod ownership;
mod rows;
mod taxonomy;
mod validation;

#[cfg(test)]
mod tests;

pub(crate) use model::{
    CasProjectionOperation, CompilationOperation, MetadataOperation, MetadataRow,
    ProjectionContract, ProjectionSourceFacts, SystemMediaProjectionOperation, SystemMediaRow,
    SystemProjectionOperation,
};
pub(crate) use rows::{SystemRow, SystemRowCase, SystemRowDescriptor};

#[cfg(test)]
pub(crate) use rows::representative_row;

#[cfg(test)]
use self::validation::{
    validate_cas_operation, validate_compilation_operation, validate_metadata_operation,
    validate_system_media_operation, validate_system_operation,
};
