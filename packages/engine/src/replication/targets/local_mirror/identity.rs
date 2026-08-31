//! Database identity guard for local mirrors.
//!
//! The local mirror is allowed to reconcile only when its logs database carries
//! the same `database_id` as the active app. This prevents accidentally merging
//! data from another clinic/base when the user selects the wrong folder.

use crate::{
    replication::types::UserStorageDomain,
    storage::{ensure_same_database_identity, StorageManager},
};
use rusqlite::Connection;
use std::path::Path;

pub(super) fn validate_existing_target(
    storage: &StorageManager,
    target_path: &Path,
    target_had_any_base_database: bool,
) -> Result<(), String> {
    if !target_had_any_base_database {
        return Ok(());
    }

    let target_logs_path = target_path.join(UserStorageDomain::Logs.base_database_name());
    if !target_logs_path.is_file() {
        return Err("replication_target_logs_manifest_missing".to_string());
    }

    let active_logs = storage
        .user_logs_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    let target_logs = Connection::open(&target_logs_path)
        .map_err(|error| format!("replication_target_logs_open_failed:{error}"))?;
    ensure_same_database_identity(&active_logs, &target_logs)
}

pub(super) fn validate_current_target(
    storage: &StorageManager,
    target_path: &Path,
) -> Result<(), String> {
    validate_existing_target(storage, target_path, true)
}
