use super::{
    contracts::PackageExportType,
    files::{remove_file_if_exists, TempDirectory},
    manifest::{new_manifest, write_manifest},
    sqlite::{user_version, vacuum_into},
    zip::write_zip_from_directory,
    CURRENT_SCHEMA_VERSION, USER_DB_PACKAGE_PATH, USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::storage::StorageManager;
use std::{fs, path::Path};

// DB snapshots are intentionally lightweight. They never carry CAS files; the
// automatic backup flow pairs them with the persistent incremental CAS mirror.
pub(crate) fn stage_db_snapshot(
    storage: &StorageManager,
    staging_root: &Path,
    export_type: PackageExportType,
) -> Result<(), String> {
    let user_db_destination = staging_root.join(USER_DB_PACKAGE_PATH);
    let user_media_db_destination = staging_root.join(USER_MEDIA_DB_PACKAGE_PATH);
    if let Some(parent) = user_db_destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("db_snapshot_data_dir_create_failed:{error}"))?;
    }

    vacuum_user_databases_into(storage, &user_db_destination, &user_media_db_destination)?;
    write_manifest(
        staging_root,
        new_manifest(export_type, current_schema_version(storage)?),
    )
}

pub(crate) fn create_db_snapshot(
    storage: &StorageManager,
    destination_path: &Path,
) -> Result<(), String> {
    let staging = TempDirectory::new("veterinary-clinic-db-snapshot")?;
    vacuum_user_databases_into(
        storage,
        &staging.path.join("veterinary_clinic_user.db"),
        &staging.path.join("veterinary_clinic_user_media.db"),
    )?;
    write_manifest(
        &staging.path,
        new_manifest(
            PackageExportType::AutoSnapshot,
            current_schema_version(storage)?,
        ),
    )?;
    write_zip_from_directory(&staging.path, destination_path)
}

fn vacuum_user_databases_into(
    storage: &StorageManager,
    user_db_destination: &Path,
    user_media_db_destination: &Path,
) -> Result<(), String> {
    remove_file_if_exists(user_db_destination)?;
    remove_file_if_exists(user_media_db_destination)?;

    let user_db = storage
        .user_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    vacuum_into(&user_db, user_db_destination)?;
    drop(user_db);

    let user_media_db = storage
        .user_media_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    vacuum_into(&user_media_db, user_media_db_destination)
}

pub(crate) fn current_schema_version(storage: &StorageManager) -> Result<i64, String> {
    let user_db = storage
        .user_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    Ok(user_version(&user_db).unwrap_or(CURRENT_SCHEMA_VERSION))
}
