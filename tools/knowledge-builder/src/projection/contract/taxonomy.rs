//! Projects taxonomy registries, taxonomy terms, and geographic places.

use super::{
    ownership::ObligationOwnership,
    values::{identity, json, localized_list, localized_text, push_system, taxonomy_for},
    SystemProjectionOperation, SystemRow,
};
use crate::{
    contracts::locale::KnowledgeLocale,
    normalization::{normalize_identity_key, normalize_search_text},
    projection::coverage::SystemTable,
    source::CanonicalEntity,
    validation::ValidatedSource,
};
use std::collections::BTreeSet;

pub(super) fn taxonomy_relations(
    source: &ValidatedSource,
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &crate::projection::coverage::EntityIdentity,
    relations: &[(&str, &[String])],
) -> Result<(), crate::ContractError> {
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
                row_id,
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

pub(super) fn project_taxonomies(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), crate::ContractError> {
    for entry in &source.entities {
        let CanonicalEntity::Taxonomy(taxonomy) = &entry.source.entity else {
            continue;
        };
        push_system(
            operations,
            claims,
            SystemRow::TaxonomyRegistry {
                id: taxonomy.id.clone(),
                domain: taxonomy.domain.clone(),
                purpose: taxonomy.purpose.clone(),
            },
            SystemTable::TaxonomyRegistry,
            taxonomy.id.clone(),
            Some(identity(&entry.source.entity)),
        )?;
        for visit in taxonomy.walk_terms() {
            let crate::source::TaxonomyTerm {
                key,
                localized_content,
                ..
            } = visit.term;
            let indexed = source
                .taxonomy_term(&taxonomy.domain, &taxonomy.purpose, key)
                .ok_or_else(|| format!("missing validated taxonomy term {key}"))?;
            debug_assert_eq!(indexed.depth, visit.depth);
            debug_assert_eq!(indexed.source_path, visit.source_path);
            debug_assert_eq!(indexed.owner_path, visit.owner_path());
            let label = localized_text(localized_content, "label", locale)?.to_string();
            let row_id = format!("{}/{}", taxonomy.id, key);
            push_system(
                operations,
                claims,
                SystemRow::TaxonomyTerm {
                    taxonomy_id: taxonomy.id.clone(),
                    term_key: key.clone(),
                    parent_term_key: indexed.parent_key.clone(),
                    normalized_label: normalize_search_text(&label),
                    label,
                    aliases_json: json(
                        &localized_list(localized_content, "aliases", locale).unwrap_or_default(),
                    )?,
                    sort_order: indexed.sibling_order,
                },
                SystemTable::TaxonomyTerms,
                row_id.clone(),
                Some(identity(&entry.source.entity)),
            )?;
        }
    }
    Ok(())
}

pub(super) fn project_geo_places(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), crate::ContractError> {
    let mut remaining = source
        .entities
        .iter()
        .filter_map(|entry| match &entry.source.entity {
            CanonicalEntity::GeoPlace(value) => Some((entry, value)),
            _ => None,
        })
        .collect::<Vec<_>>();
    let mut inserted = BTreeSet::new();
    while !remaining.is_empty() {
        let before = remaining.len();
        let mut next = Vec::new();
        for (entry, value) in remaining {
            let crate::source::GeoPlaceEntity {
                schema_version,
                id,
                place_type,
                country_codes,
                parent_place_id,
                centroid,
                localized_content,
            } = value;
            let _ = schema_version;
            if parent_place_id
                .as_ref()
                .is_some_and(|parent| !inserted.contains(parent))
            {
                next.push((entry, value));
                continue;
            }
            let crate::source::Centroid {
                latitude,
                longitude,
            } = centroid;
            let name = localized_text(localized_content, "name", locale)?.to_string();
            push_system(
                operations,
                claims,
                SystemRow::GeoPlace {
                    id: id.clone(),
                    place_type: place_type.clone(),
                    parent_place_id: parent_place_id.clone(),
                    country_codes_json: json(country_codes)?,
                    latitude: *latitude,
                    longitude: *longitude,
                    normalized_name: normalize_identity_key(&name),
                    name,
                    aliases_json: json(
                        &localized_list(localized_content, "aliases", locale).unwrap_or_default(),
                    )?,
                },
                SystemTable::GeoPlaces,
                id.clone(),
                Some(identity(&entry.source.entity)),
            )?;
            inserted.insert(id.clone());
        }
        if next.len() == before {
            return Err(
                ("geo_place hierarchy could not be topologically projected".to_string()).into(),
            );
        }
        remaining = next;
    }
    Ok(())
}
