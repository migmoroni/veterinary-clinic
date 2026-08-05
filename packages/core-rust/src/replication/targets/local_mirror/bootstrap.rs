//! Local mirror bootstrap through full-state changesets.
//!
//! When a folder is selected, both sides may already have data. The clean path
//! is to generate one full-state changeset from the app and one from the mirror
//! using empty schema baselines, then apply them crosswise with the same LWW
//! handler used by normal inbound patches.

use super::schema::{table_exists, user_tables};
use crate::{
    replication::{applier, capture, outbox::queue, types::StorageDomain},
    storage::StorageManager,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(super) fn bootstrap_databases(
    storage: &StorageManager,
    target_path: &Path,
) -> Result<(), String> {
    for domain in [
        StorageDomain::UserData,
        StorageDomain::UserMedia,
        StorageDomain::UserLogs,
    ] {
        bootstrap_domain(storage, target_path, domain)?;
    }
    Ok(())
}

fn bootstrap_domain(
    storage: &StorageManager,
    target_path: &Path,
    domain: StorageDomain,
) -> Result<(), String> {
    let target_connection =
        applier::open_domain_database(&target_path.join(domain.base_database_name()), domain)?;
    match domain {
        StorageDomain::UserData => {
            let active = storage
                .user_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            bootstrap_pair(storage, &active, &target_connection, domain)
        }
        StorageDomain::UserMedia => {
            let active = storage
                .user_media_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            bootstrap_pair(storage, &active, &target_connection, domain)
        }
        StorageDomain::UserLogs => {
            let active = storage
                .user_logs_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            bootstrap_pair(storage, &active, &target_connection, domain)
        }
    }
}

fn bootstrap_pair(
    storage: &StorageManager,
    active: &Connection,
    target: &Connection,
    domain: StorageDomain,
) -> Result<(), String> {
    ensure_target_has_active_tables(active, target)?;

    let active_empty = empty_baseline_path(storage, domain, "active")?;
    let target_empty = empty_baseline_path(storage, domain, "target")?;
    create_empty_schema_baseline(active, &active_empty)?;
    create_empty_schema_baseline(target, &target_empty)?;

    let active_patch = capture::create_patch_against_baseline(active, &active_empty)?;
    let target_patch = capture::create_patch_against_baseline(target, &target_empty)?;

    if !target_patch.is_empty() {
        applier::apply_patch_to_connection(active, &target_patch)?;
    }
    if !active_patch.is_empty() {
        applier::apply_patch_to_connection(target, &active_patch)?;
    }
    Ok(())
}

fn empty_baseline_path(
    storage: &StorageManager,
    domain: StorageDomain,
    side: &str,
) -> Result<PathBuf, String> {
    Ok(queue::replication_dir(storage)?
        .join("bootstrap_empty")
        .join(side)
        .join(domain.base_database_name()))
}

fn create_empty_schema_baseline(source: &Connection, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_bootstrap_baseline_dir_failed:{error}"))?;
    }
    remove_file_if_exists(destination)?;
    let connection = Connection::open(destination)
        .map_err(|error| format!("replication_bootstrap_baseline_open_failed:{error}"))?;
    connection
        .execute_batch("PRAGMA foreign_keys = OFF;")
        .map_err(|error| format!("replication_bootstrap_baseline_pragma_failed:{error}"))?;
    for sql in table_create_sqls(source)? {
        connection
            .execute_batch(&sql)
            .map_err(|error| format!("replication_bootstrap_baseline_schema_failed:{error}"))?;
    }
    Ok(())
}

fn ensure_target_has_active_tables(active: &Connection, target: &Connection) -> Result<(), String> {
    for table in user_tables(active)? {
        if table_exists(target, &table)? {
            continue;
        }
        let Some(create_sql) = active
            .query_row(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?1",
                params![table],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|error| format!("replication_bootstrap_schema_select_failed:{error}"))?
        else {
            continue;
        };
        target
            .execute_batch(&create_sql)
            .map_err(|error| format!("replication_bootstrap_schema_create_failed:{error}"))?;
    }
    Ok(())
}

fn table_create_sqls(connection: &Connection) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT sql
            FROM sqlite_master
            WHERE type = 'table'
              AND name NOT LIKE 'sqlite_%'
              AND sql IS NOT NULL
            ORDER BY name
            "#,
        )
        .map_err(|error| format!("replication_bootstrap_table_sql_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|error| format!("replication_bootstrap_table_sql_select_failed:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_bootstrap_table_sql_row_failed:{error}"))
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    if path.is_file() {
        fs::remove_file(path)
            .map_err(|error| format!("replication_bootstrap_baseline_remove_failed:{error}"))?;
    }
    Ok(())
}
