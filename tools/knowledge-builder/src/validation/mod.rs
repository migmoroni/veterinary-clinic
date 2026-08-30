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
mod taxonomy;

#[cfg(test)]
mod tests;

pub use model::{Diagnostic, ValidatedSource, ValidationError};
pub(crate) use model::{ValidatedEntity, ValidatedMediaReference};
pub use pipeline::validate_source;

use self::{
    aliases::validate_alias_ownership,
    digest::{localized_fragment_counts, logical_digest, relation_count},
    entity_shape::validate_entity_shape,
    filesystem::{
        discover_files, exact_content_files, resolve_content_directory, validate_file_coverage,
    },
    localized::{validate_localized_content, validate_localized_schema, validate_sections},
    primitives::{is_simple_text, is_uuid_v4, validate_unique_texts},
    references::validate_references,
    taxonomy::{collect_taxonomies, validate_taxonomy, validate_taxonomy_completeness},
};
use crate::{
    contracts::locale::{KnowledgeLocale, LOCALES},
    markdown::{compile_document, CompiledDocument, CompiledMediaReference},
    media::{resolve_media, sha256_hex, MediaAsset},
    normalization::normalize_search_text,
    source::{
        deserialize_entity, source_schema_fingerprint_input, CanonicalEntity, LifeEntity,
        LocalizedContent, LocalizedValue, SourceEntry, TaxonomyEntity,
    },
};
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt, fs,
    path::{Path, PathBuf},
};
