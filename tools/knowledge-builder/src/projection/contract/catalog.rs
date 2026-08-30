//! Projects catalog entities and their semantic relationships into system rows.

use super::*;

pub(super) fn project_catalog(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    project_life(source, locale, claims, operations)?;
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
                    &[
                        ("type", std::slice::from_ref(type_term_key)),
                        ("classification", classification_term_keys),
                    ],
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
                    &[
                        ("type", std::slice::from_ref(type_term_key)),
                        ("classification", classification_term_keys),
                    ],
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
                    &[
                        ("type", std::slice::from_ref(type_term_key)),
                        ("classification", classification_term_keys),
                    ],
                )?;
            }
            CanonicalEntity::Life(_) => {}
            CanonicalEntity::Product(value) => {
                let crate::source::ProductEntity {
                    schema_version,
                    id,
                    type_term_key,
                    classification_term_keys,
                    applicable_taxon_ids,
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
                        normalized_name: normalize_identity_key(&name),
                        name,
                        applicable_taxon_ids_json: json(applicable_taxon_ids)?,
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
                    &[
                        ("type", std::slice::from_ref(type_term_key)),
                        ("classification", classification_term_keys),
                        ("target", target_term_keys.as_deref().unwrap_or(&[])),
                        (
                            "vaccine_profile",
                            vaccine_profile_term_keys.as_deref().unwrap_or(&[]),
                        ),
                        ("life_stage", life_stage_term_keys.as_deref().unwrap_or(&[])),
                        (
                            "therapeutic_scope",
                            therapeutic_scope_term_keys.as_deref().unwrap_or(&[]),
                        ),
                    ],
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
            }
            CanonicalEntity::TreatmentProtocol(value) => {
                let crate::source::TreatmentProtocolEntity {
                    schema_version,
                    id,
                    kind,
                    applicable_taxon_ids,
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
                        applicable_taxon_ids_json: json(applicable_taxon_ids)?,
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

fn project_life(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    let mut entries = source
        .entities
        .iter()
        .filter_map(|entry| match &entry.source.entity {
            CanonicalEntity::Life(value) => {
                Some((value.taxonomy.level(), value.id.as_str(), entry, value))
            }
            _ => None,
        })
        .collect::<Vec<_>>();
    entries.sort_by(|left, right| (left.0, left.1).cmp(&(right.0, right.1)));
    for (_, _, entry, value) in entries {
        let entity = identity(&entry.source.entity);
        let positions = value.taxonomy.positions();
        let body = value
            .classifications
            .as_ref()
            .and_then(|classifications| classifications.body_metrics.as_ref());
        let name = localized_text(&value.localized_content, "name", locale)?.to_string();
        push_main(
            operations,
            claims,
            &entity,
            SystemTable::LifeReferenceItems,
            SystemRow::Life {
                id: value.id.clone(),
                domain_id: positions[0].expect("life domain is required").to_string(),
                kingdom_id: positions[1].map(str::to_string),
                phylum_id: positions[2].map(str::to_string),
                class_id: positions[3].map(str::to_string),
                order_id: positions[4].map(str::to_string),
                family_id: positions[5].map(str::to_string),
                genus_id: positions[6].map(str::to_string),
                species_id: positions[7].map(str::to_string),
                breed_id: positions[8].map(str::to_string),
                variety_id: positions[9].map(str::to_string),
                size_term_key: body.and_then(|metrics| metrics.size.clone()),
                normalized_name: normalize_identity_key(&name),
                name,
                aliases_json: json(
                    &localized_list(&value.localized_content, "aliases", locale)
                        .unwrap_or_default(),
                )?,
                stage_metrics_json: body
                    .and_then(|metrics| metrics.stage_metrics.as_ref())
                    .map(json)
                    .transpose()?,
                content_json: content_json(entry, locale)?,
            },
        )?;
        if let Some(origins) = value
            .classifications
            .as_ref()
            .and_then(|classifications| classifications.origin_place_ids.as_ref())
        {
            for (sort_order, place_id) in origins.iter().enumerate() {
                let row_id = format!("{}/{place_id}", value.id);
                push_system(
                    operations,
                    claims,
                    SystemRow::LifeOrigin {
                        life_id: value.id.clone(),
                        place_id: place_id.clone(),
                        sort_order,
                    },
                    SystemTable::LifeOriginPlaces,
                    row_id,
                    Some(entity.clone()),
                )?;
            }
        }
    }
    Ok(())
}
