//! Defines the typed projection contract and delegates construction, validation,
//! row semantics, and domain projection to focused submodules.

mod build;
mod catalog;
mod helpers;
mod metrics;
mod model;
mod operations;
mod row_columns;
mod row_identity;
mod row_table;
mod taxonomy;
mod validation;

#[cfg(test)]
mod tests;

pub(crate) use model::{
    CasProjectionOperation, CompilationOperation, MetadataOperation, MetadataRow,
    ProjectionContract, ProjectionSourceFacts, SystemMediaProjectionOperation, SystemMediaRow,
    SystemProjectionOperation, SystemRow,
};

#[cfg(test)]
use self::validation::{
    validate_cas_operation, validate_compilation_operation, validate_metadata_operation,
    validate_system_media_operation, validate_system_operation,
};
use self::{
    catalog::project_catalog,
    helpers::*,
    taxonomy::{project_geo_places, project_taxonomies},
};
use crate::{
    contracts::{
        locale::KnowledgeLocale,
        taxonomy::{taxonomy_domains, taxonomy_spec, TaxonomyCardinality, CANONICAL_TAXONOMIES},
        version::BUILD_RESULT_SCHEMA_VERSION,
    },
    databases::DatabaseKind,
    ledger::{
        owned_obligations, search_candidates, CompilationOperationId, EntityIdentity,
        ObligationClass, ObligationOwnership, ProjectionObligation, ProjectionOperationId,
        ProjectionTarget, RowEvent, SystemColumn, SystemTable,
    },
    markdown::CompiledDocument,
    media::decode_hex,
    normalization::{normalize_identity_key, normalize_search_text},
    report::BuildContext,
    schemas,
    source::{CanonicalEntity, LocalizedContent, LocalizedValue, TaxonomyEntity},
    validation::{ValidatedEntity, ValidatedSource},
};
use std::collections::{BTreeMap, BTreeSet};
