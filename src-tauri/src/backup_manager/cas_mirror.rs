use crate::storage::StorageManager;
use std::{
    fs,
    path::{Path, PathBuf},
};

// Incremental CAS mirror: CAS files are immutable, so automatic backups only
// copy missing .bin files once and then reuse this folder for full exports.
pub(crate) fn cas_mirror_user_path(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(storage
        .app_data_dir()?
        .join("backups")
        .join("cas_mirror")
        .join("user"))
}

pub(crate) fn sync_cas_incremental(storage: &StorageManager) -> Result<PathBuf, String> {
    let source = storage.user_vault_path();
    let destination = cas_mirror_user_path(storage)?;
    fs::create_dir_all(&destination)
        .map_err(|error| format!("cas_mirror_create_failed:{error}"))?;
    sync_cas_directory(&source, &source, &destination)?;
    Ok(destination)
}

pub(crate) fn merge_imported_cas(
    storage: &StorageManager,
    package_vault_user: &Path,
) -> Result<(), String> {
    merge_cas_directory(package_vault_user, &storage.user_vault_path())?;
    merge_cas_directory(package_vault_user, &cas_mirror_user_path(storage)?)
}

fn sync_cas_directory(
    source_root: &Path,
    current: &Path,
    mirror_root: &Path,
) -> Result<(), String> {
    if !current.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(current).map_err(|error| format!("cas_sync_read_failed:{error}"))? {
        let entry = entry.map_err(|error| format!("cas_sync_entry_failed:{error}"))?;
        let source_path = entry.path();
        if source_path.is_dir() {
            sync_cas_directory(source_root, &source_path, mirror_root)?;
            continue;
        }
        if !source_path.is_file()
            || source_path.extension().and_then(|value| value.to_str()) != Some("bin")
        {
            continue;
        }

        let relative_path = source_path
            .strip_prefix(source_root)
            .map_err(|_| "cas_sync_path_strip_failed".to_string())?;
        copy_cas_file_if_missing(&source_path, &mirror_root.join(relative_path))?;
    }
    Ok(())
}

fn merge_cas_directory(source: &Path, destination: &Path) -> Result<(), String> {
    if !source.is_dir() {
        fs::create_dir_all(destination)
            .map_err(|error| format!("cas_merge_destination_create_failed:{error}"))?;
        return Ok(());
    }

    for entry in fs::read_dir(source).map_err(|error| format!("cas_merge_read_failed:{error}"))? {
        let entry = entry.map_err(|error| format!("cas_merge_entry_failed:{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            merge_cas_directory(&source_path, &destination_path)?;
        } else if source_path.is_file() {
            copy_cas_file_if_missing(&source_path, &destination_path)?;
        }
    }
    Ok(())
}

fn copy_cas_file_if_missing(source: &Path, destination: &Path) -> Result<(), String> {
    if destination.is_file() {
        return Ok(());
    }
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("cas_copy_parent_create_failed:{error}"))?;
    }
    if destination.is_file() {
        return Ok(());
    }
    fs::copy(source, destination)
        .map(|_| ())
        .map_err(|error| format!("cas_copy_failed:{error}"))
}
