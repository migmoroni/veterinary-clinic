use super::{
    cas_mirror::{cas_mirror_user_path, sync_cas_incremental},
    contracts::{PackageExportType, PackageResponse},
    csv::export_csv_table,
    csv_tables::{LOG_CSV_TABLES, MEDIA_CSV_TABLE, USER_CSV_TABLES},
    db_snapshot::{current_schema_version, stage_db_snapshot},
    files::{copy_dir_recursive_if_exists, normalized_output_path, path_to_string, TempDirectory},
    manifest::{new_manifest, write_manifest},
    zip::write_zip_from_directory,
};
use crate::storage::StorageManager;
use std::{fs, path::Path};

// Exporter flow: turns the current user storage bundle into a portable package.
// Backup code may call this, but export rules stay here for both DB and CSV.
pub(crate) fn export_native_package(
    storage: &StorageManager,
    destination_path: &str,
) -> Result<PackageResponse, String> {
    let destination_path = normalized_output_path(destination_path)?;
    export_native_package_to_path(storage, &destination_path, PackageExportType::Native)?;
    Ok(PackageResponse {
        path: path_to_string(&destination_path)?,
        safety_backup_path: None,
    })
}

pub(crate) fn export_csv_package(
    storage: &StorageManager,
    destination_path: &str,
) -> Result<PackageResponse, String> {
    let destination_path = normalized_output_path(destination_path)?;
    export_csv_package_to_path(storage, &destination_path)?;
    Ok(PackageResponse {
        path: path_to_string(&destination_path)?,
        safety_backup_path: None,
    })
}

pub(crate) fn export_native_package_to_path(
    storage: &StorageManager,
    destination_path: &Path,
    export_type: PackageExportType,
) -> Result<(), String> {
    let staging = TempDirectory::new("veterinary-clinic-native-export")?;
    let vault_user_dir = staging.path.join("vault").join("user");
    fs::create_dir_all(&vault_user_dir)
        .map_err(|error| format!("export_vault_dir_create_failed:{error}"))?;

    // Manual native packages are complete transfer packages: compact DB
    // snapshots plus the already-deduplicated CAS mirror.
    sync_cas_incremental(storage)?;
    stage_db_snapshot(storage, &staging.path, export_type)?;
    copy_dir_recursive_if_exists(&cas_mirror_user_path(storage)?, &vault_user_dir)?;
    write_zip_from_directory(&staging.path, destination_path)
}

pub(crate) fn export_csv_package_to_path(
    storage: &StorageManager,
    destination_path: &Path,
) -> Result<(), String> {
    let staging = TempDirectory::new("veterinary-clinic-csv-export")?;
    let vault_user_dir = staging.path.join("vault").join("user");
    fs::create_dir_all(&vault_user_dir)
        .map_err(|error| format!("export_vault_dir_create_failed:{error}"))?;
    write_manifest(
        &staging.path,
        new_manifest(PackageExportType::Csv, current_schema_version(storage)?),
    )?;

    {
        let user_db = storage
            .user_db
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        for table in USER_CSV_TABLES {
            export_csv_table(&user_db, table, &staging.path)?;
        }
    }

    {
        let media_db = storage
            .user_media_db
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        export_csv_table(&media_db, &MEDIA_CSV_TABLE, &staging.path)?;
    }

    {
        let logs_db = storage
            .user_logs_db
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        for table in LOG_CSV_TABLES {
            export_csv_table(&logs_db, table, &staging.path)?;
        }
    }

    sync_cas_incremental(storage)?;
    copy_dir_recursive_if_exists(&cas_mirror_user_path(storage)?, &vault_user_dir)?;
    write_zip_from_directory(&staging.path, destination_path)
}
