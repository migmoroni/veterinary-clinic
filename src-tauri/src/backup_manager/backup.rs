use super::{
    cas_mirror::sync_cas_incremental,
    contracts::{BackupFileInfo, PackageExportType, PackageResponse},
    db_snapshot::create_db_snapshot,
    exporter::export_native_package_to_path,
    files::{path_to_string, remove_file_if_exists},
    time::{date_for_file, system_time_to_iso, timestamp_for_file},
    DB_SNAPSHOT_KEEP_COUNT,
};
use crate::storage::StorageManager;
use std::{
    fs,
    path::{Path, PathBuf},
};

// Backup flow: automatic backups are incremental for CAS and lightweight for DB.
// Manual/pre-import packages still delegate to the exporter when a full archive
// is needed.
pub(crate) fn create_automatic_backup(storage: &StorageManager) -> Result<PackageResponse, String> {
    sync_cas_incremental(storage)?;

    let snapshots_dir = db_snapshots_dir(storage)?;
    fs::create_dir_all(&snapshots_dir)
        .map_err(|error| format!("db_snapshots_dir_create_failed:{error}"))?;
    let destination_path = snapshots_dir.join(format!("db_snapshot_{}.zip", date_for_file()));
    create_db_snapshot(storage, &destination_path)?;
    apply_db_snapshot_retention(&snapshots_dir)?;

    Ok(PackageResponse {
        path: path_to_string(&destination_path)?,
        safety_backup_path: None,
    })
}

pub(crate) fn create_pre_import_backup(storage: &StorageManager) -> Result<PathBuf, String> {
    let backups_dir = backups_dir(storage)?;
    fs::create_dir_all(&backups_dir)
        .map_err(|error| format!("backup_dir_create_failed:{error}"))?;

    let destination_path = backups_dir.join(format!("pre_import_{}.zip", timestamp_for_file()));
    export_native_package_to_path(storage, &destination_path, PackageExportType::Native)?;
    Ok(destination_path)
}

pub(crate) fn list_backups(storage: &StorageManager) -> Result<Vec<BackupFileInfo>, String> {
    let backups_dir = backups_dir(storage)?;
    let mut files = Vec::new();
    collect_zip_files(&backups_dir, &mut files)?;
    collect_zip_files(&db_snapshots_dir(storage)?, &mut files)?;

    files.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
    Ok(files)
}

fn backups_dir(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(storage.app_data_dir()?.join("backups"))
}

fn db_snapshots_dir(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(backups_dir(storage)?.join("db_snapshots"))
}

fn apply_db_snapshot_retention(snapshots_dir: &Path) -> Result<(), String> {
    let mut files = Vec::new();
    for entry in fs::read_dir(snapshots_dir)
        .map_err(|error| format!("backup_retention_read_failed:{error}"))?
    {
        let entry = entry.map_err(|error| format!("backup_retention_entry_failed:{error}"))?;
        let path = entry.path();
        let file_name = path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if path.is_file() && file_name.starts_with("db_snapshot_") && file_name.ends_with(".zip") {
            let modified = entry
                .metadata()
                .and_then(|metadata| metadata.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            files.push((path, modified));
        }
    }

    files.sort_by(|left, right| right.1.cmp(&left.1));
    for (path, _) in files.into_iter().skip(DB_SNAPSHOT_KEEP_COUNT) {
        remove_file_if_exists(&path)?;
    }
    Ok(())
}

fn collect_zip_files(folder: &Path, output: &mut Vec<BackupFileInfo>) -> Result<(), String> {
    if !folder.is_dir() {
        return Ok(());
    }

    for entry in fs::read_dir(folder).map_err(|error| format!("backup_dir_read_failed:{error}"))? {
        let entry = entry.map_err(|error| format!("backup_dir_entry_failed:{error}"))?;
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|value| value.to_str()) != Some("zip") {
            continue;
        }

        let metadata = entry
            .metadata()
            .map_err(|error| format!("backup_file_metadata_failed:{error}"))?;
        output.push(BackupFileInfo {
            file_name: path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or_default()
                .to_string(),
            path: path_to_string(&path)?,
            size_bytes: metadata.len(),
            modified_at: metadata.modified().ok().map(system_time_to_iso),
        });
    }
    Ok(())
}
