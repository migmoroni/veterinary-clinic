use super::DbType;
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
    match db_type {
        DbType::MediaIndex => connection
            .execute_batch(USER_MEDIA_BLOBS_DDL)
            .map_err(|error| format!("media_schema_failed:{error}"))?,
        DbType::SystemMediaIndex => connection
            .execute_batch(SYSTEM_MEDIA_BLOBS_DDL)
            .map_err(|error| format!("system_media_schema_failed:{error}"))?,
        DbType::Logs => connection
            .execute_batch(USER_LOGS_DDL)
            .map_err(|error| format!("logs_schema_failed:{error}"))?,
        DbType::Operational => {}
    }
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
