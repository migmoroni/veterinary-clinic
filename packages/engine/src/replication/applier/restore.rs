//! Full restore from a local replication target.
//!
//! Patch application handles the steady-state path. Restore is intentionally
//! isolated because it replaces the whole user bundle and reopens connections.

use crate::{
    replication::types::{RestoreFromBackupRequest, StorageDomain},
    storage::StorageManager,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

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
