use super::{
    files::remove_file_if_exists, sqlite::vacuum_into, USER_DB_PACKAGE_PATH,
    USER_LOGS_DB_PACKAGE_PATH, USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::storage::StorageManager;
use std::{fs, path::Path};

// Native packages carry compact, consistent database copies. The package is a
// transfer artifact, not part of continuous backup; replication owns that flow.
pub(crate) fn stage_user_databases(
    storage: &StorageManager,
    staging_root: &Path,
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
