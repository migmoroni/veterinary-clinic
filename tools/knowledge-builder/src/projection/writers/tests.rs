//! Verifies that every typed system row matches its fixed SQL insert contract.

use super::*;
use crate::ledger::SystemColumn;
use std::collections::BTreeSet;

struct ParsedInsert<'a> {
    table: &'a str,
    columns: Vec<SystemColumn>,
}

fn empty_content_json() -> String {
    format!(
        r#"{{"schemaVersion":{},"sections":[]}}"#,
        crate::contracts::version::CONTENT_DOCUMENT_SCHEMA_VERSION
    )
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

fn taxonomy_term(marker: &str) -> SystemRow {
    SystemRow::TaxonomyTerm {
        taxonomy_id: format!("taxonomy-{marker}"),
        term_key: format!("term-{marker}"),
        parent_term_key: Some(format!("parent-{marker}")),
        label: format!("Label {marker}"),
        normalized_label: format!("label {marker}"),
        aliases_json: format!(r#"["alias-{marker}"]"#),
        sort_order: 10,
    }
}

fn representative_row(case: SystemInsertCase) -> SystemRow {
    match case {
        SystemInsertCase::TaxonomyRegistry => SystemRow::TaxonomyRegistry {
            id: "taxonomy-registry".to_string(),
            domain: "product".to_string(),
            purpose: "target".to_string(),
        },
        SystemInsertCase::TaxonomyTerm => taxonomy_term("taxonomy"),
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
            average_weight_kg_json: r#"{"min":10,"max":20}"#.to_string(),
            average_height_cm_json: r#"{"min":30,"max":40}"#.to_string(),
            content_json: empty_content_json(),
        },
        SystemInsertCase::BreedOrigin => SystemRow::BreedOrigin {
            breed_id: "breed-one".to_string(),
            place_id: "place-br".to_string(),
            sort_order: 30,
        },
        SystemInsertCase::Manufacturer => SystemRow::Manufacturer {
            id: "manufacturer-one".to_string(),
            name: "Manufacturer One".to_string(),
            normalized_name: "manufacturer one".to_string(),
            aliases_json: "[]".to_string(),
            regions_json: r#"["BR"]"#.to_string(),
            website: Some("https://example.test".to_string()),
            content_json: empty_content_json(),
        },
        SystemInsertCase::ActiveIngredient => SystemRow::ActiveIngredient {
            id: "ingredient-one".to_string(),
            name: "Ingredient One".to_string(),
            normalized_name: "ingredient one".to_string(),
            aliases_json: "[]".to_string(),
            regions_json: r#"["BR"]"#.to_string(),
            nomenclature_json: r#"{"standards":["inn"]}"#.to_string(),
            atc_vet_code: Some("QA01".to_string()),
            atc_vet_system: Some("ATCvet".to_string()),
            denominations_json: r#"{"inn":"Ingredient One"}"#.to_string(),
            content_json: empty_content_json(),
        },
        SystemInsertCase::Condition => SystemRow::Condition {
            id: "condition-one".to_string(),
            name: "Condition One".to_string(),
            normalized_name: "condition one".to_string(),
            aliases_json: "[]".to_string(),
            regions_json: r#"["BR"]"#.to_string(),
            content_json: empty_content_json(),
        },
        SystemInsertCase::Product => SystemRow::Product {
            id: "product-one".to_string(),
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
            content_json: empty_content_json(),
        },
        SystemInsertCase::EntityTaxonomy => SystemRow::EntityTaxonomy {
            entity_type: "product".to_string(),
            entity_id: "product-one".to_string(),
            taxonomy_id: "taxonomy-one".to_string(),
            term_key: "term-one".to_string(),
            sort_order: 40,
        },
        SystemInsertCase::ProductActiveIngredient => SystemRow::ProductActiveIngredient {
            product_id: "product-one".to_string(),
            active_ingredient_id: "ingredient-one".to_string(),
            sort_order: 50,
        },
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
        parse_insert("INSERT INTO taxonomy_registry (id, unknown_column) VALUES (?1, ?2)").is_err()
    );
    assert!(parse_insert("INSERT INTO taxonomy_registry (id, id) VALUES (?1, ?2)").is_err());

    let row = representative_row(SystemInsertCase::TaxonomyRegistry);
    let extra_column = SystemInsertStatement {
        case: SystemInsertCase::TaxonomyRegistry,
        table: SystemTable::TaxonomyRegistry,
        sql: "INSERT INTO taxonomy_registry (id, domain, purpose, label) VALUES (?1, ?2, ?3, ?4)",
    };
    assert!(validate_statement(&row, &extra_column).is_err());
}
