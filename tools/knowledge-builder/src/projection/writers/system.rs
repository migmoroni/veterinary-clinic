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
    GeoPlace,
    Life,
    LifeOrigin,
    Manufacturer,
    ActiveIngredient,
    Condition,
    Product,
    EntityTaxonomy,
    ProductActiveIngredient,
    TreatmentProtocol,
    TreatmentProtocolItem,
    TreatmentProtocolDose,
    SearchTerm,
    MediaReference,
}

impl SystemInsertCase {
    #[cfg(test)]
    pub(super) const ALL: [Self; 16] = [
        Self::TaxonomyRegistry,
        Self::TaxonomyTerm,
        Self::GeoPlace,
        Self::Life,
        Self::LifeOrigin,
        Self::Manufacturer,
        Self::ActiveIngredient,
        Self::Condition,
        Self::Product,
        Self::EntityTaxonomy,
        Self::ProductActiveIngredient,
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
    let (case, table, sql) = match row {
        SystemRow::TaxonomyRegistry { .. } => (
            SystemInsertCase::TaxonomyRegistry,
            SystemTable::TaxonomyRegistry,
            "INSERT INTO taxonomy_registry (id, domain, purpose) VALUES (?1, ?2, ?3)",
        ),
        SystemRow::TaxonomyTerm { .. } => (
            SystemInsertCase::TaxonomyTerm,
            SystemTable::TaxonomyTerms,
            "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        ),
        SystemRow::GeoPlace { .. } => (
            SystemInsertCase::GeoPlace,
            SystemTable::GeoPlaces,
            "INSERT INTO geo_places (id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        ),
        SystemRow::Life { .. } => (
            SystemInsertCase::Life,
            SystemTable::LifeReferenceItems,
            "INSERT INTO life_reference_items (id, domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, size_term_key, name, normalized_name, aliases_json, stage_metrics_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        ),
        SystemRow::LifeOrigin { .. } => (
            SystemInsertCase::LifeOrigin,
            SystemTable::LifeOriginPlaces,
            "INSERT INTO life_origin_places (life_id, place_id, sort_order) VALUES (?1, ?2, ?3)",
        ),
        SystemRow::Manufacturer { .. } => (
            SystemInsertCase::Manufacturer,
            SystemTable::ManufacturerCatalogItems,
            "INSERT INTO manufacturer_catalog_items (id, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        ),
        SystemRow::ActiveIngredient { .. } => (
            SystemInsertCase::ActiveIngredient,
            SystemTable::ActiveIngredientCatalogItems,
            "INSERT INTO active_ingredient_catalog_items (id, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        ),
        SystemRow::Condition { .. } => (
            SystemInsertCase::Condition,
            SystemTable::ConditionCatalogItems,
            "INSERT INTO condition_catalog_items (id, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        ),
        SystemRow::Product { .. } => (
            SystemInsertCase::Product,
            SystemTable::ProductCatalogItems,
            "INSERT INTO product_catalog_items (id, name, normalized_name, applicable_taxon_ids_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        ),
        SystemRow::EntityTaxonomy { .. } => (
            SystemInsertCase::EntityTaxonomy,
            SystemTable::EntityTaxonomyTerms,
            "INSERT INTO entity_taxonomy_terms (entity_type, entity_id, taxonomy_id, term_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        ),
        SystemRow::ProductActiveIngredient { .. } => (
            SystemInsertCase::ProductActiveIngredient,
            SystemTable::ProductActiveIngredients,
            "INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)",
        ),
        SystemRow::TreatmentProtocol { .. } => (
            SystemInsertCase::TreatmentProtocol,
            SystemTable::TreatmentProtocols,
            "INSERT INTO treatment_protocols (id, kind, name, normalized_name, applicable_taxon_ids_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        ),
        SystemRow::TreatmentProtocolItem { .. } => (
            SystemInsertCase::TreatmentProtocolItem,
            SystemTable::TreatmentProtocolItems,
            "INSERT INTO treatment_protocol_items (protocol_id, product_id, sort_order) VALUES (?1, ?2, ?3)",
        ),
        SystemRow::TreatmentProtocolDose { .. } => (
            SystemInsertCase::TreatmentProtocolDose,
            SystemTable::TreatmentProtocolDoses,
            "INSERT INTO treatment_protocol_doses (protocol_id, dose_id, label, validity_value, validity_unit, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        ),
        SystemRow::SearchTerm { .. } => (
            SystemInsertCase::SearchTerm,
            SystemTable::EntitySearchTerms,
            "INSERT INTO entity_search_terms (entity_type, entity_id, value, normalized_value, provenance, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        ),
        SystemRow::MediaReference { .. } => (
            SystemInsertCase::MediaReference,
            SystemTable::EntityMediaReferences,
            "INSERT INTO entity_media_references (entity_type, entity_id, role, media_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        ),
    };
    Ok(SystemInsertStatement { case, table, sql })
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
    .map_err(|error| format!("cannot persist {} operation: {error}", row.table().as_str()))
}
