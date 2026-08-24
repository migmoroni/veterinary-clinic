use super::contract::{
    MetadataOperation, MetadataRow, SystemMediaProjectionOperation, SystemProjectionOperation,
    SystemRow,
};
use crate::{
    databases::DatabaseKind,
    ledger::{ProjectionLedger, SystemTable},
};
use rusqlite::{params, Connection, Transaction};

pub(crate) fn write_metadata(
    connection: &Connection,
    database: DatabaseKind,
    operations: &[MetadataOperation],
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let mut journal = ledger.journal();
    for operation in operations
        .iter()
        .filter(|operation| operation.database == database)
    {
        let affected = match &operation.row {
            MetadataRow::Build {
                build_version,
                builder_version,
                build_result_schema_version,
                source_digest,
                locale,
            } => connection.execute(
                "INSERT INTO knowledge_build_metadata (singleton, build_version, builder_version, build_result_schema_version, source_digest_sha256, locale) VALUES (1, ?1, ?2, ?3, ?4, ?5)",
                params![build_version, builder_version, build_result_schema_version, source_digest, locale],
            ),
            MetadataRow::Release {
                release_id,
                generation,
                revision,
                locale,
            } => connection.execute(
                "INSERT INTO knowledge_release_metadata (singleton, release_id, generation, revision, locale) VALUES (1, ?1, ?2, ?3, ?4)",
                params![release_id, generation, revision, locale],
            ),
        }
        .map_err(|error| format!("cannot persist metadata operation: {error}"))?;
        journal.complete_operation(&operation.obligations, affected, operation.event.clone())?;
    }
    ledger.commit(journal)
}

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
enum SystemInsertCase {
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
    const ALL: [Self; 24] = [
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

struct SystemInsertStatement {
    case: SystemInsertCase,
    table: SystemTable,
    sql: &'static str,
}

fn system_insert_statement(row: &SystemRow) -> Result<SystemInsertStatement, String> {
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

pub(crate) fn write_system_media(
    connection: &mut Connection,
    operations: &[SystemMediaProjectionOperation],
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system_media projection: {error}"))?;
    let mut journal = ledger.journal();
    for operation in operations {
        let row = &operation.row;
        let affected = transaction.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![row.media_key, row.content_hash, row.thumbnail, row.thumbnail_mime_type,
                row.thumbnail_width, row.thumbnail_height, row.mime_type, row.size_bytes, row.width, row.height],
        ).map_err(|error| format!("cannot persist media asset {}: {error}", row.media_key))?;
        journal.complete_operation(&operation.obligations, affected, operation.event.clone())?;
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system_media projection: {error}"))?;
    ledger.commit(journal)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ledger::SystemColumn;
    use std::collections::BTreeSet;

    struct ParsedInsert<'a> {
        table: &'a str,
        columns: Vec<SystemColumn>,
    }

    fn parse_insert(sql: &str) -> Result<ParsedInsert<'_>, String> {
        let body = sql
            .strip_prefix("INSERT INTO ")
            .ok_or_else(|| "INSERT must start with INSERT INTO".to_string())?;
        let (table, remainder) = body
            .split_once(" (")
            .ok_or_else(|| "INSERT must declare a table and columns".to_string())?;
        if table.is_empty() {
            return Err("INSERT table cannot be empty".to_string());
        }
        let (columns, values) = remainder
            .split_once(") VALUES (")
            .ok_or_else(|| "INSERT must use the fixed columns/VALUES form".to_string())?;
        let values = values
            .strip_suffix(')')
            .ok_or_else(|| "INSERT VALUES must end with a closing parenthesis".to_string())?;
        if columns.is_empty() {
            return Err("INSERT columns cannot be empty".to_string());
        }

        let mut observed = BTreeSet::new();
        let mut parsed = Vec::new();
        for name in columns.split(", ") {
            let column = SystemColumn::ALL
                .into_iter()
                .find(|column| column.as_str() == name)
                .ok_or_else(|| format!("unknown SystemColumn {name}"))?;
            if !observed.insert(column) {
                return Err(format!("repeated SystemColumn {name}"));
            }
            parsed.push(column);
        }

        let parameters = values.split(", ").collect::<Vec<_>>();
        if parameters.len() != parsed.len()
            || parameters
                .iter()
                .enumerate()
                .any(|(index, value)| *value != format!("?{}", index + 1))
        {
            return Err("INSERT parameters do not match the ordered columns".to_string());
        }
        Ok(ParsedInsert {
            table,
            columns: parsed,
        })
    }

    fn validate_statement(
        row: &SystemRow,
        statement: &SystemInsertStatement,
    ) -> Result<BTreeSet<SystemColumn>, String> {
        let parsed = parse_insert(statement.sql)?;
        if parsed.table != statement.table.as_str() {
            return Err(format!(
                "SQL table {} differs from descriptor table {}",
                parsed.table,
                statement.table.as_str()
            ));
        }
        if statement.table != row.table() {
            return Err(format!(
                "descriptor table {} differs from payload table {}",
                statement.table.as_str(),
                row.table().as_str()
            ));
        }
        let columns = parsed.columns.into_iter().collect::<BTreeSet<_>>();
        if columns != row.materialized_columns() {
            return Err(format!(
                "SQL columns differ from payload columns for {:?}",
                statement.case
            ));
        }
        Ok(columns)
    }

    fn taxonomy_term(table: SystemTable, marker: &str) -> SystemRow {
        SystemRow::TaxonomyTerm {
            table,
            taxonomy_id: (table == SystemTable::TaxonomyTerms)
                .then(|| format!("taxonomy-{marker}")),
            term_key: format!("term-{marker}"),
            parent_term_key: Some(format!("parent-{marker}")),
            label: format!("Label {marker}"),
            normalized_label: format!("label {marker}"),
            aliases_json: format!(r#"["alias-{marker}"]"#),
            sort_order: 10,
        }
    }

    fn product_term(table: SystemTable, marker: &str) -> SystemRow {
        SystemRow::ProductTerm {
            table,
            product_id: format!("product-{marker}"),
            term_key: format!("term-{marker}"),
            sort_order: 20,
        }
    }

    fn representative_row(case: SystemInsertCase) -> SystemRow {
        match case {
            SystemInsertCase::TaxonomyRegistry => SystemRow::TaxonomyRegistry {
                id: "taxonomy-registry".to_string(),
                domain: "product".to_string(),
                purpose: "target".to_string(),
            },
            SystemInsertCase::TaxonomyTerm => taxonomy_term(SystemTable::TaxonomyTerms, "taxonomy"),
            SystemInsertCase::ProductTargetTerm => {
                taxonomy_term(SystemTable::ProductTargetTerms, "target")
            }
            SystemInsertCase::ProductVaccineProfileTerm => {
                taxonomy_term(SystemTable::ProductVaccineProfileTerms, "vaccine-profile")
            }
            SystemInsertCase::ProductLifeStageTerm => {
                taxonomy_term(SystemTable::ProductLifeStageTerms, "life-stage")
            }
            SystemInsertCase::ProductTherapeuticScopeTerm => taxonomy_term(
                SystemTable::ProductTherapeuticScopeTerms,
                "therapeutic-scope",
            ),
            SystemInsertCase::GeoPlace => SystemRow::GeoPlace {
                id: "place-br".to_string(),
                place_type: "country".to_string(),
                parent_place_id: None,
                country_codes_json: r#"["BR"]"#.to_string(),
                latitude: Some(-15.8),
                longitude: Some(-47.9),
                name: "Brasil".to_string(),
                normalized_name: "brasil".to_string(),
                aliases_json: r#"["Brazil"]"#.to_string(),
            },
            SystemInsertCase::Breed => SystemRow::Breed {
                id: "breed-one".to_string(),
                species_json: r#"["dog"]"#.to_string(),
                name: "Breed One".to_string(),
                normalized_name: "breed one".to_string(),
                aliases_json: "[]".to_string(),
                size_term_key: "medium".to_string(),
                average_weight_kg_json: r#"{"min":10,"max":20}"#.to_string(),
                average_height_cm_json: r#"{"min":30,"max":40}"#.to_string(),
                content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
            },
            SystemInsertCase::BreedOrigin => SystemRow::BreedOrigin {
                breed_id: "breed-one".to_string(),
                place_id: "place-br".to_string(),
                sort_order: 30,
            },
            SystemInsertCase::Manufacturer => SystemRow::Manufacturer {
                id: "manufacturer-one".to_string(),
                type_term_key: "laboratory".to_string(),
                name: "Manufacturer One".to_string(),
                normalized_name: "manufacturer one".to_string(),
                aliases_json: "[]".to_string(),
                regions_json: r#"["BR"]"#.to_string(),
                website: Some("https://example.test".to_string()),
                content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
            },
            SystemInsertCase::ActiveIngredient => SystemRow::ActiveIngredient {
                id: "ingredient-one".to_string(),
                type_term_key: "compound".to_string(),
                name: "Ingredient One".to_string(),
                normalized_name: "ingredient one".to_string(),
                aliases_json: "[]".to_string(),
                regions_json: r#"["BR"]"#.to_string(),
                nomenclature_json: r#"{"standards":["inn"]}"#.to_string(),
                atc_vet_code: Some("QA01".to_string()),
                atc_vet_system: Some("ATCvet".to_string()),
                denominations_json: r#"{"inn":"Ingredient One"}"#.to_string(),
                content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
            },
            SystemInsertCase::Condition => SystemRow::Condition {
                id: "condition-one".to_string(),
                type_term_key: "clinical".to_string(),
                name: "Condition One".to_string(),
                normalized_name: "condition one".to_string(),
                aliases_json: "[]".to_string(),
                regions_json: r#"["BR"]"#.to_string(),
                content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
            },
            SystemInsertCase::Product => SystemRow::Product {
                id: "product-one".to_string(),
                type_term_key: "medicine".to_string(),
                name: "Product One".to_string(),
                normalized_name: "product one".to_string(),
                species_json: r#"["dog"]"#.to_string(),
                aliases_json: "[]".to_string(),
                manufacturer_id: "manufacturer-one".to_string(),
                regions_json: r#"["BR"]"#.to_string(),
                regulatory_identifiers_json: r#"{"BR":"123"}"#.to_string(),
                commercial_line: Some("Companion".to_string()),
                presentation_dosage: Some("10 mg".to_string()),
                target_species_warnings_json: "[]".to_string(),
                content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
            },
            SystemInsertCase::EntityTaxonomy => SystemRow::EntityTaxonomy {
                entity_type: "product".to_string(),
                entity_id: "product-one".to_string(),
                taxonomy_id: "taxonomy-one".to_string(),
                term_key: "term-one".to_string(),
                relation_kind: "classification".to_string(),
                sort_order: 40,
            },
            SystemInsertCase::ProductActiveIngredient => SystemRow::ProductActiveIngredient {
                product_id: "product-one".to_string(),
                active_ingredient_id: "ingredient-one".to_string(),
                sort_order: 50,
            },
            SystemInsertCase::ProductTarget => product_term(SystemTable::ProductTargets, "target"),
            SystemInsertCase::ProductVaccineProfile => {
                product_term(SystemTable::ProductVaccineProfiles, "vaccine-profile")
            }
            SystemInsertCase::ProductLifeStage => {
                product_term(SystemTable::ProductLifeStages, "life-stage")
            }
            SystemInsertCase::ProductTherapeuticScope => {
                product_term(SystemTable::ProductTherapeuticScopes, "therapeutic-scope")
            }
            SystemInsertCase::TreatmentProtocol => SystemRow::TreatmentProtocol {
                id: "protocol-one".to_string(),
                kind: "treatment".to_string(),
                name: "Protocol One".to_string(),
                normalized_name: "protocol one".to_string(),
                species_json: r#"["dog"]"#.to_string(),
                observation: Some("Observe".to_string()),
            },
            SystemInsertCase::TreatmentProtocolItem => SystemRow::TreatmentProtocolItem {
                protocol_id: "protocol-one".to_string(),
                product_id: "product-one".to_string(),
                sort_order: 60,
            },
            SystemInsertCase::TreatmentProtocolDose => SystemRow::TreatmentProtocolDose {
                protocol_id: "protocol-one".to_string(),
                dose_id: "dose-one".to_string(),
                label: "Daily".to_string(),
                validity_value: 7,
                validity_unit: "day".to_string(),
                sort_order: 70,
            },
            SystemInsertCase::SearchTerm => SystemRow::SearchTerm {
                entity_type: "product".to_string(),
                entity_id: "product-one".to_string(),
                value: "Product One".to_string(),
                normalized_value: "product one".to_string(),
                provenance: "name".to_string(),
                sort_order: 80,
            },
            SystemInsertCase::MediaReference => SystemRow::MediaReference {
                entity_type: "product".to_string(),
                entity_id: "product-one".to_string(),
                role: "cover".to_string(),
                media_key: "product/product-one/cover".to_string(),
                sort_order: 90,
            },
        }
    }

    #[test]
    fn every_system_insert_matches_its_payload_table_and_columns() {
        let mut observed_cases = BTreeSet::new();
        let mut observed_columns = BTreeSet::new();

        for expected_case in SystemInsertCase::ALL {
            let row = representative_row(expected_case);
            let statement = system_insert_statement(&row).unwrap();
            assert_eq!(statement.case, expected_case);
            assert!(
                observed_cases.insert(statement.case),
                "duplicate insert case {:?}",
                statement.case
            );
            observed_columns.extend(validate_statement(&row, &statement).unwrap());
        }

        assert_eq!(
            observed_cases,
            SystemInsertCase::ALL.into_iter().collect::<BTreeSet<_>>()
        );
        assert_eq!(
            observed_columns,
            SystemColumn::ALL.into_iter().collect::<BTreeSet<_>>()
        );
    }

    #[test]
    fn structural_insert_reader_rejects_invalid_columns_and_shape() {
        assert!(parse_insert("UPDATE taxonomy_registry SET domain = ?1").is_err());
        assert!(parse_insert("INSERT INTO  (id) VALUES (?1)").is_err());
        assert!(parse_insert("INSERT INTO taxonomy_registry () VALUES ()").is_err());
        assert!(
            parse_insert("INSERT INTO taxonomy_registry (id, unknown_column) VALUES (?1, ?2)")
                .is_err()
        );
        assert!(parse_insert("INSERT INTO taxonomy_registry (id, id) VALUES (?1, ?2)").is_err());

        let row = representative_row(SystemInsertCase::TaxonomyRegistry);
        let extra_column = SystemInsertStatement {
            case: SystemInsertCase::TaxonomyRegistry,
            table: SystemTable::TaxonomyRegistry,
            sql:
                "INSERT INTO taxonomy_registry (id, domain, purpose, label) VALUES (?1, ?2, ?3, ?4)",
        };
        assert!(validate_statement(&row, &extra_column).is_err());

        assert!(
            system_insert_statement(&taxonomy_term(SystemTable::GeoPlaces, "invalid")).is_err()
        );
        assert!(
            system_insert_statement(&product_term(SystemTable::TaxonomyTerms, "invalid")).is_err()
        );
    }
}
