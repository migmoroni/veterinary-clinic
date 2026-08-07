//! SQLite schema helpers used by local mirror bootstrap.

use rusqlite::{params, Connection, OptionalExtension};

pub(super) fn user_tables(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT name
            FROM sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            "#,
        )
        .map_err(|error| format!("replication_initial_table_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("replication_initial_table_select_failed:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_initial_table_row_failed:{error}"))
}

pub(super) fn table_exists(connection: &Connection, table: &str) -> Result<bool, String> {
    let exists = connection
        .query_row(
            "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1",
            params![table],
            |_| Ok(()),
        )
        .optional()
        .map_err(|error| format!("replication_initial_table_exists_failed:{error}"))?;
    Ok(exists.is_some())
}
