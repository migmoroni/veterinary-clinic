//! Reads every projectable SQLite row into closed Rust types and compares the
//! observed databases with the expected locale projection contract.

use crate::{
    projection::contract::{MetadataRow, ProjectionContract, SystemMediaRow, SystemRow},
    projection::coverage::{RowIdentity, SystemTable},
};
use rusqlite::{Connection, Row};
use std::collections::BTreeMap;

type SystemRows = BTreeMap<SystemTable, BTreeMap<RowIdentity, SystemRow>>;

pub(crate) fn verify_semantic_equivalence(
    system: &Connection,
    media: &Connection,
    contract: &ProjectionContract,
) -> Result<(), String> {
    verify_metadata(system, contract, crate::databases::DatabaseKind::System)?;
    verify_metadata(media, contract, crate::databases::DatabaseKind::SystemMedia)?;
    let expected = expected_system_rows(contract)?;
    let observed = read_system_rows(system)?;
    if expected != observed {
        return Err(format!(
            "system database is not semantically equivalent to projection contract for {}",
            contract.locale
        ));
    }
    let expected_media = contract
        .system_media
        .iter()
        .map(|operation| (operation.row.media_key.clone(), operation.row.clone()))
        .collect::<BTreeMap<_, _>>();
    let observed_media = read_media_rows(media)?;
    compare_system_media_rows(&expected_media, &observed_media)
        .map_err(|error| format!("{error} for {}", contract.locale))?;
    Ok(())
}

fn compare_system_media_rows(
    expected_media: &BTreeMap<String, SystemMediaRow>,
    observed_media: &BTreeMap<String, SystemMediaRow>,
) -> Result<(), String> {
    if expected_media != observed_media {
        for (media_key, expected) in expected_media {
            if let Some(observed) = observed_media.get(media_key) {
                if expected.thumbnail != observed.thumbnail
                    || expected.thumbnail_mime_type != observed.thumbnail_mime_type
                    || expected.thumbnail_width != observed.thumbnail_width
                    || expected.thumbnail_height != observed.thumbnail_height
                {
                    return Err(format!(
                        "thumbnail differs from projection contract for {media_key}"
                    ));
                }
            }
        }
        return Err(
            "system_media database is not semantically equivalent to projection contract"
                .to_string(),
        );
    }
    Ok(())
}

fn verify_metadata(
    connection: &Connection,
    contract: &ProjectionContract,
    database: crate::databases::DatabaseKind,
) -> Result<(), String> {
    let expected = contract
        .metadata
        .iter()
        .filter(|operation| operation.database == database)
        .map(|operation| operation.row.clone())
        .collect::<Vec<_>>();
    let mut observed = Vec::new();
    let build = connection.query_row(
        "SELECT build_version, builder_version, build_result_schema_version, source_digest_sha256, locale FROM knowledge_build_metadata",
        [],
        |row| Ok(MetadataRow::Build {
            build_version: row.get(0)?, builder_version: row.get(1)?,
            build_result_schema_version: row.get(2)?, source_digest: row.get(3)?, locale: row.get(4)?,
        }),
    ).map_err(|error| format!("cannot read semantic build metadata: {error}"))?;
    observed.push(build);
    let mut statement = connection.prepare(
        "SELECT release_id, generation, revision, locale FROM knowledge_release_metadata ORDER BY singleton"
    ).map_err(|error| format!("cannot prepare semantic release metadata: {error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok(MetadataRow::Release {
                release_id: row.get(0)?,
                generation: row.get(1)?,
                revision: row.get(2)?,
                locale: row.get(3)?,
            })
        })
        .map_err(|error| format!("cannot read semantic release metadata: {error}"))?;
    for row in rows {
        observed.push(row.map_err(|error| error.to_string())?);
    }
    if observed != expected {
        return Err(format!(
            "metadata is not semantically equivalent for {}",
            contract.locale
        ));
    }
    Ok(())
}

fn expected_system_rows(contract: &ProjectionContract) -> Result<SystemRows, String> {
    let mut result = SystemTable::SYSTEM_PROJECTABLE
        .into_iter()
        .map(|table| (table, BTreeMap::new()))
        .collect::<SystemRows>();
    for operation in &contract.system {
        let descriptor = operation.row.descriptor();
        let rows = result.get_mut(&descriptor.table).unwrap();
        if rows
            .insert(descriptor.identity, operation.row.clone())
            .is_some()
        {
            return Err(format!(
                "duplicate expected semantic row {}:{}",
                descriptor.table.as_str(),
                operation.event.row
            ));
        }
    }
    Ok(result)
}

fn read_system_rows(connection: &Connection) -> Result<SystemRows, String> {
    let mut result = BTreeMap::new();
    result.insert(
        SystemTable::TaxonomyRegistry,
        query(
            connection,
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
    result.insert(SystemTable::TaxonomyTerms, read_taxonomy_terms(connection)?);
    result.insert(
        SystemTable::GeoPlaces,
        query(
            connection,
            "SELECT id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json FROM geo_places ORDER BY id",
            |row| Ok(SystemRow::GeoPlace { id: row.get(0)?, place_type: row.get(1)?, parent_place_id: row.get(2)?, country_codes_json: row.get(3)?, latitude: row.get(4)?, longitude: row.get(5)?, name: row.get(6)?, normalized_name: row.get(7)?, aliases_json: row.get(8)? }),
        )?,
    );
    result.insert(
        SystemTable::LifeReferenceItems,
        query(
            connection,
            "SELECT id, domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, size_term_key, name, normalized_name, aliases_json, stage_metrics_json, content_json FROM life_reference_items ORDER BY id",
            |row| Ok(SystemRow::Life { id: row.get(0)?, domain_id: row.get(1)?, kingdom_id: row.get(2)?, phylum_id: row.get(3)?, class_id: row.get(4)?, order_id: row.get(5)?, family_id: row.get(6)?, genus_id: row.get(7)?, species_id: row.get(8)?, breed_id: row.get(9)?, variety_id: row.get(10)?, size_term_key: row.get(11)?, name: row.get(12)?, normalized_name: row.get(13)?, aliases_json: row.get(14)?, stage_metrics_json: row.get(15)?, content_json: row.get(16)? }),
        )?,
    );
    result.insert(
        SystemTable::LifeOriginPlaces,
        query(
            connection,
            "SELECT life_id, place_id, sort_order FROM life_origin_places ORDER BY life_id, sort_order",
            |row| Ok(SystemRow::LifeOrigin { life_id: row.get(0)?, place_id: row.get(1)?, sort_order: row.get(2)? }),
        )?,
    );
    result.insert(
        SystemTable::ManufacturerCatalogItems,
        query(
            connection,
            "SELECT id, name, normalized_name, aliases_json, regions_json, website, content_json FROM manufacturer_catalog_items ORDER BY id",
            |row| Ok(SystemRow::Manufacturer { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, website: row.get(5)?, content_json: row.get(6)? }),
        )?,
    );
    result.insert(
        SystemTable::ActiveIngredientCatalogItems,
        query(
            connection,
            "SELECT id, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json FROM active_ingredient_catalog_items ORDER BY id",
            |row| Ok(SystemRow::ActiveIngredient { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, nomenclature_json: row.get(5)?, atc_vet_code: row.get(6)?, atc_vet_system: row.get(7)?, denominations_json: row.get(8)?, content_json: row.get(9)? }),
        )?,
    );
    result.insert(
        SystemTable::ConditionCatalogItems,
        query(
            connection,
            "SELECT id, name, normalized_name, aliases_json, regions_json, content_json FROM condition_catalog_items ORDER BY id",
            |row| Ok(SystemRow::Condition { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, aliases_json: row.get(3)?, regions_json: row.get(4)?, content_json: row.get(5)? }),
        )?,
    );
    result.insert(
        SystemTable::ProductCatalogItems,
        query(
            connection,
            "SELECT id, name, normalized_name, applicable_taxon_ids_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json FROM product_catalog_items ORDER BY id",
            |row| Ok(SystemRow::Product { id: row.get(0)?, name: row.get(1)?, normalized_name: row.get(2)?, applicable_taxon_ids_json: row.get(3)?, aliases_json: row.get(4)?, manufacturer_id: row.get(5)?, regions_json: row.get(6)?, regulatory_identifiers_json: row.get(7)?, commercial_line: row.get(8)?, presentation_dosage: row.get(9)?, target_species_warnings_json: row.get(10)?, content_json: row.get(11)? }),
        )?,
    );
    result.insert(
        SystemTable::EntityTaxonomyTerms,
        query(
            connection,
            "SELECT entity_type, entity_id, taxonomy_id, term_key, sort_order FROM entity_taxonomy_terms ORDER BY entity_type, entity_id, taxonomy_id, sort_order",
            |row| Ok(SystemRow::EntityTaxonomy { entity_type: row.get(0)?, entity_id: row.get(1)?, taxonomy_id: row.get(2)?, term_key: row.get(3)?, sort_order: row.get(4)? }),
        )?,
    );
    result.insert(
        SystemTable::ProductActiveIngredients,
        query(
            connection,
            "SELECT product_id, active_ingredient_id, sort_order FROM product_active_ingredients ORDER BY product_id, sort_order",
            |row| Ok(SystemRow::ProductActiveIngredient { product_id: row.get(0)?, active_ingredient_id: row.get(1)?, sort_order: row.get(2)? }),
        )?,
    );
    result.insert(
        SystemTable::TreatmentProtocols,
        query(
            connection,
            "SELECT id, kind, name, normalized_name, applicable_taxon_ids_json, observation FROM treatment_protocols ORDER BY id",
            |row| Ok(SystemRow::TreatmentProtocol { id: row.get(0)?, kind: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?, applicable_taxon_ids_json: row.get(4)?, observation: row.get(5)? }),
        )?,
    );
    result.insert(
        SystemTable::TreatmentProtocolItems,
        query(
            connection,
            "SELECT protocol_id, product_id, sort_order FROM treatment_protocol_items ORDER BY protocol_id, sort_order",
            |row| Ok(SystemRow::TreatmentProtocolItem { protocol_id: row.get(0)?, product_id: row.get(1)?, sort_order: row.get(2)? }),
        )?,
    );
    result.insert(
        SystemTable::TreatmentProtocolDoses,
        query(
            connection,
            "SELECT protocol_id, dose_id, label, validity_value, validity_unit, sort_order FROM treatment_protocol_doses ORDER BY protocol_id, sort_order",
            |row| Ok(SystemRow::TreatmentProtocolDose { protocol_id: row.get(0)?, dose_id: row.get(1)?, label: row.get(2)?, validity_value: row.get(3)?, validity_unit: row.get(4)?, sort_order: row.get(5)? }),
        )?,
    );
    result.insert(
        SystemTable::EntitySearchTerms,
        query(
            connection,
            "SELECT entity_type, entity_id, value, normalized_value, provenance, sort_order FROM entity_search_terms ORDER BY entity_type, entity_id, sort_order",
            |row| Ok(SystemRow::SearchTerm { entity_type: row.get(0)?, entity_id: row.get(1)?, value: row.get(2)?, normalized_value: row.get(3)?, provenance: row.get(4)?, sort_order: row.get(5)? }),
        )?,
    );
    result.insert(
        SystemTable::EntityMediaReferences,
        query(
            connection,
            "SELECT entity_type, entity_id, role, media_key, sort_order FROM entity_media_references ORDER BY entity_type, entity_id, role, sort_order",
            |row| Ok(SystemRow::MediaReference { entity_type: row.get(0)?, entity_id: row.get(1)?, role: row.get(2)?, media_key: row.get(3)?, sort_order: row.get(4)? }),
        )?,
    );
    Ok(result)
}

fn read_taxonomy_terms(
    connection: &Connection,
) -> Result<BTreeMap<RowIdentity, SystemRow>, String> {
    query(
        connection,
        "SELECT taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order FROM taxonomy_terms ORDER BY taxonomy_id, sort_order",
        |row| Ok(SystemRow::TaxonomyTerm { taxonomy_id: row.get(0)?, term_key: row.get(1)?, parent_term_key: row.get(2)?, label: row.get(3)?, normalized_label: row.get(4)?, aliases_json: row.get(5)?, sort_order: row.get(6)? }),
    )
}

fn read_media_rows(connection: &Connection) -> Result<BTreeMap<String, SystemMediaRow>, String> {
    query_media(connection,
        "SELECT media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height FROM media_assets ORDER BY media_key",
        |row| {
            let media_key: String = row.get(0)?;
            Ok((media_key.clone(), SystemMediaRow { media_key, content_hash: row.get(1)?, thumbnail: row.get(2)?,
                thumbnail_mime_type: row.get(3)?, thumbnail_width: row.get(4)?, thumbnail_height: row.get(5)?,
                mime_type: row.get(6)?, size_bytes: row.get(7)?, width: row.get(8)?, height: row.get(9)? }))
        })
}

fn query<F>(
    connection: &Connection,
    sql: &str,
    mut convert: F,
) -> Result<BTreeMap<RowIdentity, SystemRow>, String>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<SystemRow>,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("cannot prepare semantic query: {error}"))?;
    let rows = statement
        .query_map([], |row| convert(row))
        .map_err(|error| format!("cannot run semantic query: {error}"))?;
    let mut result = BTreeMap::new();
    for row in rows {
        let value = row.map_err(|error| format!("cannot read semantic row: {error}"))?;
        let identity = value.descriptor().identity;
        if result.insert(identity.clone(), value).is_some() {
            return Err(format!("duplicate semantic row identity {identity}"));
        }
    }
    Ok(result)
}

fn query_media<F>(
    connection: &Connection,
    sql: &str,
    mut convert: F,
) -> Result<BTreeMap<String, SystemMediaRow>, String>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<(String, SystemMediaRow)>,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("cannot prepare media semantic query: {error}"))?;
    let rows = statement
        .query_map([], |row| convert(row))
        .map_err(|error| format!("cannot run media semantic query: {error}"))?;
    let mut result = BTreeMap::new();
    for row in rows {
        let (key, value) =
            row.map_err(|error| format!("cannot read media semantic row: {error}"))?;
        if result.insert(key.clone(), value).is_some() {
            return Err(format!("duplicate media semantic row identity {key}"));
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

    fn media_row() -> SystemMediaRow {
        SystemMediaRow {
            media_key: "product/product-one/cover".to_string(),
            content_hash: vec![1; 32],
            thumbnail: vec![0xff, 0xd8, 0xff, 0xd9],
            thumbnail_mime_type: "image/jpeg".to_string(),
            thumbnail_width: 200,
            thumbnail_height: 100,
            mime_type: "image/png".to_string(),
            size_bytes: 4096,
            width: 800,
            height: 400,
        }
    }

    #[test]
    fn thumbnail_mime_type_is_part_of_semantic_equivalence() {
        let expected = BTreeMap::from([("product/product-one/cover".to_string(), media_row())]);
        let mut observed = expected.clone();
        observed
            .get_mut("product/product-one/cover")
            .unwrap()
            .thumbnail_mime_type = "image/png".to_string();

        let error = compare_system_media_rows(&expected, &observed).unwrap_err();
        assert_eq!(
            error,
            "thumbnail differs from projection contract for product/product-one/cover"
        );
    }

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
            assert_eq!(write_system_row(&transaction, row).unwrap(), 1);
        }
        transaction.commit().unwrap();

        let observed = read_system_rows(&connection).unwrap();
        let mut expected = SystemTable::SYSTEM_PROJECTABLE
            .into_iter()
            .map(|table| (table, BTreeMap::new()))
            .collect::<SystemRows>();
        for row in expected_rows {
            let descriptor = row.descriptor();
            assert!(expected
                .get_mut(&descriptor.table)
                .unwrap()
                .insert(descriptor.identity, row)
                .is_none());
        }

        assert_eq!(observed, expected);
    }
}
