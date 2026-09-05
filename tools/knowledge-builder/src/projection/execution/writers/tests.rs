//! Verifies every fixed system INSERT against the canonical ordered row descriptor.

use super::*;
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::{DatabaseKind, SYSTEM_DDL, SYSTEM_MEDIA_DDL},
    projection::contract::{
        representative_row, MetadataOperation, MetadataRow, SystemMediaProjectionOperation,
        SystemMediaRow, SystemProjectionOperation, SystemRowCase,
    },
    projection::coverage::{
        EntityIdentity, ObligationClass, ProjectionObligation, ProjectionTarget, RowEvent,
        RowIdentity, SourceToken, SystemColumn,
    },
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

fn metadata_operation(database: DatabaseKind) -> MetadataOperation {
    MetadataOperation {
        database,
        row: MetadataRow::Build {
            build_version: 1,
            builder_version: "0.5.0".to_string(),
            build_result_schema_version: 1,
            source_digest: vec![0; 32],
            locale: KnowledgeLocale::EnUs.to_string(),
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: SourceToken::BuildMetadata {
                database,
                locale: KnowledgeLocale::EnUs,
                release: false,
            },
            target: ProjectionTarget::BuildMetadata {
                database,
                locale: KnowledgeLocale::EnUs,
                release: false,
            },
            class: ObligationClass::Metadata,
        }]),
        event: RowEvent {
            database,
            table: SystemTable::KnowledgeBuildMetadata,
            row: RowIdentity::new("1"),
            entity: None,
        },
    }
}

fn system_operation(row: SystemRow) -> SystemProjectionOperation {
    let descriptor = row.descriptor();
    SystemProjectionOperation {
        obligations: BTreeSet::from([ProjectionObligation {
            source: SourceToken::Entity(EntityIdentity::new(
                "test",
                descriptor.identity.to_string(),
            )),
            target: ProjectionTarget::TableRow {
                database: DatabaseKind::System,
                table: descriptor.table,
                row: descriptor.identity.clone(),
            },
            class: ObligationClass::Entity,
        }]),
        event: RowEvent {
            database: DatabaseKind::System,
            table: descriptor.table,
            row: descriptor.identity,
            entity: None,
        },
        row,
    }
}

#[test]
fn statement_failure_rolls_back_metadata_and_rows_without_receipts() {
    let mut connection = Connection::open_in_memory().unwrap();
    connection.execute_batch(SYSTEM_DDL).unwrap();
    let row = representative_row(SystemRowCase::TaxonomyRegistry);
    let operations = [system_operation(row.clone()), system_operation(row)];
    assert!(write_system(
        &mut connection,
        &[metadata_operation(DatabaseKind::System)],
        &operations,
    )
    .is_err());
    let metadata: usize = connection
        .query_row("SELECT COUNT(*) FROM knowledge_build_metadata", [], |row| {
            row.get(0)
        })
        .unwrap();
    let rows: usize = connection
        .query_row("SELECT COUNT(*) FROM taxonomy_registry", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!((metadata, rows), (0, 0));
}

#[test]
fn commit_failure_rolls_back_the_single_system_transaction() {
    let mut connection = Connection::open_in_memory().unwrap();
    connection.execute_batch(SYSTEM_DDL).unwrap();
    connection
        .execute_batch("PRAGMA defer_foreign_keys = ON")
        .unwrap();
    let operation = system_operation(representative_row(SystemRowCase::LifeOrigin));
    assert!(write_system(
        &mut connection,
        &[metadata_operation(DatabaseKind::System)],
        &[operation],
    )
    .is_err());
    let metadata: usize = connection
        .query_row("SELECT COUNT(*) FROM knowledge_build_metadata", [], |row| {
            row.get(0)
        })
        .unwrap();
    let rows: usize = connection
        .query_row("SELECT COUNT(*) FROM life_origin_places", [], |row| {
            row.get(0)
        })
        .unwrap();
    assert_eq!((metadata, rows), (0, 0));
}

#[test]
fn system_media_metadata_and_asset_share_one_transaction() {
    let mut connection = Connection::open_in_memory().unwrap();
    connection.execute_batch(SYSTEM_MEDIA_DDL).unwrap();
    let row = SystemMediaRow {
        media_key: "condition/id/media/cover.jpg".to_string(),
        content_hash: vec![0; 32],
        thumbnail: vec![1, 2, 3],
        thumbnail_mime_type: "image/jpeg".to_string(),
        thumbnail_width: 1,
        thumbnail_height: 1,
        mime_type: "image/jpeg".to_string(),
        size_bytes: 3,
        width: 1,
        height: 1,
    };
    let event = RowEvent {
        database: DatabaseKind::SystemMedia,
        table: SystemTable::MediaAssets,
        row: RowIdentity::new(&row.media_key),
        entity: None,
    };
    let obligation = ProjectionObligation {
        source: SourceToken::MediaAsset {
            locale: KnowledgeLocale::EnUs,
            media_key: row.media_key.clone(),
        },
        target: ProjectionTarget::SystemMediaAsset {
            locale: KnowledgeLocale::EnUs,
            media_key: row.media_key.clone(),
        },
        class: ObligationClass::Media,
    };
    let operation = SystemMediaProjectionOperation {
        row: row.clone(),
        obligations: BTreeSet::from([obligation.clone()]),
        event: event.clone(),
    };
    let operations = [operation.clone(), operation];
    assert!(write_system_media(
        &mut connection,
        &[metadata_operation(DatabaseKind::SystemMedia)],
        &operations,
    )
    .is_err());
    let metadata: usize = connection
        .query_row("SELECT COUNT(*) FROM knowledge_build_metadata", [], |row| {
            row.get(0)
        })
        .unwrap();
    let assets: usize = connection
        .query_row("SELECT COUNT(*) FROM media_assets", [], |row| row.get(0))
        .unwrap();
    assert_eq!((metadata, assets), (0, 0));
}
