//! Verifies every fixed system INSERT against the canonical ordered row descriptor.

use super::*;
use crate::{
    ledger::SystemColumn,
    projection::contract::{representative_row, SystemRowCase},
};
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
) -> Result<Vec<SystemColumn>, String> {
    let parsed = parse_insert(statement.sql)?;
    let descriptor = row.descriptor();
    if parsed.table != descriptor.table.as_str() || statement.table != descriptor.table {
        return Err(format!(
            "INSERT table differs from row descriptor for {:?}",
            descriptor.case
        ));
    }
    if parsed.columns != descriptor.columns {
        return Err(format!(
            "INSERT columns differ from ordered row descriptor for {:?}",
            descriptor.case
        ));
    }
    Ok(parsed.columns)
}

#[test]
fn every_system_insert_matches_its_case_table_and_ordered_columns() {
    let mut observed_cases = BTreeSet::new();
    let mut observed_columns = BTreeSet::new();

    for expected_case in SystemRowCase::ALL {
        let row = representative_row(expected_case);
        let statement = system_insert_statement(&row);
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
        SystemRowCase::ALL.into_iter().collect::<BTreeSet<_>>()
    );
    assert_eq!(
        observed_columns,
        SystemColumn::ALL.into_iter().collect::<BTreeSet<_>>()
    );
}

#[test]
fn structural_insert_parser_rejects_shape_column_and_order_divergence() {
    assert!(parse_insert("UPDATE taxonomy_registry SET domain = ?1").is_err());
    assert!(parse_insert("INSERT INTO  (id) VALUES (?1)").is_err());
    assert!(parse_insert("INSERT INTO taxonomy_registry () VALUES ()").is_err());
    assert!(
        parse_insert("INSERT INTO taxonomy_registry (id, unknown_column) VALUES (?1, ?2)").is_err()
    );
    assert!(parse_insert("INSERT INTO taxonomy_registry (id, id) VALUES (?1, ?2)").is_err());

    let row = representative_row(SystemRowCase::TaxonomyRegistry);
    let extra_column = SystemInsertStatement {
        case: SystemRowCase::TaxonomyRegistry,
        table: SystemTable::TaxonomyRegistry,
        sql: "INSERT INTO taxonomy_registry (id, domain, purpose, label) VALUES (?1, ?2, ?3, ?4)",
    };
    assert!(validate_statement(&row, &extra_column).is_err());

    let reordered = SystemInsertStatement {
        case: SystemRowCase::TaxonomyRegistry,
        table: SystemTable::TaxonomyRegistry,
        sql: "INSERT INTO taxonomy_registry (domain, id, purpose) VALUES (?1, ?2, ?3)",
    };
    assert!(validate_statement(&row, &reordered).is_err());
}
