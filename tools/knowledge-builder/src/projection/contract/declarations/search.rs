//! Discovers deterministic locale search candidates from validated source data.

use super::{values::identity, SourceToken};
use crate::{
    contracts::locale::KnowledgeLocale,
    source::{CanonicalEntity, LocalizedContent, LocalizedValue},
    validation::ValidatedSource,
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub(crate) struct SearchCandidate {
    pub(crate) entity: crate::projection::coverage::EntityIdentity,
    pub(crate) value: String,
    pub(crate) provenance: String,
    pub(crate) occurrence: usize,
    pub(crate) source: SourceToken,
}

pub(crate) fn search_candidates(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<Vec<SearchCandidate>, crate::ContractError> {
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
                    source,
                    "product",
                    "type",
                    std::slice::from_ref(&product.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    source,
                    "product",
                    "classification",
                    &product.classification_term_keys,
                    locale,
                    "classification",
                )?;
                append_taxonomy_values(
                    &mut values,
                    source,
                    "product",
                    "target",
                    product.target_term_keys.as_deref().unwrap_or(&[]),
                    locale,
                    "target",
                )?;
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
            CanonicalEntity::Life(_) => {}
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
            if !seen.insert(normalized) {
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

fn append_entity_taxonomies(
    values: &mut Vec<(String, String)>,
    source: &ValidatedSource,
    domain: &str,
    type_key: &String,
    classifications: &[String],
    locale: KnowledgeLocale,
) -> Result<(), crate::ContractError> {
    append_taxonomy_values(
        values,
        source,
        domain,
        "type",
        std::slice::from_ref(type_key),
        locale,
        "type",
    )?;
    append_taxonomy_values(
        values,
        source,
        domain,
        "classification",
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
) -> Result<(), crate::ContractError> {
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
    source: &ValidatedSource,
    domain: &str,
    purpose: &str,
    keys: &[String],
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), crate::ContractError> {
    for key in keys {
        let term = source
            .taxonomy_term(domain, purpose, key)
            .map(|indexed| &indexed.term)
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
) -> Result<&'a str, crate::ContractError> {
    Ok(optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))?)
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
