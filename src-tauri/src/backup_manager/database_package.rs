use super::{
    contracts::PackageExportType,
    files::remove_file_if_exists,
    manifest::{new_manifest, write_manifest},
    sqlite::{user_version, vacuum_into},
    CURRENT_SCHEMA_VERSION, USER_DB_PACKAGE_PATH, USER_LOGS_DB_PACKAGE_PATH,
    USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::storage::StorageManager;
use std::{fs, path::Path};

// Native import/export packages carry compact, consistent database copies.
// Continuous backup no longer uses this module; it works through replication patches.
pub(crate) fn stage_user_databases(
    storage: &StorageManager,
    staging_root: &Path,
    export_type: PackageExportType,
) -> Result<(), String> {
    let user_db_destination = staging_root.join(USER_DB_PACKAGE_PATH);
    let user_media_db_destination = staging_root.join(USER_MEDIA_DB_PACKAGE_PATH);
    let user_logs_db_destination = staging_root.join(USER_LOGS_DB_PACKAGE_PATH);
    if let Some(parent) = user_db_destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("package_database_dir_create_failed:{error}"))?;
    }

    vacuum_user_databases_into(
        storage,
        &user_db_destination,
        &user_media_db_destination,
        &user_logs_db_destination,
    )?;
    write_manifest(
        staging_root,
        new_manifest(export_type, current_schema_version(storage)?),
    )
}

fn vacuum_user_databases_into(
    storage: &StorageManager,
    user_db_destination: &Path,
    user_media_db_destination: &Path,
    user_logs_db_destination: &Path,
) -> Result<(), String> {
    remove_file_if_exists(user_db_destination)?;
    remove_file_if_exists(user_media_db_destination)?;
    remove_file_if_exists(user_logs_db_destination)?;

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
    vacuum_into(&user_media_db, user_media_db_destination)?;
    drop(user_media_db);

    let user_logs_db = storage
        .user_logs_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    vacuum_into(&user_logs_db, user_logs_db_destination)
}

pub(crate) fn current_schema_version(storage: &StorageManager) -> Result<i64, String> {
    let user_db = storage
        .user_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    Ok(user_version(&user_db).unwrap_or(CURRENT_SCHEMA_VERSION))
}
