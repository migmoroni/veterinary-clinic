//! Owns localized extraction, JSON encoding, identities, and row emission.

use super::{ownership::ObligationOwnership, SystemProjectionOperation, SystemRow};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    markdown::CompiledDocument,
    projection::coverage::{
        EntityIdentity, ProjectionOperationId, RowEvent, RowIdentity, SystemTable,
    },
    schemas,
    source::{CanonicalEntity, LocalizedContent, LocalizedValue, TaxonomyEntity},
    validation::{ValidatedEntity, ValidatedSource},
};

pub(super) fn push_main(
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &EntityIdentity,
    table: SystemTable,
    row: SystemRow,
) -> Result<(), crate::ContractError> {
    push_system(
        operations,
        claims,
        row,
        table,
        entity.id.clone(),
        Some(entity.clone()),
    )
}

pub(super) fn push_system(
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    row: SystemRow,
    table: SystemTable,
    row_id: String,
    entity: Option<EntityIdentity>,
) -> Result<(), crate::ContractError> {
    let owner = ProjectionOperationId::SystemRow {
        table,
        row: RowIdentity::new(&row_id),
    };
    operations.push(SystemProjectionOperation {
        row,
        obligations: claims.claim(&owner)?,
        event: RowEvent {
            database: DatabaseKind::System,
            table,
            row: RowIdentity::new(row_id),
            entity,
        },
    });
    Ok(())
}

pub(super) fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
}

pub(super) fn taxonomy_for<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a TaxonomyEntity, crate::ContractError> {
    Ok(source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))?)
}

pub(super) fn localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Result<&'a str, crate::ContractError> {
    Ok(optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))?)
}

pub(super) fn optional_localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<&'a str> {
    content.get(field).and_then(|value| value.text(locale))
}

pub(super) fn localized_list(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<Vec<String>> {
    content.get(field).and_then(|value| match value {
        LocalizedValue::List(values) => Some(values.get(locale).clone()),
        LocalizedValue::Text(_) => None,
    })
}

pub(super) fn content_json(
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
) -> Result<String, crate::ContractError> {
    let empty = CompiledDocument {
        schema_version: crate::contracts::version::CONTENT_DOCUMENT_SCHEMA_VERSION,
        sections: Vec::new(),
    };
    let content = entry.editorial.get(&locale).unwrap_or(&empty);
    schemas::validate_content(content)?;
    json(content)
}

pub(super) fn json(value: &impl serde::Serialize) -> Result<String, crate::ContractError> {
    serde_json::to_string(value).map_err(|source| crate::ContractError::Json {
        operation: "serialize projected JSON",
        source,
    })
}
