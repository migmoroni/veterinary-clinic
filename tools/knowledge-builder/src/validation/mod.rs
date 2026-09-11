//! Validates canonical knowledge through focused structural, semantic,
//! localized, filesystem, media, and digesting stages.

mod aliases;
mod digest;
mod entity_shape;
mod filesystem;
mod life;
mod localized;
mod model;
mod pipeline;
mod primitives;
mod references;
mod standards;
mod taxonomy;

#[cfg(test)]
mod tests;

pub use model::{Diagnostic, ValidatedSource, ValidationError};
pub(crate) use model::{
    IndexedTaxonomyTerm, TaxonomyTermIndexes, ValidatedEntity, ValidatedMediaReference,
};
pub use pipeline::validate_source;

use self::{
    aliases::validate_alias_ownership,
    digest::{localized_fragment_counts, logical_digest, relation_count},
    entity_shape::validate_entity_shape,
    filesystem::{
        discover_files, exact_content_files, resolve_content_directory, validate_file_coverage,
    },
    localized::{validate_localized_content, validate_localized_schema},
    primitives::{is_simple_text, is_uuid_v4, validate_unique_texts},
    references::validate_references,
    standards::{
        canonical_path as section_standards_path, load_section_standards, resolve_sections,
        validate_consumers as validate_section_standard_consumers,
    },
    taxonomy::{collect_taxonomies, validate_taxonomy_completeness},
};
use crate::{
    contracts::{
        locale::{KnowledgeLocale, LOCALES},
        source_layout::{CONTENT_DIRECTORY_NAME, ENTITY_MANIFEST_FILENAME},
    },
    markdown::{compile_document, CompiledDocument},
    media::{resolve_structural_media, sha256_hex, MediaAsset},
    normalization::normalize_search_text,
    source::{
        deserialize_entity, source_schema_fingerprint_input, CanonicalEntity, LifeEntity,
        LocalizedContent, LocalizedValue, SectionStandardsDocument, SourceEntry, TaxonomyEntity,
    },
};
use serde_json::Value;
