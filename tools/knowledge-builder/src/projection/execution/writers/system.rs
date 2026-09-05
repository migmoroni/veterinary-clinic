//! Persists typed system rows through fixed, structurally verified SQLite statements.

use super::metadata::write_metadata;
use super::*;

pub(crate) fn write_system(
    connection: &mut Connection,
    metadata: &[MetadataOperation],
    operations: &[SystemProjectionOperation],
) -> Result<ConfirmedReceiptBatch, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system projection: {error}"))?;
    let mut pending = write_metadata(&transaction, DatabaseKind::System, metadata)?;
    for operation in operations {
        let affected = write_system_row(&transaction, &operation.row)?;
        pending.push(PendingReceipt::new(
            operation.id(),
            operation.obligations.clone(),
            ProjectionEvent::SqliteRow(operation.event.clone()),
            affected,
        )?);
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system projection: {error}"))?;
    preserve_deterministic_write_epochs(
        connection,
        DatabaseKind::System,
        metadata
            .iter()
            .filter(|operation| operation.database == DatabaseKind::System)
            .count(),
        !operations.is_empty(),
    )?;
    ConfirmedReceiptBatch::confirm(pending)
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
        SystemRowCase::Life => "INSERT INTO life_reference_items (id, domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, size_term_key, name, normalized_name, aliases_json, stage_metrics_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        SystemRowCase::LifeOrigin => "INSERT INTO life_origin_places (life_id, place_id, sort_order) VALUES (?1, ?2, ?3)",
        SystemRowCase::Manufacturer => "INSERT INTO manufacturer_catalog_items (id, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        SystemRowCase::ActiveIngredient => "INSERT INTO active_ingredient_catalog_items (id, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        SystemRowCase::Condition => "INSERT INTO condition_catalog_items (id, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        SystemRowCase::Product => "INSERT INTO product_catalog_items (id, name, normalized_name, applicable_taxon_ids_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        SystemRowCase::EntityTaxonomy => "INSERT INTO entity_taxonomy_terms (entity_type, entity_id, taxonomy_id, term_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        SystemRowCase::ProductActiveIngredient => "INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)",
        SystemRowCase::TreatmentProtocol => "INSERT INTO treatment_protocols (id, kind, name, normalized_name, applicable_taxon_ids_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
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
) -> Result<usize, String> {
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
            domain_id,
            kingdom_id,
            phylum_id,
            class_id,
            order_id,
            family_id,
            genus_id,
            species_id,
            breed_id,
            variety_id,
            size_term_key,
            name,
            normalized_name,
            aliases_json,
            stage_metrics_json,
            content_json,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                domain_id,
                kingdom_id,
                phylum_id,
                class_id,
                order_id,
                family_id,
                genus_id,
                species_id,
                breed_id,
                variety_id,
                size_term_key,
                name,
                normalized_name,
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
            applicable_taxon_ids_json,
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
                applicable_taxon_ids_json,
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
            applicable_taxon_ids_json,
            observation,
        } => transaction.execute(
            statement.sql,
            params![
                id,
                kind,
                name,
                normalized_name,
                applicable_taxon_ids_json,
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
    .map_err(|error| {
        format!(
            "cannot persist {} operation: {error}",
            statement.table.as_str()
        )
    })
}
