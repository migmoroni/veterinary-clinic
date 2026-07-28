//! Export flow for complete local packages.
//!
//! Native packages are the lossless transfer format. CSV packages are readable
//! and importable, but still keep CAS files as package files instead of in CSV.

use super::{
    contracts::PackageResponse,
    csv::export_csv_table,
    csv_tables::{LOG_CSV_TABLES, MEDIA_CSV_TABLE, USER_CSV_TABLES},
    database_package::stage_user_databases,
    files::{copy_dir_recursive_if_exists, normalized_output_path, path_to_string, TempDirectory},
    zip::write_zip_from_directory,
};
use crate::storage::StorageManager;
use std::{fs, path::Path};

// Exporter flow: turns the current user storage bundle into a complete portable
// package. This is the local distribution path used by manual export/import.
pub(crate) fn export_native_package(
    storage: &StorageManager,
    destination_path: &str,
) -> Result<PackageResponse, String> {
    let destination_path = normalized_output_path(destination_path)?;
    export_native_package_to_path(storage, &destination_path)?;
    Ok(PackageResponse {
        path: path_to_string(&destination_path)?,
        safety_export_path: None,
        replication_target_path: None,
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
        safety_export_path: None,
        replication_target_path: None,
    })
}

pub(crate) fn export_native_package_to_path(
    storage: &StorageManager,
    destination_path: &Path,
) -> Result<(), String> {
    let staging = TempDirectory::new("veterinary-clinic-native-export")?;
    let vault_user_dir = staging.path.join("vault").join("user");
    fs::create_dir_all(&vault_user_dir)
        .map_err(|error| format!("export_vault_dir_create_failed:{error}"))?;

    stage_user_databases(storage, &staging.path)?;
    copy_dir_recursive_if_exists(&storage.user_vault_path(), &vault_user_dir)?;
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

    copy_dir_recursive_if_exists(&storage.user_vault_path(), &vault_user_dir)?;
    write_zip_from_directory(&staging.path, destination_path)
}
