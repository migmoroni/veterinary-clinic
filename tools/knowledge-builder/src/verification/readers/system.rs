//! Reads every projectable system row through closed, literal SELECT statements.

use crate::{
    projection::contract::{ProjectionContract, SystemRow},
    projection::coverage::{RowIdentity, SystemTable},
};
use rusqlite::{Connection, Row};
use std::collections::BTreeMap;
use std::path::Path;

pub(crate) type SystemRows = BTreeMap<SystemTable, BTreeMap<RowIdentity, SystemRow>>;
pub(crate) type StructuralMediaRow = (String, String, String, usize, String);

pub(super) fn read(
    connection: &Connection,
    database: &Path,
) -> Result<SystemRows, crate::DatabaseError> {
    let mut result = BTreeMap::new();
    result.insert(
        SystemTable::TaxonomyRegistry,
        query(
            connection,
            database,
            "SELECT id, domain, purpose FROM taxonomy_registry ORDER BY id",
            |row| {
                Ok(SystemRow::TaxonomyRegistry {
                    id: row.get(0)?,
                    domain: row.get(1)?,
                    purpose: row.get(2)?,
                })
            },
        )?,
    );
    result.insert(
        SystemTable::TaxonomyTerms,
        query(connection, database, "SELECT taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order FROM taxonomy_terms ORDER BY taxonomy_id, sort_order", |row| {
            Ok(SystemRow::TaxonomyTerm { taxonomy_id: row.get(0)?, term_key: row.get(1)?, parent_term_key: row.get(2)?, label: row.get(3)?, normalized_label: row.get(4)?, aliases_json: row.get(5)?, sort_order: row.get(6)? })
        })?,
    );
    result.insert(
        SystemTable::GeoPlaces,
        query(connection, database, "SELECT id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json FROM geo_places ORDER BY id", |row| {
            Ok(SystemRow::GeoPlace { id: row.get(0)?, place_type: row.get(1)?, parent_place_id: row.get(2)?, country_codes_json: row.get(3)?, latitude: row.get(4)?, longitude: row.get(5)?, name: row.get(6)?, normalized_name: row.get(7)?, aliases_json: row.get(8)? })
        })?,
    );
    result.insert(
        SystemTable::LifeReferenceItems,
        query(connection, database, "SELECT id, domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, size_term_key, name, normalized_name, aliases_json, stage_metrics_json, content_json FROM life_reference_items ORDER BY id", |row| {
            Ok(SystemRow::Life { id: row.get(0)?, domain_id: row.get(1)?, kingdom_id: row.get(2)?, phylum_id: row.get(3)?, class_id: row.get(4)?, order_id: row.get(5)?, family_id: row.get(6)?, genus_id: row.get(7)?, species_id: row.get(8)?, breed_id: row.get(9)?, variety_id: row.get(10)?, size_term_key: row.get(11)?, name: row.get(12)?, normalized_name: row.get(13)?, aliases_json: row.get(14)?, stage_metrics_json: row.get(15)?, content_json: row.get(16)? })
        })?,
    );
    result.insert(
        SystemTable::LifeOriginPlaces,
        query(connection, database, "SELECT life_id, place_id, sort_order FROM life_origin_places ORDER BY life_id, sort_order", |row| {
            Ok(SystemRow::LifeOrigin { life_id: row.get(0)?, place_id: row.get(1)?, sort_order: row.get(2)? })
        })?,
    );
    result.insert(
        SystemTable::ManufacturerCatalogItems,
        query(connection, database, "SELECT id, name, normalized_name, aliases_json, regions_json, website, content_json FROM manufacturer_catalog_items ORDER BY id", |row| {
            Ok(SystemRow::Manufacturer { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, website: row.get(5)?, content_json: row.get(6)? })
        })?,
    );
    result.insert(
        SystemTable::ActiveIngredientCatalogItems,
        query(connection, database, "SELECT id, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json FROM active_ingredient_catalog_items ORDER BY id", |row| {
            Ok(SystemRow::ActiveIngredient { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, nomenclature_json: row.get(5)?, atc_vet_code: row.get(6)?, atc_vet_system: row.get(7)?, denominations_json: row.get(8)?, content_json: row.get(9)? })
        })?,
    );
    result.insert(
        SystemTable::ConditionCatalogItems,
        query(connection, database, "SELECT id, name, normalized_name, aliases_json, regions_json, content_json FROM condition_catalog_items ORDER BY id", |row| {
            Ok(SystemRow::Condition { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, content_json: row.get(5)? })
        })?,
    );
    result.insert(
        SystemTable::ProductCatalogItems,
        query(connection, database, "SELECT id, name, normalized_name, applicable_taxon_ids_json, applicable_life_stages_json, therapeutic_spectrum, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json FROM product_catalog_items ORDER BY id", |row| {
            Ok(SystemRow::Product { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, applicable_taxon_ids_json: row.get(3)?, applicable_life_stages_json: row.get(4)?, therapeutic_spectrum: row.get(5)?, aliases_json: row.get(6)?, manufacturer_id: row.get(7)?, regions_json: row.get(8)?, regulatory_identifiers_json: row.get(9)?, commercial_line: row.get(10)?, presentation_dosage: row.get(11)?, target_species_warnings_json: row.get(12)?, content_json: row.get(13)? })
        })?,
    );
    result.insert(
        SystemTable::EntityTaxonomyTerms,
        query(connection, database, "SELECT entity_type, entity_id, taxonomy_id, term_key, sort_order FROM entity_taxonomy_terms ORDER BY entity_type, entity_id, taxonomy_id, sort_order", |row| {
            Ok(SystemRow::EntityTaxonomy { entity_type: row.get(0)?, entity_id: row.get(1)?, taxonomy_id: row.get(2)?, term_key: row.get(3)?, sort_order: row.get(4)? })
        })?,
    );
    result.insert(
        SystemTable::ProductActiveIngredients,
        query(connection, database, "SELECT product_id, active_ingredient_id, sort_order FROM product_active_ingredients ORDER BY product_id, sort_order", |row| {
            Ok(SystemRow::ProductActiveIngredient { product_id: row.get(0)?, active_ingredient_id: row.get(1)?, sort_order: row.get(2)? })
        })?,
    );
    result.insert(
        SystemTable::TreatmentProtocols,
        query(connection, database, "SELECT id, kind, name, normalized_name, applicable_taxon_ids_json, observation FROM treatment_protocols ORDER BY id", |row| {
            Ok(SystemRow::TreatmentProtocol { id: row.get(0)?, kind: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?, applicable_taxon_ids_json: row.get(4)?, observation: row.get(5)? })
        })?,
    );
    result.insert(
        SystemTable::TreatmentProtocolItems,
        query(connection, database, "SELECT protocol_id, product_id, sort_order FROM treatment_protocol_items ORDER BY protocol_id, sort_order", |row| {
            Ok(SystemRow::TreatmentProtocolItem { protocol_id: row.get(0)?, product_id: row.get(1)?, sort_order: row.get(2)? })
        })?,
    );
    result.insert(
        SystemTable::TreatmentProtocolDoses,
        query(connection, database, "SELECT protocol_id, dose_id, label, validity_value, validity_unit, sort_order FROM treatment_protocol_doses ORDER BY protocol_id, sort_order", |row| {
            Ok(SystemRow::TreatmentProtocolDose { protocol_id: row.get(0)?, dose_id: row.get(1)?, label: row.get(2)?, validity_value: row.get(3)?, validity_unit: row.get(4)?, sort_order: row.get(5)? })
        })?,
    );
    result.insert(
        SystemTable::EntitySearchTerms,
        query(connection, database, "SELECT entity_type, entity_id, value, normalized_value, provenance, sort_order FROM entity_search_terms ORDER BY entity_type, entity_id, sort_order", |row| {
            Ok(SystemRow::SearchTerm { entity_type: row.get(0)?, entity_id: row.get(1)?, value: row.get(2)?, normalized_value: row.get(3)?, provenance: row.get(4)?, sort_order: row.get(5)? })
        })?,
    );
    result.insert(
        SystemTable::EntityMediaReferences,
        query(connection, database, "SELECT entity_type, entity_id, role, media_key, sort_order FROM entity_media_references ORDER BY entity_type, entity_id, role, sort_order", |row| {
            Ok(SystemRow::MediaReference { entity_type: row.get(0)?, entity_id: row.get(1)?, role: row.get(2)?, media_key: row.get(3)?, sort_order: row.get(4)? })
        })?,
    );
    Ok(result)
}

pub(super) fn verify(
    observed: &SystemRows,
    contract: &ProjectionContract,
    database: &Path,
) -> Result<(), crate::DatabaseError> {
    let mut expected = SystemTable::SYSTEM_PROJECTABLE
        .into_iter()
        .map(|table| (table, BTreeMap::new()))
        .collect::<SystemRows>();
    for operation in &contract.system {
        let descriptor = operation.row.descriptor();
        let rows = expected.get_mut(&descriptor.table).unwrap();
        if rows
            .insert(descriptor.identity, operation.row.clone())
            .is_some()
        {
            return Err(crate::DatabaseError::invariant(
                database,
                "compare semantic rows",
                format!(
                    "duplicate expected semantic row {}:{}",
                    descriptor.table.as_str(),
                    operation.event.row
                ),
            ));
        }
    }
    if expected != *observed {
        return Err(crate::DatabaseError::invariant(
            database,
            "compare semantic rows",
            format!(
                "system database is not semantically equivalent to projection contract for {}",
                contract.locale
            ),
        ));
    }
    Ok(())
}

fn query<F>(
    connection: &Connection,
    database: &Path,
    sql: &str,
    mut convert: F,
) -> Result<BTreeMap<RowIdentity, SystemRow>, crate::DatabaseError>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<SystemRow>,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "prepare semantic query",
            source: Box::new(source),
        })?;
    let rows = statement
        .query_map([], |row| convert(row))
        .map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "run semantic query",
            source: Box::new(source),
        })?;
    let mut result = BTreeMap::new();
    for row in rows {
        let value = row.map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "read semantic row",
            source: Box::new(source),
        })?;
        let identity = value.descriptor().identity;
        if result.insert(identity.clone(), value).is_some() {
            return Err(crate::DatabaseError::invariant(
                database,
                "read semantic rows",
                format!("duplicate semantic row identity {identity}"),
            ));
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        databases::SYSTEM_DDL,
        projection::{
            contract::{representative_row, SystemRowCase},
            write_system_row,
        },
    };

    #[test]
    fn fixed_writers_and_independent_readers_round_trip_every_system_row_case() {
        let mut connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(SYSTEM_DDL).unwrap();
        let expected_rows = SystemRowCase::ALL
            .into_iter()
            .map(representative_row)
            .collect::<Vec<_>>();
        let transaction = connection.transaction().unwrap();
        for row in &expected_rows {
            write_system_row(&transaction, row).unwrap();
        }
        transaction.commit().unwrap();

        let observed = read(&connection, Path::new("<memory-system>")).unwrap();
        for expected in expected_rows {
            let descriptor = expected.descriptor();
            assert_eq!(
                observed[&descriptor.table].get(&descriptor.identity),
                Some(&expected)
            );
        }
    }
}
