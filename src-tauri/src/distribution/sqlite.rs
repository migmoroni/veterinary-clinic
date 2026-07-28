//! SQLite helpers used by local distribution packages.
//!
//! These helpers validate imported DBs, clone empty schemas for CSV import and
//! produce safe snapshots with `VACUUM INTO`.

use super::{files::remove_file_if_exists, CURRENT_SCHEMA_VERSION};
use rusqlite::{params, Connection};
use std::path::Path;

pub(crate) fn vacuum_into(connection: &Connection, destination: &Path) -> Result<(), String> {
    let destination = destination
        .to_str()
        .ok_or_else(|| "vacuum_destination_not_utf8".to_string())?;
    connection
        .execute("VACUUM INTO ?1", params![destination])
        .map(|_| ())
        .map_err(|error| format!("vacuum_into_failed:{error}"))
}

pub(crate) fn user_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("database_user_version_failed:{error}"))
}

pub(crate) fn validate_sqlite_database(
    path: &Path,
    check_schema_version: bool,
) -> Result<(), String> {
    let connection =
        Connection::open(path).map_err(|error| format!("database_validate_open_failed:{error}"))?;
    let integrity = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|error| format!("database_integrity_check_failed:{error}"))?;
    if integrity != "ok" {
        return Err(format!("database_integrity_check_failed:{integrity}"));
    }

    if check_schema_version {
        let version = user_version(&connection)?;
        if version > CURRENT_SCHEMA_VERSION {
            return Err(format!("database_schema_from_future:{version}"));
        }
    }
    Ok(())
}

pub(crate) fn create_empty_schema_from(
    source: &Connection,
    destination: &Path,
) -> Result<(), String> {
    remove_file_if_exists(destination)?;
    let target = Connection::open(destination)
        .map_err(|error| format!("schema_clone_open_failed:{error}"))?;
    let mut statement = source
        .prepare(
            r#"
            SELECT sql
            FROM sqlite_master
            WHERE sql IS NOT NULL
                AND name NOT LIKE 'sqlite_%'
                AND type IN ('table', 'index', 'trigger', 'view')
            ORDER BY CASE type
                WHEN 'table' THEN 0
                WHEN 'index' THEN 1
                WHEN 'trigger' THEN 2
                WHEN 'view' THEN 3
                ELSE 4
            END, name
            "#,
        )
        .map_err(|error| format!("schema_clone_prepare_failed:{error}"))?;
    let sql_rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("schema_clone_query_failed:{error}"))?;

    // The CSV package carries data only; the current app schema remains the
    // source of truth for tables, indexes and constraints.
    for sql in sql_rows {
        target
            .execute_batch(&sql.map_err(|error| format!("schema_clone_row_failed:{error}"))?)
            .map_err(|error| format!("schema_clone_execute_failed:{error}"))?;
    }
    Ok(())
}

pub(crate) fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}
