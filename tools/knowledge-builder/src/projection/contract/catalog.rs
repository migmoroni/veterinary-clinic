//! Projects catalog entities and their semantic relationships into system rows.

use super::*;

pub(super) fn project_catalog(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        match &entry.source.entity {
            CanonicalEntity::Manufacturer(value) => {
                let crate::source::ManufacturerEntity {
                    schema_version,
                    id,
                    type_term_key,
                    classification_term_keys,
                    regions,
                    website,
                    localized_content,
                    sections,
                    content_path,
                    media,
                } = value;
                let _ = (schema_version, sections, content_path, media);
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ManufacturerCatalogItems,
                    SystemRow::Manufacturer {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        website: website.clone(),
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
            }
            CanonicalEntity::ActiveIngredient(value) => {
                let crate::source::ActiveIngredientEntity {
                    schema_version,
                    id,
                    type_term_key,
                    classification_term_keys,
                    regions,
                    nomenclature,
                    atc_vet_code,
                    localized_content,
                    sections,
                    content_path,
                    media,
                } = value;
                let crate::source::Nomenclature {
                    scientific_name,
                    cas_number,
                    denomination_standards,
                } = nomenclature;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    scientific_name,
                    cas_number,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                let denominations = denomination_standards
                    .iter()
                    .map(|standard| {
                        localized_text(
                            localized_content,
                            &format!("denomination_{standard}"),
                            locale,
                        )
                        .map(|value| (standard.clone(), value.to_string()))
                    })
                    .collect::<Result<BTreeMap<_, _>, _>>()?;
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ActiveIngredientCatalogItems,
                    SystemRow::ActiveIngredient {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        nomenclature_json: json(nomenclature)?,
                        atc_vet_code: atc_vet_code.clone(),
                        atc_vet_system: optional_localized_text(
                            localized_content,
                            "atcVetSystem",
                            locale,
                        )
                        .map(str::to_string),
                        denominations_json: json(&denominations)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
            }
            CanonicalEntity::Condition(value) => {
                let crate::source::ConditionEntity {
                    schema_version,
                    id,
                    type_term_key,
                    classification_term_keys,
                    regions,
                    localized_content,
                    sections,
                    content_path,
                    media,
                } = value;
                let _ = (schema_version, sections, content_path, media);
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ConditionCatalogItems,
                    SystemRow::Condition {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
            }
            CanonicalEntity::Breed(value) => {
                let crate::source::BreedEntity {
                    schema_version,
                    id,
                    species,
                    origin_place_ids,
                    size_term_key,
                    average_weight_kg,
                    average_height_cm,
                    localized_content,
                    sections,
                    content_path,
                    media,
                } = value;
                let crate::source::MeasurementRange {
                    male: weight_male,
                    female: weight_female,
                } = average_weight_kg;
                let crate::source::MeasurementRange {
                    male: height_male,
                    female: height_female,
                } = average_height_cm;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    weight_male,
                    weight_female,
                    height_male,
                    height_female,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::BreedReferenceItems,
                    SystemRow::Breed {
                        id: id.clone(),
                        species_json: json(species)?,
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        size_term_key: size_term_key.clone(),
                        average_weight_kg_json: json(average_weight_kg)?,
                        average_height_cm_json: json(average_height_cm)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                for (sort_order, place_id) in origin_place_ids.iter().enumerate() {
                    let row_id = format!("{id}/{place_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::BreedOrigin {
                            breed_id: id.clone(),
                            place_id: place_id.clone(),
                            sort_order,
                        },
                        SystemTable::BreedOriginPlaces,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    None,
                    &[],
                    Some(size_term_key),
                )?;
            }
            CanonicalEntity::Product(value) => {
                let crate::source::ProductEntity {
                    schema_version,
                    id,
                    type_term_key,
                    classification_term_keys,
                    species,
                    regions,
                    manufacturer_id,
                    active_ingredient_ids,
                    regulatory_identifiers,
                    target_term_keys,
                    vaccine_profile_term_keys,
                    life_stage_term_keys,
                    therapeutic_scope_term_keys,
                    localized_content,
                    sections,
                    content_path,
                    media,
                } = value;
                let crate::source::RegulatoryIdentifiers {
                    brazil_mapa,
                    united_states_nada,
                    united_states_anada,
                    gtin_ean,
                } = regulatory_identifiers;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    brazil_mapa,
                    united_states_nada,
                    united_states_anada,
                    gtin_ean,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ProductCatalogItems,
                    SystemRow::Product {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        species_json: json(species)?,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        manufacturer_id: manufacturer_id.clone(),
                        regions_json: json(regions)?,
                        regulatory_identifiers_json: json(regulatory_identifiers)?,
                        commercial_line: optional_localized_text(
                            localized_content,
                            "commercialLine",
                            locale,
                        )
                        .map(str::to_string),
                        presentation_dosage: optional_localized_text(
                            localized_content,
                            "presentationDosage",
                            locale,
                        )
                        .map(str::to_string),
                        target_species_warnings_json: json(
                            &localized_list(localized_content, "targetSpeciesWarnings", locale)
                                .unwrap_or_default(),
                        )?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
                for (sort_order, ingredient_id) in active_ingredient_ids.iter().enumerate() {
                    let row_id = format!("{id}/{ingredient_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::ProductActiveIngredient {
                            product_id: id.clone(),
                            active_ingredient_id: ingredient_id.clone(),
                            sort_order,
                        },
                        SystemTable::ProductActiveIngredients,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                for (table, values) in [
                    (SystemTable::ProductTargets, target_term_keys.as_deref()),
                    (
                        SystemTable::ProductVaccineProfiles,
                        vaccine_profile_term_keys.as_deref(),
                    ),
                    (
                        SystemTable::ProductLifeStages,
                        life_stage_term_keys.as_deref(),
                    ),
                    (
                        SystemTable::ProductTherapeuticScopes,
                        therapeutic_scope_term_keys.as_deref(),
                    ),
                ] {
                    for (sort_order, term_key) in values.unwrap_or(&[]).iter().enumerate() {
                        let row_id = format!("{id}/{term_key}");
                        push_system(
                            operations,
                            claims,
                            SystemRow::ProductTerm {
                                table,
                                product_id: id.clone(),
                                term_key: term_key.clone(),
                                sort_order,
                            },
                            table,
                            row_id.clone(),
                            Some(entity.clone()),
                        )?;
                    }
                }
            }
            CanonicalEntity::TreatmentProtocol(value) => {
                let crate::source::TreatmentProtocolEntity {
                    schema_version,
                    id,
                    kind,
                    species,
                    product_ids,
                    doses,
                    localized_content,
                } = value;
                let _ = schema_version;
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::TreatmentProtocols,
                    SystemRow::TreatmentProtocol {
                        id: id.clone(),
                        kind: kind.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        species_json: json(species)?,
                        observation: optional_localized_text(
                            localized_content,
                            "observation",
                            locale,
                        )
                        .map(str::to_string),
                    },
                )?;
                for (sort_order, product_id) in product_ids.iter().enumerate() {
                    let row_id = format!("{id}/{product_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::TreatmentProtocolItem {
                            protocol_id: id.clone(),
                            product_id: product_id.clone(),
                            sort_order,
                        },
                        SystemTable::TreatmentProtocolItems,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                for (sort_order, dose) in doses.iter().enumerate() {
                    let crate::source::ProtocolDose {
                        id: dose_id,
                        validity_value,
                        validity_unit,
                        localized_content,
                    } = dose;
                    let row_id = format!("{id}/{dose_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::TreatmentProtocolDose {
                            protocol_id: id.clone(),
                            dose_id: dose_id.clone(),
                            label: localized_text(localized_content, "label", locale)?.to_string(),
                            validity_value: *validity_value,
                            validity_unit: validity_unit.clone(),
                            sort_order,
                        },
                        SystemTable::TreatmentProtocolDoses,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
            }
            CanonicalEntity::GeoPlace(_) | CanonicalEntity::Taxonomy(_) => {}
        }
    }
    Ok(())
}
