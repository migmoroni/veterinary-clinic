//! SQLite opening, PRAGMA tuning, and small storage-owned schemas.
//!
//! Operational schemas are created by the TypeScript migrator; media indexes
//! and user logs are created here because they are Rust storage primitives.

use super::{
    classify_connection_schema_version, ensure_database_manifest, ensure_not_from_future,
    set_schema_version, DbType, SchemaVersionStatus,
};
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
    let version_status = schema_version_status_for_db_type(&connection, db_type)?;
    if let Some(status) = version_status {
        ensure_not_from_future(status)?;
    }
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
    apply_storage_owned_schema_version_status(&connection, db_type, version_status)?;
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

fn schema_version_status_for_db_type(
    connection: &Connection,
    db_type: DbType,
) -> Result<Option<SchemaVersionStatus>, String> {
    let Some(target_version) = current_schema_version_for_db_type(db_type) else {
        return Ok(None);
    };
    classify_connection_schema_version(connection, target_version).map(Some)
}

fn apply_storage_owned_schema_version_status(
    connection: &Connection,
    db_type: DbType,
    version_status: Option<SchemaVersionStatus>,
) -> Result<(), String> {
    let Some(target_version) = current_schema_version_for_db_type(db_type) else {
        return Ok(());
    };
    let Some(version_status) = version_status else {
        return Ok(());
    };
    assert_storage_owned_schema(connection, db_type)?;
    match version_status {
        SchemaVersionStatus::Current => Ok(()),
        SchemaVersionStatus::MigrationRequired { .. } => {
            set_schema_version(connection, target_version)
        }
        SchemaVersionStatus::FromFuture { found, .. } => {
            Err(format!("database_schema_from_future:{found}"))
        }
    }
}

fn assert_storage_owned_schema(connection: &Connection, db_type: DbType) -> Result<(), String> {
    match db_type {
        DbType::MediaIndex => {
            assert_exact_tables(connection, &["blobs"], "media_database_schema_invalid")?;
            assert_exact_columns(
                connection,
                "blobs",
                &[
                    "hash",
                    "thumbnail",
                    "mime_type",
                    "size_bytes",
                    "width",
                    "height",
                    "sync_status",
                    "created_at",
                    "updated_at",
                    "updated_by",
                    "uploaded_at",
                    "removed_at",
                ],
                "media_database_schema_invalid",
            )
        }
        DbType::SystemMediaIndex => {
            assert_exact_tables(
                connection,
                &["blobs"],
                "system_media_database_schema_invalid",
            )?;
            assert_exact_columns(
                connection,
                "blobs",
                &[
                    "hash",
                    "thumbnail",
                    "mime_type",
                    "size_bytes",
                    "width",
                    "height",
                    "sync_status",
                    "uploaded_at",
                ],
                "system_media_database_schema_invalid",
            )
        }
        DbType::Logs => {
            assert_exact_tables(
                connection,
                &[
                    "database_manifest",
                    "permanent_deletion_logs",
                    "system_audit_logs",
                ],
                "logs_database_schema_invalid",
            )?;
            assert_exact_columns(
                connection,
                "database_manifest",
                &[
                    "scope",
                    "database_id",
                    "app_version",
                    "schema_version",
                    "created_at",
                    "updated_at",
                ],
                "logs_database_schema_invalid",
            )?;
            assert_exact_columns(
                connection,
                "permanent_deletion_logs",
                &[
                    "id",
                    "domain",
                    "target_table",
                    "target_id",
                    "deleted_by",
                    "snapshot_json",
                    "created_at",
                ],
                "logs_database_schema_invalid",
            )?;
            assert_exact_columns(
                connection,
                "system_audit_logs",
                &["id", "action_type", "description", "actor_id", "created_at"],
                "logs_database_schema_invalid",
            )
        }
        DbType::Operational => Ok(()),
    }
}

fn assert_exact_tables(
    connection: &Connection,
    expected_tables: &[&str],
    error_code: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(
            r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
                AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            "#,
        )
        .map_err(|error| format!("{error_code}:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("{error_code}:{error}"))?;
    let mut actual = Vec::new();
    for row in rows {
        actual.push(row.map_err(|error| format!("{error_code}:{error}"))?);
    }
    let expected = expected_tables
        .iter()
        .map(|table| table.to_string())
        .collect::<Vec<_>>();
    if actual != expected {
        return Err(error_code.to_string());
    }
    Ok(())
}

fn assert_exact_columns(
    connection: &Connection,
    table: &str,
    expected_columns: &[&str],
    error_code: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({})", quote_identifier(table)))
        .map_err(|error| format!("{error_code}:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("{error_code}:{error}"))?;
    let mut actual = Vec::new();
    for row in rows {
        actual.push(row.map_err(|error| format!("{error_code}:{error}"))?);
    }
    let expected = expected_columns
        .iter()
        .map(|column| column.to_string())
        .collect::<Vec<_>>();
    if actual != expected {
        return Err(error_code.to_string());
    }
    Ok(())
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::schema_version::read_schema_version;
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
            read_schema_version(&connection).expect("read user_version"),
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
            read_schema_version(&connection).expect("read user_version"),
            CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn stamps_new_logs_database_with_user_version() {
        let path = test_database_path("logs-version");
        let connection = open_sqlite_db(&path, DbType::Logs).expect("open logs database");

        assert_eq!(
            read_schema_version(&connection).expect("read user_version"),
            CURRENT_USER_LOGS_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn adopts_recognized_user_media_schema_from_zero_version() {
        let path = test_database_path("adopt-user-media-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch(USER_MEDIA_BLOBS_DDL)
                .expect("create media schema");
        }

        let connection = open_sqlite_db(&path, DbType::MediaIndex).expect("open media database");

        assert_eq!(
            read_schema_version(&connection).expect("read user_version"),
            CURRENT_USER_MEDIA_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn adopts_recognized_system_media_schema_from_zero_version() {
        let path = test_database_path("adopt-system-media-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch(SYSTEM_MEDIA_BLOBS_DDL)
                .expect("create system media schema");
        }

        let connection =
            open_sqlite_db(&path, DbType::SystemMediaIndex).expect("open system media database");

        assert_eq!(
            read_schema_version(&connection).expect("read user_version"),
            CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn adopts_recognized_logs_schema_from_zero_version() {
        let path = test_database_path("adopt-logs-version");
        {
            let connection = Connection::open(&path).expect("create database");
            connection
                .execute_batch(USER_LOGS_DDL)
                .expect("create logs schema");
        }

        let connection = open_sqlite_db(&path, DbType::Logs).expect("open logs database");

        assert_eq!(
            read_schema_version(&connection).expect("read user_version"),
            CURRENT_USER_LOGS_SCHEMA_VERSION
        );
        remove_sqlite_file_set(&path);
    }

    #[test]
    fn rejects_future_media_schema_version() {
        let path = test_database_path("future-media-version");
        {
            let connection = Connection::open(&path).expect("create database");
            set_schema_version(&connection, CURRENT_USER_MEDIA_SCHEMA_VERSION + 1)
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
