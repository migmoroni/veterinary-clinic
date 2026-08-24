//! Projects taxonomy registries, taxonomy terms, and geographic places.

use super::*;

pub(super) fn project_taxonomies(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
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
        let table = semantic_term_table(&taxonomy.purpose);
        for term in &taxonomy.terms {
            let crate::source::TaxonomyTerm {
                key,
                parent_key,
                order,
                localized_content,
            } = term;
            let label = localized_text(localized_content, "label", locale)?.to_string();
            let row_id = if table == SystemTable::TaxonomyTerms {
                format!("{}/{}", taxonomy.id, key)
            } else {
                key.clone()
            };
            push_system(
                operations,
                claims,
                SystemRow::TaxonomyTerm {
                    table,
                    taxonomy_id: (table == SystemTable::TaxonomyTerms).then(|| taxonomy.id.clone()),
                    term_key: key.clone(),
                    parent_term_key: parent_key.clone(),
                    normalized_label: normalize_search_text(&label),
                    label,
                    aliases_json: json(
                        &localized_list(localized_content, "aliases", locale).unwrap_or_default(),
                    )?,
                    sort_order: usize::try_from(*order)
                        .map_err(|_| "taxonomy sort order exceeds usize".to_string())?,
                },
                table,
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
) -> Result<(), String> {
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
            return Err("geo_place hierarchy could not be topologically projected".to_string());
        }
        remaining = next;
    }
    Ok(())
}
