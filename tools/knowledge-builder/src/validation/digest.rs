//! Computes the logical source digest and deterministic source projection counts.

use super::*;

pub(super) fn logical_digest(
    entities: &[ValidatedEntity],
    media: &BTreeMap<String, MediaAsset>,
) -> Result<String, String> {
    let mut logical_entities = Vec::with_capacity(entities.len());
    let mut editorial = BTreeMap::new();
    for entry in entities {
        let mut value =
            serde_json::to_value(&entry.source.entity).map_err(|error| error.to_string())?;
        if let Some(object) = value.as_object_mut() {
            object.remove("contentPath");
            if let Some(sections) = object.get_mut("sections").and_then(Value::as_array_mut) {
                for section in sections {
                    section
                        .as_object_mut()
                        .map(|section| section.remove("sectionNumber"));
                }
            }
        }
        logical_entities.push(value);
        if !entry.editorial.is_empty() {
            editorial.insert(
                format!(
                    "{}:{}",
                    entry.source.entity.entity_type(),
                    entry.source.entity.id()
                ),
                entry
                    .editorial
                    .iter()
                    .map(|(locale, document)| (locale.to_string(), document))
                    .collect::<BTreeMap<_, _>>(),
            );
        }
    }
    let schemas = source_schema_fingerprint_input()
        .iter()
        .map(|schema| {
            serde_json::from_str::<Value>(schema)
                .map_err(|error| format!("invalid embedded source schema: {error}"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let media = media
        .values()
        .map(|asset| {
            serde_json::json!({
                "mediaKey": asset.media_key,
                "contentHash": asset.content_hash_sha256,
                "mimeType": asset.mime_type,
                "sizeBytes": asset.size_bytes,
                "width": asset.width,
                "height": asset.height,
            })
        })
        .collect::<Vec<_>>();
    let model = serde_json::json!({
        "schemaVersion": crate::contracts::version::SOURCE_DIGEST_SCHEMA_VERSION,
        "sourceSchemas": schemas,
        "entities": logical_entities,
        "editorial": editorial,
        "media": media,
    });
    serde_json::to_vec(&model)
        .map(|bytes| sha256_hex(&bytes))
        .map_err(|error| error.to_string())
}

pub(super) fn localized_fragment_counts(
    entities: &[ValidatedEntity],
) -> BTreeMap<KnowledgeLocale, usize> {
    LOCALES
        .into_iter()
        .map(|locale| {
            let mut count = 0;
            for entry in entities {
                if let Some(content) = entry.source.entity.localized_content() {
                    count += content
                        .values()
                        .map(|value| value.values(locale).len())
                        .sum::<usize>();
                }
                match &entry.source.entity {
                    CanonicalEntity::Taxonomy(taxonomy) => {
                        for term in &taxonomy.terms {
                            count += term
                                .localized_content
                                .values()
                                .map(|value| value.values(locale).len())
                                .sum::<usize>();
                        }
                    }
                    CanonicalEntity::TreatmentProtocol(protocol) => {
                        for dose in &protocol.doses {
                            count += dose
                                .localized_content
                                .values()
                                .map(|value| value.values(locale).len())
                                .sum::<usize>();
                        }
                    }
                    _ => {}
                }
                count += entry
                    .editorial
                    .get(&locale)
                    .map_or(0, |document| document.sections.len());
            }
            (locale, count)
        })
        .collect()
}

pub(super) fn relation_count(entities: &[ValidatedEntity]) -> usize {
    entities
        .iter()
        .map(|entry| match &entry.source.entity {
            CanonicalEntity::Product(value) => {
                2 + value.classification_term_keys.len()
                    + value.applicable_taxon_ids.len()
                    + value.active_ingredient_ids.len()
                    + value.target_term_keys.as_ref().map_or(0, Vec::len)
                    + value.vaccine_profile_term_keys.as_ref().map_or(0, Vec::len)
                    + value.life_stage_term_keys.as_ref().map_or(0, Vec::len)
                    + value
                        .therapeutic_scope_term_keys
                        .as_ref()
                        .map_or(0, Vec::len)
            }
            CanonicalEntity::Manufacturer(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::ActiveIngredient(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::Condition(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::Life(value) => {
                value.taxonomy.positions().iter().flatten().count()
                    + value
                        .classifications
                        .as_ref()
                        .and_then(|classifications| classifications.origin_place_ids.as_ref())
                        .map_or(0, Vec::len)
                    + usize::from(
                        value
                            .classifications
                            .as_ref()
                            .and_then(|classifications| classifications.body_metrics.as_ref())
                            .and_then(|body| body.size.as_ref())
                            .is_some(),
                    )
            }
            CanonicalEntity::GeoPlace(value) => usize::from(value.parent_place_id.is_some()),
            CanonicalEntity::Taxonomy(value) => value
                .terms
                .iter()
                .filter(|term| term.parent_key.is_some())
                .count(),
            CanonicalEntity::TreatmentProtocol(value) => {
                value.product_ids.len() + value.applicable_taxon_ids.len()
            }
        })
        .sum()
}
