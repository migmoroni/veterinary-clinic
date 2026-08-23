//! SQLite table discovery for capture changesets.

use rusqlite::Connection;

pub(super) fn user_tables(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT name
            FROM main.sqlite_master
            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
            "#,
        )
        .map_err(|error| format!("replication_table_list_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("replication_table_list_failed:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_table_list_row_failed:{error}"))
}
