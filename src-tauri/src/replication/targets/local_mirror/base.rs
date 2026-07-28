//! Base database bootstrap for the local mirror target.
//!
//! A selected folder must immediately contain the three user-domain base
//! databases. Existing files are kept; missing ones are created with VACUUM INTO
//! so WAL state is captured safely.

use crate::{replication::types::StorageDomain, storage::StorageManager};
use rusqlite::Connection;
use std::{fs, path::Path};

pub(super) fn ensure_all_base_databases(
    storage: &StorageManager,
    target_path: &Path,
) -> Result<(), String> {
    for domain in [
        StorageDomain::UserData,
        StorageDomain::UserMedia,
        StorageDomain::UserLogs,
    ] {
        ensure_base_database(storage, target_path, domain)?;
    }
    Ok(())
}

fn ensure_base_database(
    storage: &StorageManager,
    target_path: &Path,
    domain: StorageDomain,
) -> Result<(), String> {
    let destination = target_path.join(domain.base_database_name());
    if destination.is_file() {
        return Ok(());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_base_dir_failed:{error}"))?;
    }

    let temp_path = destination.with_extension("db.tmp");
    if temp_path.is_file() {
        fs::remove_file(&temp_path)
            .map_err(|error| format!("replication_base_temp_remove_failed:{error}"))?;
    }

    match domain {
        StorageDomain::UserData => {
            let guard = storage
                .user_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            vacuum_into(&guard, &temp_path)?;
        }
        StorageDomain::UserMedia => {
            let guard = storage
                .user_media_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            vacuum_into(&guard, &temp_path)?;
        }
        StorageDomain::UserLogs => {
            let guard = storage
                .user_logs_db
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?;
            vacuum_into(&guard, &temp_path)?;
        }
    }

    fs::rename(&temp_path, &destination)
        .map_err(|error| format!("replication_base_commit_failed:{error}"))?;
    Ok(())
}

fn vacuum_into(connection: &Connection, destination: &Path) -> Result<(), String> {
    let sql_path = destination
        .to_str()
        .ok_or_else(|| "replication_base_path_not_utf8".to_string())?
        .replace('\'', "''");
    connection
        .execute_batch(&format!("VACUUM INTO '{sql_path}';"))
        .map_err(|error| format!("replication_base_vacuum_failed:{error}"))
}
