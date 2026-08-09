//! SQLite opening, PRAGMA tuning, and small storage-owned schemas.
//!
//! Operational schemas are created by the TypeScript migrator; media indexes
//! and user logs are created here because they are Rust storage primitives.

use super::{ensure_database_manifest, DbType};
use crate::schema_versions::{
    CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION, CURRENT_USER_LOGS_SCHEMA_VERSION,
    CURRENT_USER_MEDIA_SCHEMA_VERSION,
};
use rusqlite::Connection;
use std::{fs, path::Path, time::Duration};

const USER_MEDIA_BLOBS_DDL: &str = r#"
CREATE TABLE IF NOT EXISTS blobs (
  hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
  thumbnail BLOB,
  mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
  width INTEGER CHECK(width IS NULL OR width > 0),
  height INTEGER CHECK(height IS NULL OR height > 0),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT,
  uploaded_at TEXT,
  removed_at TEXT
) WITHOUT ROWID
"#;

const SYSTEM_MEDIA_BLOBS_DDL: &str = r#"
CREATE TABLE IF NOT EXISTS blobs (
  hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
  thumbnail BLOB,
  mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
  size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
  width INTEGER CHECK(width IS NULL OR width > 0),
  height INTEGER CHECK(height IS NULL OR height > 0),
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
  uploaded_at TEXT
) WITHOUT ROWID
"#;

const USER_LOGS_DDL: &str = r#"
CREATE TABLE IF NOT EXISTS database_manifest (
  scope TEXT PRIMARY KEY CHECK(scope = 'user'),
  database_id TEXT NOT NULL UNIQUE CHECK(
    length(database_id) = 36
    AND substr(database_id, 9, 1) = '-'
    AND substr(database_id, 14, 1) = '-'
    AND substr(database_id, 15, 1) = '7'
    AND substr(database_id, 19, 1) = '-'
    AND substr(database_id, 24, 1) = '-'
  ),
  app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
  schema_version INTEGER NOT NULL CHECK(schema_version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permanent_deletion_logs (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL CHECK(domain IN ('user_data', 'user_media')),
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  deleted_by TEXT,
  snapshot_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  actor_id TEXT,
  created_at TEXT NOT NULL
);
"#;

pub fn open_sqlite_db(path: &Path, db_type: DbType) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("database_dir_create_failed:{error}"))?;
    }

    let connection =
        Connection::open(path).map_err(|error| format!("database_open_failed:{error}"))?;
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|error| format!("database_busy_timeout_failed:{error}"))?;
    connection.set_prepared_statement_cache_capacity(prepared_statement_cache_capacity(db_type));
    apply_sqlite_pragmas(&connection, db_type)?;
    let schema_was_empty = sqlite_schema_is_empty(&connection)?;
    validate_sqlite_user_version(&connection, db_type)?;
    match db_type {
        DbType::MediaIndex => connection
            .execute_batch(USER_MEDIA_BLOBS_DDL)
            .map_err(|error| format!("media_schema_failed:{error}"))?,
        DbType::SystemMediaIndex => connection
            .execute_batch(SYSTEM_MEDIA_BLOBS_DDL)
            .map_err(|error| format!("system_media_schema_failed:{error}"))?,
        DbType::Logs => {
            connection
                .execute_batch(USER_LOGS_DDL)
                .map_err(|error| format!("logs_schema_failed:{error}"))?;
            ensure_database_manifest(&connection)?;
        }
        DbType::Operational => {}
    }
    stamp_sqlite_user_version_if_needed(&connection, db_type, schema_was_empty)?;
    Ok(connection)
}

fn prepared_statement_cache_capacity(db_type: DbType) -> usize {
    match db_type {
        DbType::Operational => 128,
        DbType::MediaIndex | DbType::SystemMediaIndex => 64,
        DbType::Logs => 32,
    }
}

fn apply_sqlite_pragmas(connection: &Connection, db_type: DbType) -> Result<(), String> {
    // Common local-first pragmas: WAL for safe concurrent reads, foreign keys on,
    // and NORMAL sync as the balanced default for desktop storage.
    connection
        .execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;
            PRAGMA synchronous = NORMAL;
            PRAGMA page_size = 4096;
            "#,
        )
        .map_err(|error| format!("database_common_pragma_failed:{error}"))?;

    match db_type {
        DbType::Operational => connection
            .execute_batch("PRAGMA cache_size = -8000;")
            .map_err(|error| format!("database_operational_pragma_failed:{error}"))?,
        DbType::MediaIndex => connection
            .execute_batch(
                r#"
                PRAGMA cache_size = -4000;
                PRAGMA mmap_size = 33554432;
                "#,
            )
            .map_err(|error| format!("database_media_pragma_failed:{error}"))?,
        DbType::SystemMediaIndex => connection
            .execute_batch(
                r#"
                PRAGMA cache_size = -4000;
                PRAGMA mmap_size = 33554432;
                "#,
            )
            .map_err(|error| format!("database_system_media_pragma_failed:{error}"))?,
        DbType::Logs => connection
            .execute_batch("PRAGMA cache_size = -2000;")
            .map_err(|error| format!("database_logs_pragma_failed:{error}"))?,
    }
    Ok(())
}

fn current_schema_version_for_db_type(db_type: DbType) -> Option<i64> {
    match db_type {
        DbType::MediaIndex => Some(CURRENT_USER_MEDIA_SCHEMA_VERSION),
        DbType::SystemMediaIndex => Some(CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION),
        DbType::Logs => Some(CURRENT_USER_LOGS_SCHEMA_VERSION),
        DbType::Operational => None,
    }
}

fn sqlite_user_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("database_user_version_failed:{error}"))
}

fn set_sqlite_user_version(connection: &Connection, version: i64) -> Result<(), String> {
    connection
        .execute_batch(&format!("PRAGMA user_version = {version};"))
        .map_err(|error| format!("database_user_version_set_failed:{error}"))
}

fn sqlite_schema_is_empty(connection: &Connection) -> Result<bool, String> {
    let object_count = connection
        .query_row(
            r#"
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type IN ('table', 'view', 'trigger', 'index')
                AND name NOT LIKE 'sqlite_%'
            "#,
            [],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("database_schema_probe_failed:{error}"))?;
    Ok(object_count == 0)
}

fn validate_sqlite_user_version(connection: &Connection, db_type: DbType) -> Result<(), String> {
    let Some(target_version) = current_schema_version_for_db_type(db_type) else {
        return Ok(());
    };
    let current_version = sqlite_user_version(connection)?;
    if current_version > target_version {
        return Err(format!("database_schema_from_future:{current_version}"));
    }
    Ok(())
}

fn stamp_sqlite_user_version_if_needed(
    connection: &Connection,
    db_type: DbType,
    schema_was_empty: bool,
) -> Result<(), String> {
    let Some(target_version) = current_schema_version_for_db_type(db_type) else {
        return Ok(());
    };
    if sqlite_user_version(connection)? != 0 {
        return Ok(());
    }
    if schema_was_empty || matches!(db_type, DbType::Logs) {
        set_sqlite_user_version(connection, target_version)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn stamps_new_media_database_with_user_version() {
        let path = test_database_path("user-media-version");
        let connection = open_sqlite_db(&path, DbType::MediaIndex).expect("open media database");

        assert_eq!(
            sqlite_user_version(&connection).expect("read user_version"),
            CURRENT_USER_MEDIA_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn stamps_new_system_media_database_with_user_version() {
        let path = test_database_path("system-media-version");
        let connection =
            open_sqlite_db(&path, DbType::SystemMediaIndex).expect("open system media database");

        assert_eq!(
            sqlite_user_version(&connection).expect("read user_version"),
            CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn stamps_new_logs_database_with_user_version() {
        let path = test_database_path("logs-version");
        let connection = open_sqlite_db(&path, DbType::Logs).expect("open logs database");

        assert_eq!(
            sqlite_user_version(&connection).expect("read user_version"),
            CURRENT_USER_LOGS_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn rejects_future_media_schema_version() {
        let path = test_database_path("future-media-version");
        {
            let connection = Connection::open(&path).expect("create database");
            set_sqlite_user_version(&connection, CURRENT_USER_MEDIA_SCHEMA_VERSION + 1)
                .expect("set future version");
        }

        let error = match open_sqlite_db(&path, DbType::MediaIndex) {
            Ok(_) => panic!("future media schema should be rejected"),
            Err(error) => error,
        };

        assert_eq!(
            error,
            format!(
                "database_schema_from_future:{}",
                CURRENT_USER_MEDIA_SCHEMA_VERSION + 1
            )
        );
        remove_sqlite_file_set(&path);
    }

    fn test_database_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "vclinic-storage-{label}-{}-{}.db",
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
