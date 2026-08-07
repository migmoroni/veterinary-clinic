//! Last-write-wins conflict handling for SQLite changesets.
//!
//! Conflict decisions are deliberately conservative. Only data/conflict cases
//! may replace local rows, and only when the incoming patch carries a newer
//! audit timestamp than the local conflict row.

use rusqlite::{
    session::{ChangesetItem, ConflictAction, ConflictType},
    types::ValueRef,
    Connection,
};
use std::collections::HashMap;

const TIMESTAMP_PRIORITY: [&str; 5] = [
    "updated_at",
    "removed_at",
    "uploaded_at",
    "created_at",
    "applied_at",
];

pub(super) fn conflict_action(
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

pub(super) fn table_timestamp_indexes(
    connection: &Connection,
) -> Result<HashMap<String, Vec<usize>>, String> {
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

#[cfg(test)]
mod tests {
    use super::super::apply_patch_to_connection;
    use rusqlite::{session::Session, Connection};

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
