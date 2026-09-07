//! Defines the typed row payloads and operation containers used by projection contracts.

use super::SystemRow;
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    projection::coverage::{CompilationOperationId, ProjectionObligation, RowEvent},
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub(crate) struct ProjectionContract {
    pub locale: KnowledgeLocale,
    pub compilation: Vec<CompilationOperation>,
    pub metadata: Vec<MetadataOperation>,
    pub system: Vec<SystemProjectionOperation>,
    pub system_media: Vec<SystemMediaProjectionOperation>,
    pub cas: Vec<CasProjectionOperation>,
    pub source_facts: ProjectionSourceFacts,
}

#[derive(Clone, Debug)]
pub(crate) struct LocaleProjectionPlan {
    pub(crate) expected: BTreeSet<ProjectionObligation>,
    pub(crate) contract: ProjectionContract,
}

impl LocaleProjectionPlan {
    pub(crate) fn new(
        expected: BTreeSet<ProjectionObligation>,
        contract: ProjectionContract,
    ) -> Result<Self, crate::ContractError> {
        let owned = contract
            .ownership()?
            .into_values()
            .flatten()
            .collect::<BTreeSet<_>>();
        if expected != owned {
            return Err(crate::ContractError::invariant(
                "expected and owned coverage",
                coverage_difference(&expected, &owned),
            ));
        }
        Ok(Self { expected, contract })
    }
}

fn coverage_difference(
    expected: &BTreeSet<ProjectionObligation>,
    owned: &BTreeSet<ProjectionObligation>,
) -> String {
    format!(
        "{} missing and {} unexpected obligations",
        expected.difference(owned).count(),
        owned.difference(expected).count()
    )
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ProjectionSourceFacts {
    pub entities_by_type: BTreeMap<String, usize>,
    pub relation_count: usize,
    pub localized_fragments: usize,
    pub source_files: usize,
}

#[derive(Clone, Debug)]
pub(crate) struct CompilationOperation {
    pub identity: CompilationOperationId,
    pub obligations: BTreeSet<ProjectionObligation>,
}

#[derive(Clone, Debug)]
pub(crate) struct MetadataOperation {
    pub database: DatabaseKind,
    pub row: MetadataRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum MetadataRow {
    Build {
        build_version: u64,
        builder_version: String,
        build_result_schema_version: u32,
        source_digest: Vec<u8>,
        locale: String,
    },
    Release {
        release_id: String,
        generation: u64,
        revision: u64,
        locale: String,
    },
}

#[derive(Clone, Debug)]
pub(crate) struct SystemProjectionOperation {
    pub row: SystemRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug)]
pub(crate) struct SystemMediaProjectionOperation {
    pub row: SystemMediaRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct SystemMediaRow {
    pub media_key: String,
    pub content_hash: Vec<u8>,
    pub thumbnail: Vec<u8>,
    pub thumbnail_mime_type: String,
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Debug)]
pub(crate) struct CasProjectionOperation {
    pub content_hash: String,
    pub bytes: Vec<u8>,
    pub obligations: BTreeSet<ProjectionObligation>,
}
