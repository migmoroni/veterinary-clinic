//! Provides shared helpers for relations, localized content, search, media, and row emission.

use super::*;

pub(super) fn taxonomy_relations(
    source: &ValidatedSource,
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &EntityIdentity,
    relations: &[(&str, &[String])],
) -> Result<(), String> {
    for (purpose, values) in relations {
        if values.is_empty() {
            continue;
        }
        let taxonomy = taxonomy_for(source, &entity.entity_type, purpose)?;
        for (sort_order, term_key) in values.iter().enumerate() {
            let row_id = format!(
                "{}/{}/{}/{term_key}",
                entity.entity_type, entity.id, taxonomy.id
            );
            push_system(
                operations,
                claims,
                SystemRow::EntityTaxonomy {
                    entity_type: entity.entity_type.clone(),
                    entity_id: entity.id.clone(),
                    taxonomy_id: taxonomy.id.clone(),
                    term_key: term_key.clone(),
                    sort_order,
                },
                SystemTable::EntityTaxonomyTerms,
                row_id.clone(),
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

pub(super) fn project_media_references(
    source: &ValidatedSource,
    _locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        for reference in &entry.structural_media {
            let row_id = format!(
                "{}/{}/{}/{}",
                entity.entity_type, entity.id, reference.role, reference.sort_order
            );
            push_system(
                operations,
                claims,
                SystemRow::MediaReference {
                    entity_type: entity.entity_type.clone(),
                    entity_id: entity.id.clone(),
                    role: reference.role.to_string(),
                    media_key: reference.media_key.clone(),
                    sort_order: reference.sort_order,
                },
                SystemTable::EntityMediaReferences,
                row_id.clone(),
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

pub(super) fn project_search(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for candidate in search_candidates(source, locale)? {
        let row_id = format!("{}/{}", candidate.entity, candidate.occurrence);
        push_system(
            operations,
            claims,
            SystemRow::SearchTerm {
                entity_type: candidate.entity.entity_type.clone(),
                entity_id: candidate.entity.id.clone(),
                normalized_value: normalize_search_text(&candidate.value),
                value: candidate.value,
                provenance: candidate.provenance,
                sort_order: candidate.occurrence,
            },
            SystemTable::EntitySearchTerms,
            row_id,
            Some(candidate.entity),
        )?;
    }
    Ok(())
}

pub(super) fn push_main(
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &EntityIdentity,
    table: SystemTable,
    row: SystemRow,
) -> Result<(), String> {
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
) -> Result<(), String> {
    let owner = ProjectionOperationId::SystemRow {
        table,
        row: row_id.clone(),
    };
    operations.push(SystemProjectionOperation {
        row,
        obligations: claims.claim(&owner)?,
        event: RowEvent {
            database: DatabaseKind::System,
            table,
            row: row_id,
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
) -> Result<&'a TaxonomyEntity, String> {
    source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))
}

pub(super) fn localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Result<&'a str, String> {
    optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))
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
) -> Result<String, String> {
    let empty = CompiledDocument {
        schema_version: 1,
        sections: Vec::new(),
    };
    let content = entry.editorial.get(&locale).unwrap_or(&empty);
    schemas::validate_content(content)?;
    json(content)
}

pub(super) fn json(value: &impl serde::Serialize) -> Result<String, String> {
    serde_json::to_string(value)
        .map_err(|error| format!("cannot serialize projected JSON: {error}"))
}
