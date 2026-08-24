//! Reads every projectable SQLite row into closed Rust types and compares the
//! observed databases with the expected locale projection contract.

use crate::{
    ledger::SystemTable,
    projection::contract::{MetadataRow, ProjectionContract, SystemMediaRow, SystemRow},
};
use rusqlite::{Connection, Row};
use std::collections::BTreeMap;

type SystemRows = BTreeMap<SystemTable, BTreeMap<String, SystemRow>>;

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
        let rows = result.get_mut(&operation.event.table).unwrap();
        let identity = operation.row.logical_row_id();
        if rows.insert(identity, operation.row.clone()).is_some() {
            return Err(format!(
                "duplicate expected semantic row {}:{}",
                operation.event.table.as_str(),
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
                let id: String = row.get(0)?;
                Ok((
                    id.clone(),
                    SystemRow::TaxonomyRegistry {
                        id,
                        domain: row.get(1)?,
                        purpose: row.get(2)?,
                    },
                ))
            },
        )?,
    );
    result.insert(
        SystemTable::TaxonomyTerms,
        read_taxonomy_terms(connection, SystemTable::TaxonomyTerms)?,
    );
    for table in [
        SystemTable::ProductTargetTerms,
        SystemTable::ProductVaccineProfileTerms,
        SystemTable::ProductLifeStageTerms,
        SystemTable::ProductTherapeuticScopeTerms,
    ] {
        result.insert(table, read_taxonomy_terms(connection, table)?);
    }
    result.insert(SystemTable::GeoPlaces, query(connection,
        "SELECT id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json FROM geo_places ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::GeoPlace { id, place_type: row.get(1)?, parent_place_id: row.get(2)?,
                country_codes_json: row.get(3)?, latitude: row.get(4)?, longitude: row.get(5)?, name: row.get(6)?,
                normalized_name: row.get(7)?, aliases_json: row.get(8)? }))
        })?);
    result.insert(SystemTable::BreedReferenceItems, query(connection,
        "SELECT id, species_json, name, normalized_name, aliases_json, size_term_key, average_weight_kg_json, average_height_cm_json, content_json FROM breed_reference_items ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::Breed { id, species_json: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                aliases_json: row.get(4)?, size_term_key: row.get(5)?, average_weight_kg_json: row.get(6)?,
                average_height_cm_json: row.get(7)?, content_json: row.get(8)? }))
        })?);
    result.insert(SystemTable::BreedOriginPlaces, query(connection,
        "SELECT breed_id, place_id, sort_order FROM breed_origin_places ORDER BY breed_id, sort_order", |row| {
            let breed_id: String = row.get(0)?; let place_id: String = row.get(1)?;
            Ok((format!("{breed_id}/{place_id}"), SystemRow::BreedOrigin { breed_id, place_id, sort_order: row.get(2)? }))
        })?);
    result.insert(SystemTable::ManufacturerCatalogItems, query(connection,
        "SELECT id, type_term_key, name, normalized_name, aliases_json, regions_json, website, content_json FROM manufacturer_catalog_items ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::Manufacturer { id, type_term_key: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                aliases_json: row.get(4)?, regions_json: row.get(5)?, website: row.get(6)?, content_json: row.get(7)? }))
        })?);
    result.insert(SystemTable::ActiveIngredientCatalogItems, query(connection,
        "SELECT id, type_term_key, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json FROM active_ingredient_catalog_items ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::ActiveIngredient { id, type_term_key: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                aliases_json: row.get(4)?, regions_json: row.get(5)?, nomenclature_json: row.get(6)?, atc_vet_code: row.get(7)?,
                atc_vet_system: row.get(8)?, denominations_json: row.get(9)?, content_json: row.get(10)? }))
        })?);
    result.insert(SystemTable::ConditionCatalogItems, query(connection,
        "SELECT id, type_term_key, name, normalized_name, aliases_json, regions_json, content_json FROM condition_catalog_items ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::Condition { id, type_term_key: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                aliases_json: row.get(4)?, regions_json: row.get(5)?, content_json: row.get(6)? }))
        })?);
    result.insert(SystemTable::ProductCatalogItems, query(connection,
        "SELECT id, type_term_key, name, normalized_name, species_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json FROM product_catalog_items ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::Product { id, type_term_key: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                species_json: row.get(4)?, aliases_json: row.get(5)?, manufacturer_id: row.get(6)?, regions_json: row.get(7)?,
                regulatory_identifiers_json: row.get(8)?, commercial_line: row.get(9)?, presentation_dosage: row.get(10)?,
                target_species_warnings_json: row.get(11)?, content_json: row.get(12)? }))
        })?);
    result.insert(SystemTable::EntityTaxonomyTerms, query(connection,
        "SELECT entity_type, entity_id, taxonomy_id, term_key, relation_kind, sort_order FROM entity_taxonomy_terms ORDER BY entity_type, entity_id, relation_kind, sort_order", |row| {
            let entity_type: String = row.get(0)?; let entity_id: String = row.get(1)?; let term_key: String = row.get(3)?; let relation_kind: String = row.get(4)?;
            let key = format!("{entity_type}/{entity_id}/{relation_kind}/{term_key}");
            Ok((key, SystemRow::EntityTaxonomy { entity_type, entity_id, taxonomy_id: row.get(2)?, term_key, relation_kind, sort_order: row.get(5)? }))
        })?);
    result.insert(SystemTable::ProductActiveIngredients, query(connection,
        "SELECT product_id, active_ingredient_id, sort_order FROM product_active_ingredients ORDER BY product_id, sort_order", |row| {
            let product_id: String = row.get(0)?; let active_ingredient_id: String = row.get(1)?;
            Ok((format!("{product_id}/{active_ingredient_id}"), SystemRow::ProductActiveIngredient { product_id, active_ingredient_id, sort_order: row.get(2)? }))
        })?);
    for table in [
        SystemTable::ProductTargets,
        SystemTable::ProductVaccineProfiles,
        SystemTable::ProductLifeStages,
        SystemTable::ProductTherapeuticScopes,
    ] {
        result.insert(table, read_product_terms(connection, table)?);
    }
    result.insert(SystemTable::TreatmentProtocols, query(connection,
        "SELECT id, kind, name, normalized_name, species_json, observation FROM treatment_protocols ORDER BY id", |row| {
            let id: String = row.get(0)?;
            Ok((id.clone(), SystemRow::TreatmentProtocol { id, kind: row.get(1)?, name: row.get(2)?, normalized_name: row.get(3)?,
                species_json: row.get(4)?, observation: row.get(5)? }))
        })?);
    result.insert(SystemTable::TreatmentProtocolItems, query(connection,
        "SELECT protocol_id, product_id, sort_order FROM treatment_protocol_items ORDER BY protocol_id, sort_order", |row| {
            let protocol_id: String = row.get(0)?; let product_id: String = row.get(1)?;
            Ok((format!("{protocol_id}/{product_id}"), SystemRow::TreatmentProtocolItem { protocol_id, product_id, sort_order: row.get(2)? }))
        })?);
    result.insert(SystemTable::TreatmentProtocolDoses, query(connection,
        "SELECT protocol_id, dose_id, label, validity_value, validity_unit, sort_order FROM treatment_protocol_doses ORDER BY protocol_id, sort_order", |row| {
            let protocol_id: String = row.get(0)?; let dose_id: String = row.get(1)?;
            Ok((format!("{protocol_id}/{dose_id}"), SystemRow::TreatmentProtocolDose { protocol_id, dose_id, label: row.get(2)?,
                validity_value: row.get(3)?, validity_unit: row.get(4)?, sort_order: row.get(5)? }))
        })?);
    result.insert(SystemTable::EntitySearchTerms, query(connection,
        "SELECT entity_type, entity_id, value, normalized_value, provenance, sort_order FROM entity_search_terms ORDER BY entity_type, entity_id, sort_order", |row| {
            let entity_type: String = row.get(0)?; let entity_id: String = row.get(1)?; let sort_order: usize = row.get(5)?;
            Ok((format!("{entity_type}/{entity_id}/{sort_order}"), SystemRow::SearchTerm { entity_type, entity_id, value: row.get(2)?,
                normalized_value: row.get(3)?, provenance: row.get(4)?, sort_order }))
        })?);
    result.insert(SystemTable::EntityMediaReferences, query(connection,
        "SELECT entity_type, entity_id, role, media_key, sort_order FROM entity_media_references ORDER BY entity_type, entity_id, role, sort_order", |row| {
            let entity_type: String = row.get(0)?; let entity_id: String = row.get(1)?; let role: String = row.get(2)?; let sort_order: usize = row.get(4)?;
            Ok((format!("{entity_type}/{entity_id}/{role}/{sort_order}"), SystemRow::MediaReference { entity_type, entity_id, role,
                media_key: row.get(3)?, sort_order }))
        })?);
    Ok(result)
}

fn read_taxonomy_terms(
    connection: &Connection,
    table: SystemTable,
) -> Result<BTreeMap<String, SystemRow>, String> {
    if table == SystemTable::TaxonomyTerms {
        query(connection, "SELECT taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order FROM taxonomy_terms ORDER BY taxonomy_id, sort_order", |row| {
            let taxonomy_id: String = row.get(0)?; let term_key: String = row.get(1)?;
            Ok((format!("{taxonomy_id}/{term_key}"), SystemRow::TaxonomyTerm { table, taxonomy_id: Some(taxonomy_id), term_key,
                parent_term_key: row.get(2)?, label: row.get(3)?, normalized_label: row.get(4)?, aliases_json: row.get(5)?, sort_order: row.get(6)? }))
        })
    } else {
        let name = table.as_str();
        query(connection, &format!("SELECT term_key, parent_term_key, label, normalized_label, aliases_json, sort_order FROM {name} ORDER BY sort_order"), |row| {
            let term_key: String = row.get(0)?;
            Ok((term_key.clone(), SystemRow::TaxonomyTerm { table, taxonomy_id: None, term_key,
                parent_term_key: row.get(1)?, label: row.get(2)?, normalized_label: row.get(3)?, aliases_json: row.get(4)?, sort_order: row.get(5)? }))
        })
    }
}

fn read_product_terms(
    connection: &Connection,
    table: SystemTable,
) -> Result<BTreeMap<String, SystemRow>, String> {
    query(
        connection,
        &format!(
            "SELECT product_id, term_key, sort_order FROM {} ORDER BY product_id, sort_order",
            table.as_str()
        ),
        |row| {
            let product_id: String = row.get(0)?;
            let term_key: String = row.get(1)?;
            Ok((
                format!("{product_id}/{term_key}"),
                SystemRow::ProductTerm {
                    table,
                    product_id,
                    term_key,
                    sort_order: row.get(2)?,
                },
            ))
        },
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
) -> Result<BTreeMap<String, SystemRow>, String>
where
    F: FnMut(&Row<'_>) -> rusqlite::Result<(String, SystemRow)>,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("cannot prepare semantic query: {error}"))?;
    let rows = statement
        .query_map([], |row| convert(row))
        .map_err(|error| format!("cannot run semantic query: {error}"))?;
    let mut result = BTreeMap::new();
    for row in rows {
        let (key, value) = row.map_err(|error| format!("cannot read semantic row: {error}"))?;
        if result.insert(key.clone(), value).is_some() {
            return Err(format!("duplicate semantic row identity {key}"));
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
}
