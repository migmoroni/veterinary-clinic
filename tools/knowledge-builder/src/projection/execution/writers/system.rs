//! Persists typed system rows through fixed, structurally verified SQLite statements.

use super::metadata::write_metadata;
use super::{
    database_path, params, preserve_deterministic_write_epochs, ConfirmedReceiptBatch, Connection,
    DatabaseError, DatabaseKind, MetadataOperation, PendingReceipt, ProjectionEvent,
    SystemProjectionOperation, SystemRow, SystemRowCase, SystemRowDescriptor, SystemTable,
    Transaction,
};

pub(crate) fn write_system(
    connection: &mut Connection,
    metadata: &[MetadataOperation],
    operations: &[SystemProjectionOperation],
) -> Result<ConfirmedReceiptBatch, DatabaseError> {
    let path = database_path(connection);
    let transaction = connection
        .transaction()
        .map_err(|source| DatabaseError::Sqlite {
            database: path.clone(),
            operation: "begin system transaction",
            source: Box::new(source),
        })?;
    let mut pending = write_metadata(&transaction, DatabaseKind::System, metadata)?;
    for operation in operations {
        let affected = write_system_row(&transaction, &operation.row)?;
        pending.push(
            PendingReceipt::new(
                operation.id(),
                operation.obligations.clone(),
                ProjectionEvent::SqliteRow(operation.event.clone()),
                affected,
            )
            .map_err(|source| DatabaseError::Contract {
                database: path.clone(),
                operation: "confirm system receipt",
                source: Box::new(source),
            })?,
        );
    }
    transaction
        .commit()
        .map_err(|source| DatabaseError::Sqlite {
            database: path.clone(),
            operation: "commit system transaction",
            source: Box::new(source),
        })?;
    preserve_deterministic_write_epochs(
        connection,
        DatabaseKind::System,
        metadata
            .iter()
            .filter(|operation| operation.database == DatabaseKind::System)
            .count(),
        !operations.is_empty(),
    )?;
    ConfirmedReceiptBatch::confirm(pending).map_err(|source| DatabaseError::Contract {
        database: path,
        operation: "confirm system receipt batch",
        source: Box::new(source),
    })
}

pub(super) struct SystemInsertStatement {
    pub(super) case: SystemRowCase,
    pub(super) table: SystemTable,
    pub(super) sql: &'static str,
}

pub(super) fn system_insert_statement(row: &SystemRow) -> SystemInsertStatement {
    let SystemRowDescriptor { case, table, .. } = row.descriptor();
    let sql = match case {
        SystemRowCase::TaxonomyRegistry => {
            "INSERT INTO taxonomy_registry (id, domain, purpose) VALUES (?1, ?2, ?3)"
        }
        SystemRowCase::TaxonomyTerm => "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        SystemRowCase::GeoPlace => "INSERT INTO geo_places (id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        SystemRowCase::Life => "INSERT INTO life_reference_items (id, size_term_key, aliases_json, stage_metrics_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5)",
        SystemRowCase::LifeOrigin => "INSERT INTO life_origin_places (life_id, place_id, sort_order) VALUES (?1, ?2, ?3)",
        SystemRowCase::Manufacturer => "INSERT INTO manufacturer_catalog_items (id, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        SystemRowCase::ActiveIngredient => "INSERT INTO active_ingredient_catalog_items (id, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        SystemRowCase::Condition => "INSERT INTO condition_catalog_items (id, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        SystemRowCase::Product => "INSERT INTO product_catalog_items (id, name, normalized_name, applicable_taxon_term_keys_json, applicable_life_stages_json, therapeutic_spectrum, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        SystemRowCase::EntityTaxonomy => "INSERT INTO entity_taxonomy_terms (entity_type, entity_id, taxonomy_id, term_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        SystemRowCase::ProductActiveIngredient => "INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)",
        SystemRowCase::TreatmentProtocol => "INSERT INTO treatment_protocols (id, kind, name, normalized_name, applicable_taxon_term_keys_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        SystemRowCase::TreatmentProtocolItem => "INSERT INTO treatment_protocol_items (protocol_id, product_id, sort_order) VALUES (?1, ?2, ?3)",
        SystemRowCase::TreatmentProtocolDose => "INSERT INTO treatment_protocol_doses (protocol_id, dose_id, label, validity_value, validity_unit, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        SystemRowCase::SearchTerm => "INSERT INTO entity_search_terms (entity_type, entity_id, value, normalized_value, provenance, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        SystemRowCase::MediaReference => "INSERT INTO entity_media_references (entity_type, entity_id, role, media_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
    };
    SystemInsertStatement { case, table, sql }
}

pub(crate) fn write_system_row(
    transaction: &Transaction<'_>,
    row: &SystemRow,
) -> Result<usize, DatabaseError> {
    let statement = system_insert_statement(row);
    let _ = (statement.case, statement.table);
    match row {
        SystemRow::TaxonomyRegistry {
            id,
            domain,
            purpose,
        } => transaction.execute(statement.sql, params![id, domain, purpose]),
        SystemRow::TaxonomyTerm {
            taxonomy_id,
            term_key,
            parent_term_key,
            label,
            normalized_label,
            aliases_json,
            sort_order,
        } => transaction.execute(
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
        SystemRow::Life {
            id,
            size_term_key,
            aliases_json,
            stage_metrics_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                size_term_key,
                aliases_json,
                stage_metrics_json,
                content_json
            ],
        ),
        SystemRow::LifeOrigin {
            life_id,
            place_id,
            sort_order,
        } => transaction.execute(statement.sql, params![life_id, place_id, sort_order]),
        SystemRow::Manufacturer {
            id,
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
            name,
            normalized_name,
            aliases_json,
            regions_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json
            ],
        ),
        SystemRow::Product {
            id,
            name,
            normalized_name,
            applicable_taxon_term_keys_json,
            applicable_life_stages_json,
            therapeutic_spectrum,
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
                name,
                normalized_name,
                applicable_taxon_term_keys_json,
                applicable_life_stages_json,
                therapeutic_spectrum,
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
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![entity_type, entity_id, taxonomy_id, term_key, sort_order],
        ),
        SystemRow::ProductActiveIngredient {
            product_id,
            active_ingredient_id,
            sort_order,
        } => transaction.execute(
            statement.sql,
            params![product_id, active_ingredient_id, sort_order],
        ),
        SystemRow::TreatmentProtocol {
            id,
            kind,
            name,
            normalized_name,
            applicable_taxon_term_keys_json,
            observation,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                kind,
                name,
                normalized_name,
                applicable_taxon_term_keys_json,
                observation
            ],
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
    .map_err(|source| DatabaseError::Table {
        database: database_path(transaction),
        table: statement.table.as_str().to_string(),
        operation: "insert system row",
        source: Box::new(source),
    })
}
