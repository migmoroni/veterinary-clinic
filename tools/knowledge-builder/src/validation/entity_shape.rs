//! Validates canonical entity shapes and entity-specific scalar and collection policies.

use super::*;

pub(super) fn validate_entity_shape(entry: &SourceEntry, diagnostics: &mut Vec<Diagnostic>) {
    if entry.entity.schema_version() != 1 {
        diagnostics.push(Diagnostic::entity(
            entry,
            "schemaVersion",
            "schemaVersion must be 1",
        ));
    }
    if entry.entity.id().trim() != entry.entity.id() || entry.entity.id().is_empty() {
        diagnostics.push(Diagnostic::entity(
            entry,
            "id",
            "id must be non-empty and trimmed",
        ));
    }
    if matches!(
        entry.entity,
        CanonicalEntity::Product(_)
            | CanonicalEntity::Manufacturer(_)
            | CanonicalEntity::ActiveIngredient(_)
            | CanonicalEntity::Condition(_)
            | CanonicalEntity::TreatmentProtocol(_)
    ) && !is_uuid_v4(entry.entity.id())
    {
        diagnostics.push(Diagnostic::entity(
            entry,
            "id",
            "id must be a lowercase UUIDv4",
        ));
    }
    validate_localized_schema(entry, diagnostics);
    validate_sections(entry, diagnostics);

    match &entry.entity {
        CanonicalEntity::Product(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            validate_unique_texts(
                entry,
                "activeIngredientIds",
                &value.active_ingredient_ids,
                false,
                diagnostics,
            );
            for (field, values) in [
                ("targetTermKeys", value.target_term_keys.as_ref()),
                (
                    "vaccineProfileTermKeys",
                    value.vaccine_profile_term_keys.as_ref(),
                ),
                ("lifeStageTermKeys", value.life_stage_term_keys.as_ref()),
                (
                    "therapeuticScopeTermKeys",
                    value.therapeutic_scope_term_keys.as_ref(),
                ),
            ] {
                if let Some(values) = values {
                    validate_unique_texts(entry, field, values, true, diagnostics);
                }
            }
        }
        CanonicalEntity::Manufacturer(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            if value
                .website
                .as_deref()
                .is_some_and(|value| !value.starts_with("https://"))
            {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "website",
                    "website must use https",
                ));
            }
        }
        CanonicalEntity::ActiveIngredient(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            validate_unique_texts(
                entry,
                "nomenclature.denominationStandards",
                &value.nomenclature.denomination_standards,
                false,
                diagnostics,
            );
            for standard in &value.nomenclature.denomination_standards {
                if !value
                    .localized_content
                    .contains_key(&format!("denomination_{standard}"))
                {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent",
                        format!("missing denomination_{standard}"),
                    ));
                }
            }
            for field in value.localized_content.keys().filter_map(|key| {
                key.strip_prefix("denomination_")
                    .map(|standard| (key, standard))
            }) {
                if !value
                    .nomenclature
                    .denomination_standards
                    .iter()
                    .any(|standard| standard == field.1)
                {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        format!("localizedContent.{}", field.0),
                        "denomination has no declared nomenclature standard",
                    ));
                }
            }
        }
        CanonicalEntity::Condition(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
        }
        CanonicalEntity::Breed(value) => {
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(
                entry,
                "originPlaceIds",
                &value.origin_place_ids,
                true,
                diagnostics,
            );
            validate_range(
                entry,
                "averageWeightKg.male",
                value.average_weight_kg.male,
                diagnostics,
            );
            validate_range(
                entry,
                "averageWeightKg.female",
                value.average_weight_kg.female,
                diagnostics,
            );
            validate_range(
                entry,
                "averageHeightCm.male",
                value.average_height_cm.male,
                diagnostics,
            );
            validate_range(
                entry,
                "averageHeightCm.female",
                value.average_height_cm.female,
                diagnostics,
            );
        }
        CanonicalEntity::GeoPlace(value) => {
            validate_unique_texts(
                entry,
                "countryCodes",
                &value.country_codes,
                false,
                diagnostics,
            );
            let centroid_is_valid = match (value.centroid.latitude, value.centroid.longitude) {
                (Some(latitude), Some(longitude)) => {
                    (-90.0..=90.0).contains(&latitude) && (-180.0..=180.0).contains(&longitude)
                }
                (None, None) => true,
                _ => false,
            };
            if !centroid_is_valid {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "centroid",
                    "centroid is out of range",
                ));
            }
        }
        CanonicalEntity::TreatmentProtocol(value) => {
            if !matches!(value.kind.as_str(), "vaccine" | "antiparasitic") {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "kind",
                    "unsupported protocol kind",
                ));
            }
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(entry, "productIds", &value.product_ids, true, diagnostics);
            let mut dose_ids = BTreeSet::new();
            for dose in &value.doses {
                if !dose_ids.insert(&dose.id) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "doses",
                        format!("duplicate dose {}", dose.id),
                    ));
                }
                if dose.validity_value == 0
                    || !matches!(dose.validity_unit.as_str(), "days" | "months" | "years")
                {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "doses",
                        format!("invalid dose {} validity", dose.id),
                    ));
                }
                validate_localized_content(
                    entry,
                    &dose.localized_content,
                    &["label"],
                    &[],
                    &["label"],
                    &format!("doses.{}.localizedContent", dose.id),
                    diagnostics,
                );
            }
        }
        CanonicalEntity::Taxonomy(value) => validate_taxonomy(entry, value, diagnostics),
    }
}
