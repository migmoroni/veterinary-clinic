//! Persists typed system rows through fixed, structurally verified SQLite statements.

use super::*;

pub(crate) fn write_system(
    connection: &mut Connection,
    operations: &[SystemProjectionOperation],
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system projection: {error}"))?;
    let mut journal = ledger.journal();
    for operation in operations {
        let affected = write_system_row(&transaction, &operation.row)?;
        journal.complete_operation(&operation.obligations, affected, operation.event.clone())?;
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system projection: {error}"))?;
    ledger.commit(journal)
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(super) enum SystemInsertCase {
    TaxonomyRegistry,
    TaxonomyTerm,
    ProductTargetTerm,
    ProductVaccineProfileTerm,
    ProductLifeStageTerm,
    ProductTherapeuticScopeTerm,
    GeoPlace,
    Breed,
    BreedOrigin,
    Manufacturer,
    ActiveIngredient,
    Condition,
    Product,
    EntityTaxonomy,
    ProductActiveIngredient,
    ProductTarget,
    ProductVaccineProfile,
    ProductLifeStage,
    ProductTherapeuticScope,
    TreatmentProtocol,
    TreatmentProtocolItem,
    TreatmentProtocolDose,
    SearchTerm,
    MediaReference,
}

impl SystemInsertCase {
    #[cfg(test)]
    pub(super) const ALL: [Self; 24] = [
        Self::TaxonomyRegistry,
        Self::TaxonomyTerm,
        Self::ProductTargetTerm,
        Self::ProductVaccineProfileTerm,
        Self::ProductLifeStageTerm,
        Self::ProductTherapeuticScopeTerm,
        Self::GeoPlace,
        Self::Breed,
        Self::BreedOrigin,
        Self::Manufacturer,
        Self::ActiveIngredient,
        Self::Condition,
        Self::Product,
        Self::EntityTaxonomy,
        Self::ProductActiveIngredient,
        Self::ProductTarget,
        Self::ProductVaccineProfile,
        Self::ProductLifeStage,
        Self::ProductTherapeuticScope,
        Self::TreatmentProtocol,
        Self::TreatmentProtocolItem,
        Self::TreatmentProtocolDose,
        Self::SearchTerm,
        Self::MediaReference,
    ];
}

pub(super) struct SystemInsertStatement {
    pub(super) case: SystemInsertCase,
    pub(super) table: SystemTable,
    pub(super) sql: &'static str,
}

pub(super) fn system_insert_statement(row: &SystemRow) -> Result<SystemInsertStatement, String> {
    let statement = match row {
        SystemRow::TaxonomyRegistry {
            id,
            domain,
            purpose,
        } => {
            let _ = (id, domain, purpose);
            SystemInsertStatement {
                case: SystemInsertCase::TaxonomyRegistry,
                table: SystemTable::TaxonomyRegistry,
                sql: "INSERT INTO taxonomy_registry (id, domain, purpose) VALUES (?1, ?2, ?3)",
            }
        }
        SystemRow::TaxonomyTerm {
            table,
            taxonomy_id,
            term_key,
            parent_term_key,
            label,
            normalized_label,
            aliases_json,
            sort_order,
        } => {
            let _ = (
                taxonomy_id,
                term_key,
                parent_term_key,
                label,
                normalized_label,
                aliases_json,
                sort_order,
            );
            match table {
                SystemTable::TaxonomyTerms => SystemInsertStatement {
                    case: SystemInsertCase::TaxonomyTerm,
                    table: *table,
                    sql: "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                },
                SystemTable::ProductTargetTerms => SystemInsertStatement {
                    case: SystemInsertCase::ProductTargetTerm,
                    table: *table,
                    sql: "INSERT INTO product_target_terms (term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                },
                SystemTable::ProductVaccineProfileTerms => SystemInsertStatement {
                    case: SystemInsertCase::ProductVaccineProfileTerm,
                    table: *table,
                    sql: "INSERT INTO product_vaccine_profile_terms (term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                },
                SystemTable::ProductLifeStageTerms => SystemInsertStatement {
                    case: SystemInsertCase::ProductLifeStageTerm,
                    table: *table,
                    sql: "INSERT INTO product_life_stage_terms (term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                },
                SystemTable::ProductTherapeuticScopeTerms => SystemInsertStatement {
                    case: SystemInsertCase::ProductTherapeuticScopeTerm,
                    table: *table,
                    sql: "INSERT INTO product_therapeutic_scope_terms (term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                },
                _ => {
                    return Err(format!(
                        "invalid taxonomy term destination {}",
                        table.as_str()
                    ));
                }
            }
        }
        SystemRow::GeoPlace {
            id,
            place_type,
            parent_place_id,
            country_codes_json,
            latitude,
            longitude,
            name,
            normalized_name,
            aliases_json,
        } => {
            let _ = (
                id,
                place_type,
                parent_place_id,
                country_codes_json,
                latitude,
                longitude,
                name,
                normalized_name,
                aliases_json,
            );
            SystemInsertStatement { case: SystemInsertCase::GeoPlace, table: SystemTable::GeoPlaces, sql: "INSERT INTO geo_places (id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)" }
        }
        SystemRow::Breed {
            id,
            species_json,
            name,
            normalized_name,
            aliases_json,
            size_term_key,
            average_weight_kg_json,
            average_height_cm_json,
            content_json,
        } => {
            let _ = (
                id,
                species_json,
                name,
                normalized_name,
                aliases_json,
                size_term_key,
                average_weight_kg_json,
                average_height_cm_json,
                content_json,
            );
            SystemInsertStatement { case: SystemInsertCase::Breed, table: SystemTable::BreedReferenceItems, sql: "INSERT INTO breed_reference_items (id, species_json, name, normalized_name, aliases_json, size_term_key, average_weight_kg_json, average_height_cm_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)" }
        }
        SystemRow::BreedOrigin {
            breed_id,
            place_id,
            sort_order,
        } => {
            let _ = (breed_id, place_id, sort_order);
            SystemInsertStatement { case: SystemInsertCase::BreedOrigin, table: SystemTable::BreedOriginPlaces, sql: "INSERT INTO breed_origin_places (breed_id, place_id, sort_order) VALUES (?1, ?2, ?3)" }
        }
        SystemRow::Manufacturer {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            website,
            content_json,
        } => {
            let _ = (
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                website,
                content_json,
            );
            SystemInsertStatement { case: SystemInsertCase::Manufacturer, table: SystemTable::ManufacturerCatalogItems, sql: "INSERT INTO manufacturer_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)" }
        }
        SystemRow::ActiveIngredient {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            nomenclature_json,
            atc_vet_code,
            atc_vet_system,
            denominations_json,
            content_json,
        } => {
            let _ = (
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                nomenclature_json,
                atc_vet_code,
                atc_vet_system,
                denominations_json,
                content_json,
            );
            SystemInsertStatement { case: SystemInsertCase::ActiveIngredient, table: SystemTable::ActiveIngredientCatalogItems, sql: "INSERT INTO active_ingredient_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)" }
        }
        SystemRow::Condition {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            content_json,
        } => {
            let _ = (
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json,
            );
            SystemInsertStatement { case: SystemInsertCase::Condition, table: SystemTable::ConditionCatalogItems, sql: "INSERT INTO condition_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)" }
        }
        SystemRow::Product {
            id,
            type_term_key,
            name,
            normalized_name,
            species_json,
            aliases_json,
            manufacturer_id,
            regions_json,
            regulatory_identifiers_json,
            commercial_line,
            presentation_dosage,
            target_species_warnings_json,
            content_json,
        } => {
            let _ = (
                id,
                type_term_key,
                name,
                normalized_name,
                species_json,
                aliases_json,
                manufacturer_id,
                regions_json,
                regulatory_identifiers_json,
                commercial_line,
                presentation_dosage,
                target_species_warnings_json,
                content_json,
            );
            SystemInsertStatement { case: SystemInsertCase::Product, table: SystemTable::ProductCatalogItems, sql: "INSERT INTO product_catalog_items (id, type_term_key, name, normalized_name, species_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)" }
        }
        SystemRow::EntityTaxonomy {
            entity_type,
            entity_id,
            taxonomy_id,
            term_key,
            relation_kind,
            sort_order,
        } => {
            let _ = (
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                relation_kind,
                sort_order,
            );
            SystemInsertStatement { case: SystemInsertCase::EntityTaxonomy, table: SystemTable::EntityTaxonomyTerms, sql: "INSERT INTO entity_taxonomy_terms (entity_type, entity_id, taxonomy_id, term_key, relation_kind, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)" }
        }
        SystemRow::ProductActiveIngredient {
            product_id,
            active_ingredient_id,
            sort_order,
        } => {
            let _ = (product_id, active_ingredient_id, sort_order);
            SystemInsertStatement { case: SystemInsertCase::ProductActiveIngredient, table: SystemTable::ProductActiveIngredients, sql: "INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)" }
        }
        SystemRow::ProductTerm {
            table,
            product_id,
            term_key,
            sort_order,
        } => {
            let _ = (product_id, term_key, sort_order);
            match table {
                SystemTable::ProductTargets => SystemInsertStatement { case: SystemInsertCase::ProductTarget, table: *table, sql: "INSERT INTO product_targets (product_id, term_key, sort_order) VALUES (?1, ?2, ?3)" },
                SystemTable::ProductVaccineProfiles => SystemInsertStatement { case: SystemInsertCase::ProductVaccineProfile, table: *table, sql: "INSERT INTO product_vaccine_profiles (product_id, term_key, sort_order) VALUES (?1, ?2, ?3)" },
                SystemTable::ProductLifeStages => SystemInsertStatement { case: SystemInsertCase::ProductLifeStage, table: *table, sql: "INSERT INTO product_life_stages (product_id, term_key, sort_order) VALUES (?1, ?2, ?3)" },
                SystemTable::ProductTherapeuticScopes => SystemInsertStatement { case: SystemInsertCase::ProductTherapeuticScope, table: *table, sql: "INSERT INTO product_therapeutic_scopes (product_id, term_key, sort_order) VALUES (?1, ?2, ?3)" },
                _ => return Err(format!("invalid product term destination {}", table.as_str())),
            }
        }
        SystemRow::TreatmentProtocol {
            id,
            kind,
            name,
            normalized_name,
            species_json,
            observation,
        } => {
            let _ = (id, kind, name, normalized_name, species_json, observation);
            SystemInsertStatement { case: SystemInsertCase::TreatmentProtocol, table: SystemTable::TreatmentProtocols, sql: "INSERT INTO treatment_protocols (id, kind, name, normalized_name, species_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)" }
        }
        SystemRow::TreatmentProtocolItem {
            protocol_id,
            product_id,
            sort_order,
        } => {
            let _ = (protocol_id, product_id, sort_order);
            SystemInsertStatement { case: SystemInsertCase::TreatmentProtocolItem, table: SystemTable::TreatmentProtocolItems, sql: "INSERT INTO treatment_protocol_items (protocol_id, product_id, sort_order) VALUES (?1, ?2, ?3)" }
        }
        SystemRow::TreatmentProtocolDose {
            protocol_id,
            dose_id,
            label,
            validity_value,
            validity_unit,
            sort_order,
        } => {
            let _ = (
                protocol_id,
                dose_id,
                label,
                validity_value,
                validity_unit,
                sort_order,
            );
            SystemInsertStatement { case: SystemInsertCase::TreatmentProtocolDose, table: SystemTable::TreatmentProtocolDoses, sql: "INSERT INTO treatment_protocol_doses (protocol_id, dose_id, label, validity_value, validity_unit, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)" }
        }
        SystemRow::SearchTerm {
            entity_type,
            entity_id,
            value,
            normalized_value,
            provenance,
            sort_order,
        } => {
            let _ = (
                entity_type,
                entity_id,
                value,
                normalized_value,
                provenance,
                sort_order,
            );
            SystemInsertStatement { case: SystemInsertCase::SearchTerm, table: SystemTable::EntitySearchTerms, sql: "INSERT INTO entity_search_terms (entity_type, entity_id, value, normalized_value, provenance, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)" }
        }
        SystemRow::MediaReference {
            entity_type,
            entity_id,
            role,
            media_key,
            sort_order,
        } => {
            let _ = (entity_type, entity_id, role, media_key, sort_order);
            SystemInsertStatement { case: SystemInsertCase::MediaReference, table: SystemTable::EntityMediaReferences, sql: "INSERT INTO entity_media_references (entity_type, entity_id, role, media_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)" }
        }
    };
    Ok(statement)
}

fn write_system_row(transaction: &Transaction<'_>, row: &SystemRow) -> Result<usize, String> {
    let statement = system_insert_statement(row)?;
    let _ = (statement.case, statement.table);
    match row {
        SystemRow::TaxonomyRegistry {
            id,
            domain,
            purpose,
        } => transaction.execute(statement.sql, params![id, domain, purpose]),
        SystemRow::TaxonomyTerm {
            table,
            taxonomy_id,
            term_key,
            parent_term_key,
            label,
            normalized_label,
            aliases_json,
            sort_order,
        } => match table {
            SystemTable::TaxonomyTerms => transaction.execute(
                statement.sql,
                params![
                    taxonomy_id,
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order
                ],
            ),
            SystemTable::ProductTargetTerms
            | SystemTable::ProductVaccineProfileTerms
            | SystemTable::ProductLifeStageTerms
            | SystemTable::ProductTherapeuticScopeTerms => transaction.execute(
                statement.sql,
                params![
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order
                ],
            ),
            _ => {
                return Err(format!(
                    "invalid taxonomy term destination {}",
                    table.as_str()
                ))
            }
        },
        SystemRow::GeoPlace {
            id,
            place_type,
            parent_place_id,
            country_codes_json,
            latitude,
            longitude,
            name,
            normalized_name,
            aliases_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                place_type,
                parent_place_id,
                country_codes_json,
                latitude,
                longitude,
                name,
                normalized_name,
                aliases_json
            ],
        ),
        SystemRow::Breed {
            id,
            species_json,
            name,
            normalized_name,
            aliases_json,
            size_term_key,
            average_weight_kg_json,
            average_height_cm_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                species_json,
                name,
                normalized_name,
                aliases_json,
                size_term_key,
                average_weight_kg_json,
                average_height_cm_json,
                content_json
            ],
        ),
        SystemRow::BreedOrigin {
            breed_id,
            place_id,
            sort_order,
        } => transaction.execute(statement.sql, params![breed_id, place_id, sort_order]),
        SystemRow::Manufacturer {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            website,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                website,
                content_json
            ],
        ),
        SystemRow::ActiveIngredient {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            nomenclature_json,
            atc_vet_code,
            atc_vet_system,
            denominations_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                nomenclature_json,
                atc_vet_code,
                atc_vet_system,
                denominations_json,
                content_json
            ],
        ),
        SystemRow::Condition {
            id,
            type_term_key,
            name,
            normalized_name,
            aliases_json,
            regions_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json
            ],
        ),
        SystemRow::Product {
            id,
            type_term_key,
            name,
            normalized_name,
            species_json,
            aliases_json,
            manufacturer_id,
            regions_json,
            regulatory_identifiers_json,
            commercial_line,
            presentation_dosage,
            target_species_warnings_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                type_term_key,
                name,
                normalized_name,
                species_json,
                aliases_json,
                manufacturer_id,
                regions_json,
                regulatory_identifiers_json,
                commercial_line,
                presentation_dosage,
                target_species_warnings_json,
                content_json
            ],
        ),
        SystemRow::EntityTaxonomy {
            entity_type,
            entity_id,
            taxonomy_id,
            term_key,
            relation_kind,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                relation_kind,
                sort_order
            ],
        ),
        SystemRow::ProductActiveIngredient {
            product_id,
            active_ingredient_id,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![product_id, active_ingredient_id, sort_order],
        ),
        SystemRow::ProductTerm {
            table,
            product_id,
            term_key,
            sort_order,
        } => {
            let _ = table;
            transaction.execute(statement.sql, params![product_id, term_key, sort_order])
        }
        SystemRow::TreatmentProtocol {
            id,
            kind,
            name,
            normalized_name,
            species_json,
            observation,
        } => transaction.execute(
            statement.sql,
            params![id, kind, name, normalized_name, species_json, observation],
        ),
        SystemRow::TreatmentProtocolItem {
            protocol_id,
            product_id,
            sort_order,
        } => transaction.execute(statement.sql, params![protocol_id, product_id, sort_order]),
        SystemRow::TreatmentProtocolDose {
            protocol_id,
            dose_id,
            label,
            validity_value,
            validity_unit,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![
                protocol_id,
                dose_id,
                label,
                validity_value,
                validity_unit,
                sort_order
            ],
        ),
        SystemRow::SearchTerm {
            entity_type,
            entity_id,
            value,
            normalized_value,
            provenance,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![
                entity_type,
                entity_id,
                value,
                normalized_value,
                provenance,
                sort_order
            ],
        ),
        SystemRow::MediaReference {
            entity_type,
            entity_id,
            role,
            media_key,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![entity_type, entity_id, role, media_key, sort_order],
        ),
    }
    .map_err(|error| format!("cannot persist {} operation: {error}", row.table().as_str()))
}
