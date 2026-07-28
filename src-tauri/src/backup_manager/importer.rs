use super::{
    contracts::{PackageExportType, PackageResponse},
    csv::import_csv_tables,
    csv_tables::{LOG_CSV_TABLES, MEDIA_CSV_TABLE, USER_CSV_TABLES},
    exporter::export_native_package_to_path,
    files::{
        copy_dir_recursive_if_exists, normalized_existing_file_path, path_to_string,
        replace_sqlite_file, TempDirectory,
    },
    manifest::{read_manifest, validate_manifest},
    sqlite::{create_empty_schema_from, validate_sqlite_database},
    time::timestamp_for_file,
    zip::extract_zip_file,
    CURRENT_SCHEMA_VERSION, USER_DB_PACKAGE_PATH, USER_LOGS_DB_PACKAGE_PATH,
    USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::storage::{open_sqlite_db, DbType, StorageManager};
use rusqlite::Connection;
use std::path::Path;

// Importer flow: validates a full package, creates a safety export, and replaces
// the live user storage bundle from either native DB files or CSV files.
pub(crate) fn import_native_package(
    storage: &StorageManager,
    source_path: &str,
) -> Result<PackageResponse, String> {
    import_package(storage, source_path, PackageExportType::Native)
}

pub(crate) fn import_csv_package(
    storage: &StorageManager,
    source_path: &str,
) -> Result<PackageResponse, String> {
    import_package(storage, source_path, PackageExportType::Csv)
}

fn import_package(
    storage: &StorageManager,
    source_path: &str,
    expected_type: PackageExportType,
) -> Result<PackageResponse, String> {
    let source_path = normalized_existing_file_path(source_path)?;
    let staging = TempDirectory::new("veterinary-clinic-import")?;
    extract_zip_file(&source_path, &staging.path)?;

    let manifest = read_manifest(&staging.path)?;
    validate_manifest(&manifest, expected_type)?;

    // Imports are destructive by nature. Keep a full native export of the
    // previous user bundle before replacing files with the package contents.
    let safety_backup_path = create_pre_import_safety_export(storage)?;

    match expected_type {
        PackageExportType::Native => restore_native_from_staging(storage, &staging.path)?,
        PackageExportType::Csv => restore_csv_from_staging(storage, &staging.path)?,
    }

    Ok(PackageResponse {
        path: path_to_string(&source_path)?,
        safety_backup_path: Some(path_to_string(&safety_backup_path)?),
    })
}

fn restore_native_from_staging(
    storage: &StorageManager,
    staging_path: &Path,
) -> Result<(), String> {
    let user_db_package = staging_path.join(USER_DB_PACKAGE_PATH);
    let user_media_db_package = staging_path.join(USER_MEDIA_DB_PACKAGE_PATH);
    let user_logs_db_package = staging_path.join(USER_LOGS_DB_PACKAGE_PATH);
    if !user_db_package.is_file() || !user_media_db_package.is_file() {
        return Err("native_package_database_missing".to_string());
    }

    validate_sqlite_database(&user_db_package, true)?;
    validate_sqlite_database(&user_media_db_package, false)?;
    let logs_source = if user_logs_db_package.is_file() {
        validate_sqlite_database(&user_logs_db_package, false)?;
        user_logs_db_package
    } else {
        let temp_logs_db = staging_path.join("import-user-logs.db");
        let _ = open_sqlite_db(&temp_logs_db, DbType::Logs)?;
        temp_logs_db
    };
    replace_user_storage_files(
        storage,
        &user_db_package,
        &user_media_db_package,
        &logs_source,
        &staging_path.join("vault").join("user"),
    )
}

fn restore_csv_from_staging(storage: &StorageManager, staging_path: &Path) -> Result<(), String> {
    if !staging_path.join("data_csv").is_dir() {
        return Err("csv_package_data_missing".to_string());
    }

    let temp_user_db = staging_path.join("import-user.db");
    let temp_media_db = staging_path.join("import-user-media.db");
    let temp_logs_db = staging_path.join("import-user-logs.db");
    {
        let source_schema = storage
            .user_db
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        create_empty_schema_from(&source_schema, &temp_user_db)?;
    }

    {
        let target = Connection::open(&temp_user_db)
            .map_err(|error| format!("csv_user_database_open_failed:{error}"))?;
        import_csv_tables(&target, USER_CSV_TABLES, staging_path)?;
        target
            .execute_batch(&format!("PRAGMA user_version = {CURRENT_SCHEMA_VERSION};"))
            .map_err(|error| format!("csv_user_version_failed:{error}"))?;
    }

    {
        let media = open_sqlite_db(&temp_media_db, DbType::MediaIndex)?;
        import_csv_tables(&media, &[MEDIA_CSV_TABLE], staging_path)?;
    }

    {
        let logs = open_sqlite_db(&temp_logs_db, DbType::Logs)?;
        if staging_path.join("logs_csv").is_dir() {
            import_csv_tables(&logs, LOG_CSV_TABLES, staging_path)?;
        }
    }

    validate_sqlite_database(&temp_user_db, true)?;
    validate_sqlite_database(&temp_media_db, false)?;
    validate_sqlite_database(&temp_logs_db, false)?;
    replace_user_storage_files(
        storage,
        &temp_user_db,
        &temp_media_db,
        &temp_logs_db,
        &staging_path.join("vault").join("user"),
    )
}

fn replace_user_storage_files(
    storage: &StorageManager,
    user_db_source: &Path,
    user_media_db_source: &Path,
    user_logs_db_source: &Path,
    vault_user_source: &Path,
) -> Result<(), String> {
    storage.close_user_bundle_connections()?;
    let result = (|| {
        replace_sqlite_file(user_db_source, &storage.user_database_path())?;
        replace_sqlite_file(user_media_db_source, &storage.user_media_database_path())?;
        replace_sqlite_file(user_logs_db_source, &storage.user_logs_database_path())?;
        copy_dir_recursive_if_exists(vault_user_source, &storage.user_vault_path())?;
        Ok(())
    })();

    let reopen_result = storage.reopen_user_bundle_connections();
    result.and(reopen_result)
}

fn create_pre_import_safety_export(storage: &StorageManager) -> Result<std::path::PathBuf, String> {
    let folder = storage.app_data_dir()?.join("import_safety_exports");
    std::fs::create_dir_all(&folder)
        .map_err(|error| format!("import_safety_export_dir_create_failed:{error}"))?;
    let destination_path = folder.join(format!("pre_import_{}.zip", timestamp_for_file()));
    export_native_package_to_path(storage, &destination_path, PackageExportType::Native)?;
    Ok(destination_path)
}
