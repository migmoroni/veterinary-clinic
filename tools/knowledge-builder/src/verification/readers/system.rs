//! Reads every projectable system row through closed, literal SELECT statements.

use crate::{
    projection::contract::{ProjectionContract, SystemRow},
    projection::coverage::{RowIdentity, SystemTable},
};
use rusqlite::{Connection, Row};
use std::collections::{BTreeMap, BTreeSet};
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
        query(connection, database, "SELECT taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order FROM taxonomy_terms ORDER BY taxonomy_id, COALESCE(parent_term_key, ''), sort_order, term_key", |row| {
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
        query(connection, database, "SELECT id, size_term_key, aliases_json, stage_metrics_json, content_json FROM life_reference_items ORDER BY id", |row| {
            Ok(SystemRow::Life { id: row.get(0)?, size_term_key: row.get(1)?, aliases_json: row.get(2)?, stage_metrics_json: row.get(3)?, content_json: row.get(4)? })
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
        query(connection, database, "SELECT id, name, normalized_name, applicable_taxon_term_keys_json, applicable_life_stages_json, therapeutic_spectrum, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json FROM product_catalog_items ORDER BY id", |row| {
            Ok(SystemRow::Product { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, applicable_taxon_term_keys_json: row.get(3)?, applicable_life_stages_json: row.get(4)?, therapeutic_spectrum: row.get(5)?, aliases_json: row.get(6)?, manufacturer_id: row.get(7)?, regions_json: row.get(8)?, regulatory_identifiers_json: row.get(9)?, commercial_line: row.get(10)?, presentation_dosage: row.get(11)?, target_species_warnings_json: row.get(12)?, content_json: row.get(13)? })
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
        query(connection, database, "SELECT id, kind, name, normalized_name, applicable_taxon_term_keys_json, observation FROM treatment_protocols ORDER BY id", |row| {
            Ok(SystemRow::TreatmentProtocol { id: row.get(0)?, kind: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?, applicable_taxon_term_keys_json: row.get(4)?, observation: row.get(5)? })
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
    verify_taxonomy_forests(observed, database)?;
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

fn verify_taxonomy_forests(
    observed: &SystemRows,
    database: &Path,
) -> Result<(), crate::DatabaseError> {
    let registries = observed
        .get(&SystemTable::TaxonomyRegistry)
        .expect("taxonomy registry rows are always read")
        .values()
        .filter_map(|row| match row {
            SystemRow::TaxonomyRegistry { id, .. } => Some(id.as_str()),
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    let rows = observed
        .get(&SystemTable::TaxonomyTerms)
        .expect("taxonomy term rows are always read");
    let mut nodes = BTreeMap::<(String, String), Option<String>>::new();
    let mut sibling_groups = BTreeMap::<(String, Option<String>), Vec<(usize, String)>>::new();
    for row in rows.values() {
        let SystemRow::TaxonomyTerm {
            taxonomy_id,
            term_key,
            parent_term_key,
            sort_order,
            ..
        } = row
        else {
            continue;
        };
        if !registries.contains(taxonomy_id.as_str()) {
            return taxonomy_error(
                database,
                format!("term {term_key} has unknown taxonomy {taxonomy_id}"),
            );
        }
        if parent_term_key.as_ref() == Some(term_key) {
            return taxonomy_error(
                database,
                format!("term {taxonomy_id}:{term_key} references itself"),
            );
        }
        nodes.insert(
            (taxonomy_id.clone(), term_key.clone()),
            parent_term_key.clone(),
        );
        sibling_groups
            .entry((taxonomy_id.clone(), parent_term_key.clone()))
            .or_default()
            .push((*sort_order, term_key.clone()));
    }
    for ((taxonomy_id, term_key), parent) in &nodes {
        if let Some(parent) = parent {
            if !nodes.contains_key(&(taxonomy_id.clone(), parent.clone())) {
                return taxonomy_error(
                    database,
                    format!("term {taxonomy_id}:{term_key} has unresolved parent {parent}"),
                );
            }
        }
    }
    for ((taxonomy_id, parent), siblings) in &mut sibling_groups {
        siblings.sort();
        if siblings
            .iter()
            .enumerate()
            .any(|(expected, (actual, _))| expected != *actual)
        {
            return taxonomy_error(
                database,
                format!("taxonomy {taxonomy_id} has non-contiguous sibling order under {parent:?}"),
            );
        }
    }
    for taxonomy_id in registries {
        let roots = sibling_groups
            .get(&(taxonomy_id.to_string(), None))
            .ok_or_else(|| {
                crate::DatabaseError::invariant(
                    database,
                    "verify taxonomy forest",
                    format!("taxonomy {taxonomy_id} has no roots"),
                )
            })?;
        let mut pending = roots
            .iter()
            .rev()
            .map(|(_, key)| key.clone())
            .collect::<Vec<_>>();
        let mut visited = BTreeSet::new();
        while let Some(term_key) = pending.pop() {
            if !visited.insert(term_key.clone()) {
                return taxonomy_error(
                    database,
                    format!("taxonomy {taxonomy_id} visits term {term_key} more than once"),
                );
            }
            if let Some(children) = sibling_groups.get(&(taxonomy_id.to_string(), Some(term_key))) {
                pending.extend(children.iter().rev().map(|(_, key)| key.clone()));
            }
        }
        let expected = nodes
            .keys()
            .filter(|(candidate, _)| candidate == taxonomy_id)
            .count();
        if visited.len() != expected {
            return taxonomy_error(
                database,
                format!("taxonomy {taxonomy_id} contains unreachable terms or a cycle"),
            );
        }
    }
    Ok(())
}

fn taxonomy_error(database: &Path, detail: String) -> Result<(), crate::DatabaseError> {
    Err(crate::DatabaseError::invariant(
        database,
        "verify taxonomy forest",
        detail,
    ))
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

    fn taxonomy_rows(terms: Vec<SystemRow>) -> SystemRows {
        let registry = SystemRow::TaxonomyRegistry {
            id: "taxonomy".to_string(),
            domain: "product".to_string(),
            purpose: "type".to_string(),
        };
        let mut rows = BTreeMap::new();
        rows.insert(
            SystemTable::TaxonomyRegistry,
            BTreeMap::from([(registry.descriptor().identity, registry)]),
        );
        rows.insert(
            SystemTable::TaxonomyTerms,
            terms
                .into_iter()
                .map(|row| (row.descriptor().identity, row))
                .collect(),
        );
        rows
    }

    fn term(key: &str, parent: Option<&str>, order: usize) -> SystemRow {
        SystemRow::TaxonomyTerm {
            taxonomy_id: "taxonomy".to_string(),
            term_key: key.to_string(),
            parent_term_key: parent.map(str::to_string),
            label: key.to_string(),
            normalized_label: key.to_lowercase(),
            aliases_json: "[]".to_string(),
            sort_order: order,
        }
    }

    #[test]
    fn taxonomy_forest_verifier_accepts_local_order_and_opaque_keys() {
        let rows = taxonomy_rows(vec![
            term("namespace.compoundRoot", None, 0),
            term("secondRoot", None, 1),
            term("childWithoutPrefix", Some("namespace.compoundRoot"), 0),
            term("other.child", Some("secondRoot"), 0),
        ]);
        verify_taxonomy_forests(&rows, Path::new("<taxonomy>")).unwrap();
    }

    #[test]
    fn taxonomy_forest_verifier_rejects_broken_structure() {
        let cases = [
            vec![term("root", None, 1)],
            vec![term("root", None, 0), term("child", Some("missing"), 0)],
            vec![term("root", None, 0), term("root.two", None, 0)],
            vec![term("root", None, 0), term("self", Some("self"), 0)],
            vec![
                term("root", None, 0),
                term("cycle-a", Some("cycle-b"), 0),
                term("cycle-b", Some("cycle-a"), 0),
            ],
        ];
        for terms in cases {
            assert!(
                verify_taxonomy_forests(&taxonomy_rows(terms), Path::new("<taxonomy>")).is_err()
            );
        }
    }

    #[test]
    fn taxonomy_ddl_enforces_sibling_order_but_allows_other_parent_groups() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(SYSTEM_DDL).unwrap();
        connection
            .execute(
                "INSERT INTO taxonomy_registry (id, domain, purpose) VALUES ('taxonomy', 'product', 'type')",
                [],
            )
            .unwrap();
        let insert = |key: &str, parent: Option<&str>, order: usize| {
            connection.execute(
                "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES ('taxonomy', ?1, ?2, ?1, ?1, '[]', ?3)",
                rusqlite::params![key, parent, order],
            )
        };
        insert("root-a", None, 0).unwrap();
        insert("root-b", None, 1).unwrap();
        insert("child-a", Some("root-a"), 0).unwrap();
        insert("child-b", Some("root-b"), 0).unwrap();
        assert!(insert("duplicate-root-order", None, 1).is_err());
        assert!(insert("duplicate-child-order", Some("root-a"), 0).is_err());
        assert!(insert("self", Some("self"), 0).is_err());
    }
}
