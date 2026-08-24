//! Derives deterministic localized search candidates from entities, related
//! names, aliases, denominations, and taxonomy terms.

use super::{journal::SearchCandidate, obligation_helpers::identity, SourceToken};
use crate::{
    source::{CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, TaxonomyEntity},
    validation::ValidatedSource,
};
use std::collections::{BTreeMap, BTreeSet};

pub(crate) fn search_candidates(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<Vec<SearchCandidate>, String> {
    let by_identity = source
        .entities
        .iter()
        .map(|entry| {
            (
                (entry.source.entity.entity_type(), entry.source.entity.id()),
                entry,
            )
        })
        .collect::<BTreeMap<_, _>>();
    let mut result = Vec::new();
    for entry in &source.entities {
        let Some(content) = entry.source.entity.localized_content() else {
            continue;
        };
        let entity = identity(&entry.source.entity);
        let mut values = Vec::<(String, String)>::new();
        if let Some(name) = optional_localized_text(content, "name", locale) {
            values.push((name.to_string(), "entity.name".to_string()));
        }
        for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
            values.push((alias, "entity.alias".to_string()));
        }
        match &entry.source.entity {
            CanonicalEntity::Product(product) => {
                if let Some(manufacturer) =
                    by_identity.get(&("manufacturer", product.manufacturer_id.as_str()))
                {
                    append_named_relation(
                        &mut values,
                        &manufacturer.source.entity,
                        locale,
                        "manufacturer",
                    )?;
                }
                for id in &product.active_ingredient_ids {
                    if let Some(ingredient) = by_identity.get(&("active_ingredient", id.as_str())) {
                        append_named_relation(
                            &mut values,
                            &ingredient.source.entity,
                            locale,
                            "activeIngredient",
                        )?;
                        if let CanonicalEntity::ActiveIngredient(ingredient) =
                            &ingredient.source.entity
                        {
                            for standard in &ingredient.nomenclature.denomination_standards {
                                if let Some(value) = optional_localized_text(
                                    &ingredient.localized_content,
                                    &format!("denomination_{standard}"),
                                    locale,
                                ) {
                                    values.push((
                                        value.to_string(),
                                        format!("activeIngredient.denomination.{standard}"),
                                    ));
                                }
                            }
                        }
                    }
                }
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "type")?,
                    std::slice::from_ref(&product.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "classification")?,
                    &product.classification_term_keys,
                    locale,
                    "classification",
                )?;
                for (purpose, keys, provenance) in [
                    ("target", product.target_term_keys.as_deref(), "target"),
                    (
                        "vaccine_profile",
                        product.vaccine_profile_term_keys.as_deref(),
                        "vaccineProfile",
                    ),
                    (
                        "life_stage",
                        product.life_stage_term_keys.as_deref(),
                        "lifeStage",
                    ),
                    (
                        "therapeutic_scope",
                        product.therapeutic_scope_term_keys.as_deref(),
                        "therapeuticScope",
                    ),
                ] {
                    append_taxonomy_values(
                        &mut values,
                        taxonomy_for(source, "product", purpose)?,
                        keys.unwrap_or(&[]),
                        locale,
                        provenance,
                    )?;
                }
            }
            CanonicalEntity::Manufacturer(value) => append_entity_taxonomies(
                &mut values,
                source,
                "manufacturer",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::ActiveIngredient(value) => append_entity_taxonomies(
                &mut values,
                source,
                "active_ingredient",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::Condition(value) => append_entity_taxonomies(
                &mut values,
                source,
                "condition",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::Breed(value) => append_taxonomy_values(
                &mut values,
                taxonomy_for(source, "breed", "size")?,
                std::slice::from_ref(&value.size_term_key),
                locale,
                "size",
            )?,
            CanonicalEntity::GeoPlace(_) | CanonicalEntity::TreatmentProtocol(_) => {}
            CanonicalEntity::Taxonomy(_) => unreachable!(),
        }
        let mut seen = BTreeSet::new();
        let mut order = 0;
        let mut alias_position = 0;
        for (value, provenance) in values {
            let current_alias_position = (provenance == "entity.alias").then(|| {
                let position = alias_position;
                alias_position += 1;
                position
            });
            let normalized = crate::normalization::normalize_search_text(&value);
            if !seen.insert((provenance.clone(), normalized)) {
                continue;
            }
            let source_token = match provenance.as_str() {
                "entity.name" => SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: "localizedContent.name".to_string(),
                    locale,
                    position: 0,
                },
                "entity.alias" => SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: "localizedContent.aliases".to_string(),
                    locale,
                    position: current_alias_position.expect("entity alias has a position"),
                },
                _ => SourceToken::SearchValue {
                    entity: entity.clone(),
                    locale,
                    provenance: provenance.clone(),
                    occurrence: order,
                },
            };
            result.push(SearchCandidate {
                entity: entity.clone(),
                value,
                provenance: provenance.clone(),
                occurrence: order,
                source: source_token,
            });
            order += 1;
        }
    }
    Ok(result)
}

fn taxonomy_for<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a TaxonomyEntity, String> {
    source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))
}

fn append_entity_taxonomies(
    values: &mut Vec<(String, String)>,
    source: &ValidatedSource,
    domain: &str,
    type_key: &String,
    classifications: &[String],
    locale: KnowledgeLocale,
) -> Result<(), String> {
    append_taxonomy_values(
        values,
        taxonomy_for(source, domain, "type")?,
        std::slice::from_ref(type_key),
        locale,
        "type",
    )?;
    append_taxonomy_values(
        values,
        taxonomy_for(source, domain, "classification")?,
        classifications,
        locale,
        "classification",
    )
}

fn append_named_relation(
    values: &mut Vec<(String, String)>,
    entity: &CanonicalEntity,
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    let content = entity
        .localized_content()
        .ok_or_else(|| "related entity has no localized content".to_string())?;
    values.push((
        localized_text(content, "name", locale)?.to_string(),
        format!("{prefix}.name"),
    ));
    for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
        values.push((alias, format!("{prefix}.alias")));
    }
    Ok(())
}

fn append_taxonomy_values(
    values: &mut Vec<(String, String)>,
    taxonomy: &TaxonomyEntity,
    keys: &[String],
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    for key in keys {
        let term = taxonomy
            .terms
            .iter()
            .find(|term| &term.key == key)
            .ok_or_else(|| format!("unresolved taxonomy term {key}"))?;
        values.push((
            localized_text(&term.localized_content, "label", locale)?.to_string(),
            format!("{prefix}.label:{key}"),
        ));
        for alias in localized_list(&term.localized_content, "aliases", locale).unwrap_or_default()
        {
            values.push((alias, format!("{prefix}.alias:{key}")));
        }
    }
    Ok(())
}

fn localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Result<&'a str, String> {
    optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))
}

fn optional_localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<&'a str> {
    content.get(field).and_then(|value| value.text(locale))
}

fn localized_list(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<Vec<String>> {
    content.get(field).and_then(|value| match value {
        LocalizedValue::List(value) => Some(value.get(locale).clone()),
        LocalizedValue::Text(_) => None,
    })
}
