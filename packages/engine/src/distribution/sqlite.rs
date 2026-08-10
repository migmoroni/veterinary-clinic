//! SQLite helpers used by local distribution packages.
//!
//! These helpers validate imported DBs, clone empty schemas for CSV import and
//! produce safe snapshots with `VACUUM INTO`.

use super::files::remove_file_if_exists;
use crate::storage::{
    classify_connection_schema_version, ensure_not_from_future, SchemaVersionStatus,
};
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

pub(crate) fn validate_sqlite_database(
    path: &Path,
    target_schema_version: Option<i64>,
) -> Result<Option<SchemaVersionStatus>, String> {
    let connection =
        Connection::open(path).map_err(|error| format!("database_validate_open_failed:{error}"))?;
    let integrity = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0))
        .map_err(|error| format!("database_integrity_check_failed:{error}"))?;
    if integrity != "ok" {
        return Err(format!("database_integrity_check_failed:{integrity}"));
    }

    let Some(target_schema_version) = target_schema_version else {
        return Ok(None);
    };
    let status = classify_connection_schema_version(&connection, target_schema_version)?;
    ensure_not_from_future(status)?;
    Ok(Some(status))
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::set_schema_version;
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn validation_classifies_zero_version_as_migration_required() {
        let path = test_database_path("distribution-zero-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch("CREATE TABLE sample (id TEXT PRIMARY KEY);")
                .expect("create table");
        }

        let status = validate_sqlite_database(&path, Some(1)).expect("validate database");

        assert_eq!(
            status,
            Some(SchemaVersionStatus::MigrationRequired { from: 0, to: 1 })
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn validation_classifies_current_version() {
        let path = test_database_path("distribution-current-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch("CREATE TABLE sample (id TEXT PRIMARY KEY);")
                .expect("create table");
            set_schema_version(&connection, 1).expect("set version");
        }

        let status = validate_sqlite_database(&path, Some(1)).expect("validate database");

        assert_eq!(status, Some(SchemaVersionStatus::Current));
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn validation_rejects_future_version() {
        let path = test_database_path("distribution-future-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch("CREATE TABLE sample (id TEXT PRIMARY KEY);")
                .expect("create table");
            set_schema_version(&connection, 2).expect("set version");
        }

        let error = match validate_sqlite_database(&path, Some(1)) {
            Ok(_) => panic!("future schema should be rejected"),
            Err(error) => error,
        };

        assert_eq!(error, "database_schema_from_future:2");
        remove_sqlite_file_set(&path);
    }

    fn test_database_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "vclinic-distribution-{label}-{}-{}.db",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }

    fn remove_sqlite_file_set(path: &Path) {
        let _ = fs::remove_file(path);
        let _ = fs::remove_file(path.with_extension("db-wal"));
        let _ = fs::remove_file(path.with_extension("db-shm"));
    }
}
