//! Validates semantic references between canonical entities and taxonomy terms.

use super::*;

pub(super) fn validate_references(
    entries: &[SourceEntry],
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let identities = entries
        .iter()
        .map(|entry| (entry.entity.entity_type(), entry.entity.id()))
        .collect::<BTreeSet<_>>();
    for entry in entries {
        match &entry.entity {
            CanonicalEntity::Product(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "product",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "product",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
                require_identity(
                    entry,
                    &identities,
                    "manufacturer",
                    &value.manufacturer_id,
                    "manufacturerId",
                    diagnostics,
                );
                for id in &value.active_ingredient_ids {
                    require_identity(
                        entry,
                        &identities,
                        "active_ingredient",
                        id,
                        "activeIngredientIds",
                        diagnostics,
                    );
                }
                for (purpose, field, values) in [
                    (
                        "target",
                        "targetTermKeys",
                        value.target_term_keys.as_deref(),
                    ),
                    (
                        "vaccine_profile",
                        "vaccineProfileTermKeys",
                        value.vaccine_profile_term_keys.as_deref(),
                    ),
                    (
                        "life_stage",
                        "lifeStageTermKeys",
                        value.life_stage_term_keys.as_deref(),
                    ),
                    (
                        "therapeutic_scope",
                        "therapeuticScopeTermKeys",
                        value.therapeutic_scope_term_keys.as_deref(),
                    ),
                ] {
                    require_terms(
                        entry,
                        taxonomies,
                        "product",
                        purpose,
                        values.unwrap_or(&[]),
                        field,
                        diagnostics,
                    );
                }
            }
            CanonicalEntity::Manufacturer(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "manufacturer",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "manufacturer",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::ActiveIngredient(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "active_ingredient",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "active_ingredient",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::Condition(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "condition",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "condition",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::Life(value) => {
                if let Some(origins) = value
                    .classifications
                    .as_ref()
                    .and_then(|classifications| classifications.origin_place_ids.as_ref())
                {
                    for id in origins {
                        require_identity(
                            entry,
                            &identities,
                            "geo_place",
                            id,
                            "classifications.originPlaceIds",
                            diagnostics,
                        );
                    }
                }
            }
            CanonicalEntity::GeoPlace(value) => {
                if let Some(id) = &value.parent_place_id {
                    require_identity(
                        entry,
                        &identities,
                        "geo_place",
                        id,
                        "parentPlaceId",
                        diagnostics,
                    );
                }
            }
            CanonicalEntity::TreatmentProtocol(value) => {
                for id in &value.product_ids {
                    require_identity(entry, &identities, "product", id, "productIds", diagnostics);
                }
            }
            CanonicalEntity::Taxonomy(_) => {}
        }
    }
}

fn require_term(
    entry: &SourceEntry,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    domain: &str,
    purpose: &str,
    key: &str,
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let taxonomy = taxonomies.get(&(domain.to_string(), purpose.to_string()));
    if !taxonomy.is_some_and(|value| value.terms.iter().any(|term| term.key == key)) {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            format!("unresolved or cross-domain taxonomy term {key}"),
        ));
    }
}

fn require_terms(
    entry: &SourceEntry,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    domain: &str,
    purpose: &str,
    keys: &[String],
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for key in keys {
        require_term(entry, taxonomies, domain, purpose, key, field, diagnostics);
    }
}

fn require_identity(
    entry: &SourceEntry,
    identities: &BTreeSet<(&str, &str)>,
    entity_type: &str,
    id: &str,
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if !identities.contains(&(entity_type, id)) {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            format!("unresolved {entity_type} id {id}"),
        ));
    }
}
