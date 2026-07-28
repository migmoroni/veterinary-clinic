//! Baseline snapshots for the capture.
//!
//! Baselines are local comparison files. They are not backup files and should be
//! reset after any bootstrap or inbound sync that changes active databases.

use crate::{
    replication::{outbox::queue, types::StorageDomain},
    storage::StorageManager,
};
use rusqlite::Connection;
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(crate) fn baseline_path(
    storage: &StorageManager,
    domain: StorageDomain,
) -> Result<PathBuf, String> {
    Ok(queue::replication_dir(storage)?
        .join("baseline")
        .join(domain.base_database_name()))
}

pub(crate) fn snapshot_active_database(
    storage: &StorageManager,
    domain: StorageDomain,
    destination: &Path,
) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_baseline_dir_failed:{error}"))?;
    }
    let temp_path = destination.with_extension("db.tmp");
    remove_file_if_exists(&temp_path)?;
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
    remove_file_if_exists(destination)?;
    fs::rename(&temp_path, destination)
        .map_err(|error| format!("replication_baseline_commit_failed:{error}"))?;
    Ok(())
}

pub(crate) fn snapshot_connection(
    connection: &Connection,
    destination: &Path,
) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_baseline_dir_failed:{error}"))?;
    }
    let temp_path = destination.with_extension("db.tmp");
    remove_file_if_exists(&temp_path)?;
    vacuum_into(connection, &temp_path)?;
    remove_file_if_exists(destination)?;
    fs::rename(&temp_path, destination)
        .map_err(|error| format!("replication_baseline_commit_failed:{error}"))?;
    Ok(())
}

fn vacuum_into(connection: &Connection, destination: &Path) -> Result<(), String> {
    let sql_path = path_to_string(destination)?.replace('\'', "''");
    connection
        .execute_batch(&format!("VACUUM INTO '{sql_path}';"))
        .map_err(|error| format!("replication_baseline_vacuum_failed:{error}"))
}

fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    if path.is_file() {
        fs::remove_file(path).map_err(|error| format!("replication_file_remove_failed:{error}"))?;
    }
    Ok(())
}

pub(crate) fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| "replication_path_not_utf8".to_string())
}
