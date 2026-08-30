//! Declares the closed obligation matrix for every canonical entity variant and
//! routes repeated authoring patterns through shared ledger helpers.

use super::{
    obligation_helpers::*,
    ownership::{ObligationOwnership, OperationDisposition},
    CompilationOperationId, ObligationClass, ProjectionOperationId, ProjectionTarget, SourceToken,
    SystemColumn, SystemTable,
};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    source::CanonicalEntity,
    validation::{ValidatedEntity, ValidatedSource},
};

pub(super) fn add_entity_obligations(
    expected: &mut ObligationOwnership,
    source: &ValidatedSource,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    let main = main_row_target(&entry.source.entity);
    insert_obligation(
        expected,
        main.clone(),
        SourceToken::Entity(entity.clone()),
        ObligationClass::Entity,
    )?;
    field(
        expected,
        &entity,
        "entityType",
        canonical_validation_target(&entity, locale, "entity_type"),
        ObligationClass::Authoring,
    )?;
    match &entry.source.entity {
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
            let _ = (schema_version, id, manufacturer_id);
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            let type_taxonomy = taxonomy_id(source, "product", "type")?;
            let classification_taxonomy = taxonomy_id(source, "product", "classification")?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, type_taxonomy, key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, classification_taxonomy, key),
            )?;
            relations(
                expected,
                &entity,
                "applicableTaxonIds",
                applicable_taxon_ids,
                |_, _| main.column(SystemColumn::ApplicableTaxonIdsJson),
            )?;
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            field(
                expected,
                &entity,
                "manufacturerId",
                main.column(SystemColumn::ManufacturerId),
                ObligationClass::Relation,
            )?;
            relations(
                expected,
                &entity,
                "activeIngredientIds",
                active_ingredient_ids,
                |_, id| {
                    table_row(
                        DatabaseKind::System,
                        SystemTable::ProductActiveIngredients,
                        format!("{}/{id}", entity.id),
                    )
                },
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.brazilMapa",
                regulatory_identifiers.brazil_mapa.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesNada",
                regulatory_identifiers.united_states_nada.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesAnada",
                regulatory_identifiers.united_states_anada.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.gtinEan",
                regulatory_identifiers.gtin_ean.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            for (purpose, field_name, values) in [
                ("target", "targetTermKeys", target_term_keys.as_deref()),
                (
                    "vaccine_profile",
                    "vaccineProfileTermKeys",
                    vaccine_profile_term_keys.as_deref(),
                ),
                (
                    "life_stage",
                    "lifeStageTermKeys",
                    life_stage_term_keys.as_deref(),
                ),
                (
                    "therapeutic_scope",
                    "therapeuticScopeTermKeys",
                    therapeutic_scope_term_keys.as_deref(),
                ),
            ] {
                let taxonomy = taxonomy_id(source, "product", purpose)?;
                relations(
                    expected,
                    &entity,
                    field_name,
                    values.unwrap_or(&[]),
                    |_, key| taxonomy_row(&entity, taxonomy, key),
                )?;
            }
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
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
            let _ = (schema_version, id);
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            let type_taxonomy = taxonomy_id(source, "manufacturer", "type")?;
            let classification_taxonomy = taxonomy_id(source, "manufacturer", "classification")?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, type_taxonomy, key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, classification_taxonomy, key),
            )?;
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "website",
                website.as_ref(),
                main.column(SystemColumn::Website),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
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
            let _ = (schema_version, id);
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            let type_taxonomy = taxonomy_id(source, "active_ingredient", "type")?;
            let classification_taxonomy =
                taxonomy_id(source, "active_ingredient", "classification")?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, type_taxonomy, key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, classification_taxonomy, key),
            )?;
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.scientificName",
                nomenclature.scientific_name.as_ref(),
                main.column(SystemColumn::NomenclatureJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.casNumber",
                nomenclature.cas_number.as_ref(),
                main.column(SystemColumn::NomenclatureJson),
            )?;
            fields(
                expected,
                &entity,
                "nomenclature.denominationStandards",
                &nomenclature.denomination_standards,
                main.column(SystemColumn::NomenclatureJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "atcVetCode",
                atc_vet_code.as_ref(),
                main.column(SystemColumn::AtcVetCode),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
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
            let _ = (schema_version, id);
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            let type_taxonomy = taxonomy_id(source, "condition", "type")?;
            let classification_taxonomy = taxonomy_id(source, "condition", "classification")?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, type_taxonomy, key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, classification_taxonomy, key),
            )?;
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Life(value) => {
            let crate::source::LifeEntity {
                schema_version,
                id,
                taxonomy,
                classifications,
                localized_content,
                sections,
                content_path,
                media,
            } = &**value;
            let _ = (schema_version, id);
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            for (index, value) in taxonomy.positions().iter().enumerate() {
                if value.is_some() {
                    field(
                        expected,
                        &entity,
                        &format!(
                            "taxonomy.{}",
                            [
                                "domain", "kingdom", "phylum", "class", "order", "family", "genus",
                                "species", "breed", "variety"
                            ][index]
                        ),
                        main.column(
                            [
                                SystemColumn::DomainId,
                                SystemColumn::KingdomId,
                                SystemColumn::PhylumId,
                                SystemColumn::ClassId,
                                SystemColumn::OrderId,
                                SystemColumn::FamilyId,
                                SystemColumn::GenusId,
                                SystemColumn::SpeciesId,
                                SystemColumn::BreedId,
                                SystemColumn::VarietyId,
                            ][index],
                        ),
                        ObligationClass::Relation,
                    )?;
                }
            }
            if let Some(classifications) = classifications {
                if let Some(origins) = &classifications.origin_place_ids {
                    relations(
                        expected,
                        &entity,
                        "classifications.originPlaceIds",
                        origins,
                        |_, id| {
                            table_row(
                                DatabaseKind::System,
                                SystemTable::LifeOriginPlaces,
                                format!("{}/{id}", entity.id),
                            )
                        },
                    )?;
                }
                if let Some(body) = &classifications.body_metrics {
                    if body.size.is_some() {
                        field(
                            expected,
                            &entity,
                            "classifications.bodyMetrics.size",
                            main.column(SystemColumn::SizeTermKey),
                            ObligationClass::Relation,
                        )?;
                    }
                    optional_fields(
                        expected,
                        &entity,
                        "classifications.bodyMetrics.stageMetrics",
                        body.stage_metrics.as_ref(),
                        main.column(SystemColumn::StageMetricsJson),
                    )?;
                }
            }
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::GeoPlace(value) => {
            let crate::source::GeoPlaceEntity {
                schema_version,
                id,
                place_type,
                country_codes,
                parent_place_id,
                centroid,
                localized_content,
            } = value;
            let _ = (schema_version, id, place_type);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "placeType",
                main.column(SystemColumn::PlaceType),
                ObligationClass::Authoring,
            )?;
            fields(
                expected,
                &entity,
                "countryCodes",
                country_codes,
                main.column(SystemColumn::CountryCodesJson),
            )?;
            if parent_place_id.is_some() {
                field(
                    expected,
                    &entity,
                    "parentPlaceId",
                    main.column(SystemColumn::ParentPlaceId),
                    ObligationClass::Relation,
                )?;
            }
            optional_fields(
                expected,
                &entity,
                "centroid.latitude",
                centroid.latitude.as_ref(),
                main.column(SystemColumn::Latitude),
            )?;
            optional_fields(
                expected,
                &entity,
                "centroid.longitude",
                centroid.longitude.as_ref(),
                main.column(SystemColumn::Longitude),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
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
            let _ = (schema_version, id, kind);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "kind",
                main.column(SystemColumn::Kind),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "applicableTaxonIds",
                applicable_taxon_ids,
                |_, _| main.column(SystemColumn::ApplicableTaxonIdsJson),
            )?;
            relations(expected, &entity, "productIds", product_ids, |_, id| {
                table_row(
                    DatabaseKind::System,
                    SystemTable::TreatmentProtocolItems,
                    format!("{}/{id}", entity.id),
                )
            })?;
            for (position, dose) in doses.iter().enumerate() {
                let row = table_row(
                    DatabaseKind::System,
                    SystemTable::TreatmentProtocolDoses,
                    format!("{}/{}", entity.id, dose.id),
                );
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.id"),
                    row.column(SystemColumn::DoseId),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityValue"),
                    row.column(SystemColumn::ValidityValue),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityUnit"),
                    row.column(SystemColumn::ValidityUnit),
                    ObligationClass::Authoring,
                )?;
                localized_with_prefix(
                    expected,
                    &entity,
                    &dose.localized_content,
                    locale,
                    row,
                    &format!("doses.{position}.localizedContent"),
                )?;
            }
            localized(expected, &entity, localized_content, locale, main.clone())?;
        }
        CanonicalEntity::Taxonomy(value) => {
            let crate::source::TaxonomyEntity {
                schema_version,
                id,
                domain,
                purpose,
                terms,
            } = value;
            let _ = (schema_version, id, domain, purpose);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "domain",
                main.column(SystemColumn::Domain),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "purpose",
                main.column(SystemColumn::Purpose),
                ObligationClass::Authoring,
            )?;
            for (position, term) in terms.iter().enumerate() {
                let row = table_row(
                    DatabaseKind::System,
                    SystemTable::TaxonomyTerms,
                    format!("{}/{}", entity.id, term.key),
                );
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.key"),
                    row.column(SystemColumn::TermKey),
                    ObligationClass::Authoring,
                )?;
                if term.parent_key.is_some() {
                    field(
                        expected,
                        &entity,
                        &format!("terms.{position}.parentKey"),
                        row.column(SystemColumn::ParentTermKey),
                        ObligationClass::Relation,
                    )?;
                }
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.order"),
                    row.column(SystemColumn::SortOrder),
                    ObligationClass::Authoring,
                )?;
                localized_with_prefix(
                    expected,
                    &entity,
                    &term.localized_content,
                    locale,
                    row,
                    &format!("terms.{position}.localizedContent"),
                )?;
            }
        }
    }
    for (document_locale, document) in &entry.editorial {
        if *document_locale != locale {
            continue;
        }
        insert_obligation(
            expected,
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Document {
                    entity: entity.clone(),
                }),
                target: ProjectionTarget::CompiledDocument {
                    entity: entity.clone(),
                    locale,
                },
            },
            SourceToken::Document {
                entity: entity.clone(),
                locale,
            },
            ObligationClass::Authoring,
        )?;
        for section in &document.sections {
            insert_obligation(
                expected,
                OperationDisposition {
                    owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                        entity: entity.clone(),
                        section_key: section.section_key.clone(),
                    }),
                    target: ProjectionTarget::CompiledSection {
                        entity: entity.clone(),
                        locale,
                        section_key: section.section_key.clone(),
                    },
                },
                SourceToken::Section {
                    entity: entity.clone(),
                    locale,
                    section_key: section.section_key.clone(),
                },
                ObligationClass::LocalizedContent,
            )?;
        }
    }
    for reference in entry.markdown_media.get(&locale).into_iter().flatten() {
        insert_obligation(
            expected,
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                    entity: entity.clone(),
                    section_key: reference.section_key.clone(),
                }),
                target: ProjectionTarget::CompiledSection {
                    entity: entity.clone(),
                    locale,
                    section_key: reference.section_key.clone(),
                },
            },
            SourceToken::MarkdownMediaReference {
                entity: entity.clone(),
                locale,
                section_key: reference.section_key.clone(),
                occurrence: reference.occurrence,
                media_key: reference.media_key.clone(),
            },
            ObligationClass::Media,
        )?;
    }
    Ok(())
}
