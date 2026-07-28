//! Applies inbound changes to active databases.
//!
//! This is used by explicit inbound IPC, target pulls and restore flows. It
//! applies SQLite changesets with a conservative LWW conflict handler based on
//! table audit timestamps.

use crate::{
    replication::types::{PatchEnvelope, RestoreFromBackupRequest, StorageDomain},
    storage::{
        bytes_to_hex, decode_hash_hex, open_sqlite_db, sha256, DbType,
        StorageDomain as CasStorageDomain, StorageManager,
    },
};
use rusqlite::{
    session::{ChangesetItem, ConflictAction, ConflictType},
    types::ValueRef,
    Connection,
};
use std::{
    collections::HashMap,
    fs,
    io::Cursor,
    path::{Path, PathBuf},
};

const TIMESTAMP_PRIORITY: [&str; 5] = [
    "updated_at",
    "removed_at",
    "uploaded_at",
    "created_at",
    "applied_at",
];

pub(crate) fn apply_patch_to_connection(
    connection: &Connection,
    patch_bytes: &[u8],
) -> Result<(), String> {
    connection
        .execute_batch("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;")
        .map_err(|error| format!("replication_apply_begin_failed:{error}"))?;
    let result = (|| {
        let timestamp_indexes = table_timestamp_indexes(connection)?;
        let mut input = Cursor::new(patch_bytes);
        connection
            .apply_strm(
                &mut input,
                None::<fn(&str) -> bool>,
                move |conflict_type, item| {
                    lww_conflict_action(conflict_type, item, &timestamp_indexes)
                },
            )
            .map_err(|error| format!("replication_changeset_apply_failed:{error}"))?;
        Ok(())
    })();

    if result.is_ok() {
        connection
            .execute_batch("COMMIT; PRAGMA foreign_keys = ON;")
            .map_err(|error| format!("replication_apply_commit_failed:{error}"))?;
    } else {
        let _ = connection.execute_batch("ROLLBACK; PRAGMA foreign_keys = ON;");
    }
    result
}

pub(crate) fn apply_envelope_to_active(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    write_inbound_media_files(storage, envelope)?;
    let connection = match envelope.domain {
        StorageDomain::UserData => storage.user_db.clone(),
        StorageDomain::UserMedia => storage.user_media_db.clone(),
        StorageDomain::UserLogs => storage.user_logs_db.clone(),
    };
    let guard = connection
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    apply_patch_to_connection(&guard, &envelope.patch_bytes)
}

pub(crate) fn restore_from_backup(
    storage: &StorageManager,
    request: RestoreFromBackupRequest,
) -> Result<(), String> {
    let source_root = PathBuf::from(request.backup_path);
    if !source_root.is_dir() {
        return Err("replication_restore_path_invalid".to_string());
    }

    let user_db_source = source_root.join(StorageDomain::UserData.base_database_name());
    let media_db_source = source_root.join(StorageDomain::UserMedia.base_database_name());
    let logs_db_source = source_root.join(StorageDomain::UserLogs.base_database_name());
    if !user_db_source.is_file() || !media_db_source.is_file() || !logs_db_source.is_file() {
        return Err("replication_restore_database_missing".to_string());
    }

    storage.close_user_bundle_connections()?;
    let result = (|| {
        replace_file(&user_db_source, &storage.user_database_path())?;
        replace_file(&media_db_source, &storage.user_media_database_path())?;
        replace_file(&logs_db_source, &storage.user_logs_database_path())?;
        replace_dir_recursive_if_exists(
            &source_root
                .join(StorageDomain::UserMedia.as_str())
                .join("vault"),
            &storage.user_vault_path(),
        )?;
        Ok(())
    })();
    let reopen = storage.reopen_user_bundle_connections();
    result.and(reopen)
}

pub(crate) fn open_domain_database(
    path: &Path,
    domain: StorageDomain,
) -> Result<Connection, String> {
    let db_type = match domain {
        StorageDomain::UserData => DbType::Operational,
        StorageDomain::UserMedia => DbType::MediaIndex,
        StorageDomain::UserLogs => DbType::Logs,
    };
    open_sqlite_db(path, db_type)
}

fn lww_conflict_action(
    conflict_type: ConflictType,
    item: ChangesetItem,
    timestamp_indexes: &HashMap<String, Vec<usize>>,
) -> ConflictAction {
    match conflict_type {
        ConflictType::SQLITE_CHANGESET_FOREIGN_KEY | ConflictType::SQLITE_CHANGESET_CONSTRAINT => {
            ConflictAction::SQLITE_CHANGESET_OMIT
        }
        ConflictType::SQLITE_CHANGESET_DATA | ConflictType::SQLITE_CHANGESET_CONFLICT => {
            if incoming_patch_is_newer(&item, timestamp_indexes) {
                ConflictAction::SQLITE_CHANGESET_REPLACE
            } else {
                ConflictAction::SQLITE_CHANGESET_OMIT
            }
        }
        ConflictType::SQLITE_CHANGESET_NOTFOUND | ConflictType::UNKNOWN => {
            ConflictAction::SQLITE_CHANGESET_OMIT
        }
        _ => ConflictAction::SQLITE_CHANGESET_OMIT,
    }
}

fn incoming_patch_is_newer(
    item: &ChangesetItem,
    timestamp_indexes: &HashMap<String, Vec<usize>>,
) -> bool {
    let Ok(operation) = item.op() else {
        return false;
    };
    let Some(indexes) = timestamp_indexes.get(operation.table_name()) else {
        return false;
    };
    let incoming = best_patch_timestamp(item, indexes);
    let local = best_conflict_timestamp(item, indexes);
    match (incoming, local) {
        (Some(incoming), Some(local)) => incoming > local,
        (Some(_), None) => true,
        _ => false,
    }
}

fn best_patch_timestamp(item: &ChangesetItem, indexes: &[usize]) -> Option<String> {
    for index in indexes {
        if let Ok(value) = item.new_value(*index) {
            if let Some(sort_key) = timestamp_sort_key(value) {
                return Some(sort_key);
            }
        }
        if let Ok(value) = item.old_value(*index) {
            if let Some(sort_key) = timestamp_sort_key(value) {
                return Some(sort_key);
            }
        }
    }
    None
}

fn best_conflict_timestamp(item: &ChangesetItem, indexes: &[usize]) -> Option<String> {
    for index in indexes {
        if let Ok(value) = item.conflict(*index) {
            if let Some(sort_key) = timestamp_sort_key(value) {
                return Some(sort_key);
            }
        }
    }
    None
}

fn table_timestamp_indexes(connection: &Connection) -> Result<HashMap<String, Vec<usize>>, String> {
    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            "#,
        )
        .map_err(|error| format!("replication_lww_table_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("replication_lww_table_select_failed:{error}"))?;
    let mut indexes = HashMap::new();
    for table in rows {
        let table = table.map_err(|error| format!("replication_lww_table_row_failed:{error}"))?;
        let columns = table_columns(connection, &table)?;
        let table_indexes = TIMESTAMP_PRIORITY
            .iter()
            .filter_map(|column| columns.iter().position(|candidate| candidate == column))
            .collect::<Vec<_>>();
        if !table_indexes.is_empty() {
            indexes.insert(table, table_indexes);
        }
    }
    Ok(indexes)
}

fn table_columns(connection: &Connection, table: &str) -> Result<Vec<String>, String> {
    let sql = format!("PRAGMA table_info({})", quote_identifier(table));
    let mut statement = connection
        .prepare_cached(&sql)
        .map_err(|error| format!("replication_lww_column_prepare_failed:{table}:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("replication_lww_column_select_failed:{table}:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_lww_column_row_failed:{table}:{error}"))
}

fn quote_identifier(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn timestamp_sort_key(value: ValueRef<'_>) -> Option<String> {
    match value {
        ValueRef::Text(bytes) => {
            let text = std::str::from_utf8(bytes).ok()?;
            let key = text
                .chars()
                .filter(|character| character.is_ascii_digit())
                .collect::<String>();
            (!key.is_empty()).then_some(key)
        }
        ValueRef::Integer(value) => Some(format!("{value:020}")),
        ValueRef::Real(value) => Some(format!("{:020}", value as i64)),
        ValueRef::Null | ValueRef::Blob(_) => None,
    }
}

fn write_inbound_media_files(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    if envelope.domain != StorageDomain::UserMedia {
        return Ok(());
    }
    for media in &envelope.media_files {
        let hash = decode_hash_hex(&media.hash_hex)?;
        let calculated_hash = sha256(&media.bytes);
        if bytes_to_hex(&calculated_hash) != media.hash_hex {
            return Err("replication_inbound_media_hash_mismatch".to_string());
        }
        storage.write_cas_file(CasStorageDomain::User, &hash, &media.bytes)?;
    }
    Ok(())
}

fn replace_file(source: &Path, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_restore_dir_failed:{error}"))?;
    }
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|error| format!("replication_restore_copy_failed:{error}"))
}

fn copy_dir_recursive_if_exists(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.exists() {
        return Ok(());
    }
    fs::create_dir_all(destination)
        .map_err(|error| format!("replication_restore_vault_dir_failed:{error}"))?;
    for entry in fs::read_dir(source)
        .map_err(|error| format!("replication_restore_vault_read_failed:{error}"))?
    {
        let entry =
            entry.map_err(|error| format!("replication_restore_vault_entry_failed:{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_recursive_if_exists(&source_path, &destination_path)?;
        } else if source_path.is_file() {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("replication_restore_vault_parent_failed:{error}"))?;
            }
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("replication_restore_vault_copy_failed:{error}"))?;
        }
    }
    Ok(())
}

fn replace_dir_recursive_if_exists(source: &Path, destination: &Path) -> Result<(), String> {
    if destination.exists() {
        fs::remove_dir_all(destination)
            .map_err(|error| format!("replication_restore_vault_remove_failed:{error}"))?;
    }
    fs::create_dir_all(destination)
        .map_err(|error| format!("replication_restore_vault_dir_failed:{error}"))?;
    copy_dir_recursive_if_exists(source, destination)
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::session::Session;

    #[test]
    fn applies_changeset_generated_from_local_edit() {
        let patch = update_patch("remote", "2026-07-23T10:00:00Z");
        let target = base_connection();

        apply_patch_to_connection(&target, &patch).expect("apply patch");

        assert_record(&target, "remote", "2026-07-23T10:00:00Z");
    }

    #[test]
    fn lww_keeps_app_row_when_app_is_newer() {
        let patch = update_patch("remote-old", "2026-07-23T10:00:00Z");
        let target = base_connection();
        target
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                ["local-new", "2026-07-23T11:00:00Z"],
            )
            .expect("prepare newer local row");

        apply_patch_to_connection(&target, &patch).expect("apply older patch");

        assert_record(&target, "local-new", "2026-07-23T11:00:00Z");
    }

    #[test]
    fn lww_replaces_app_row_when_patch_is_newer() {
        let patch = update_patch("remote-new", "2026-07-23T12:00:00Z");
        let target = base_connection();
        target
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                ["local-old", "2026-07-23T11:00:00Z"],
            )
            .expect("prepare older local row");

        apply_patch_to_connection(&target, &patch).expect("apply newer patch");

        assert_record(&target, "remote-new", "2026-07-23T12:00:00Z");
    }

    fn update_patch(value: &str, updated_at: &str) -> Vec<u8> {
        let source = base_connection();
        let mut session = Session::new(&source).expect("session");
        session.attach(Some("records")).expect("attach records");
        source
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                [value, updated_at],
            )
            .expect("source update");
        let mut patch = Vec::new();
        session
            .changeset_strm(&mut patch)
            .expect("changeset stream");
        patch
    }

    fn base_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("open in-memory db");
        connection
            .execute_batch(
                r#"
                CREATE TABLE records (
                    id TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                INSERT INTO records (id, value, updated_at, created_at)
                VALUES ('a', 'base', '2026-07-23T09:00:00Z', '2026-07-23T09:00:00Z');
                "#,
            )
            .expect("create schema");
        connection
    }

    fn assert_record(connection: &Connection, value: &str, updated_at: &str) {
        let row = connection
            .query_row(
                "SELECT value, updated_at FROM records WHERE id = 'a'",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("load row");
        assert_eq!((value.to_string(), updated_at.to_string()), row);
    }
}
