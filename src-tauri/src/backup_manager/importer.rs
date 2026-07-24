use super::{
    backup::create_pre_import_backup,
    cas_mirror::merge_imported_cas,
    contracts::{PackageExportType, PackageResponse},
    csv::import_csv_tables,
    csv_tables::{MEDIA_CSV_TABLE, USER_CSV_TABLES},
    files::{normalized_existing_file_path, path_to_string, replace_sqlite_file, TempDirectory},
    manifest::{read_manifest, validate_manifest},
    sqlite::{create_empty_schema_from, validate_sqlite_database},
    zip::extract_zip_file,
    CURRENT_SCHEMA_VERSION, USER_DB_PACKAGE_PATH, USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::storage::{open_sqlite_db, DbType, StorageManager};
use rusqlite::Connection;
use std::path::Path;

// Importer flow: validates a package, creates a safety backup, and replaces
// the live user storage bundle from either native DB snapshots or CSV files.
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

    // Imports are destructive by nature. Keep a native snapshot of the previous
    // user bundle before replacing files with the package contents.
    let safety_backup_path = create_pre_import_backup(storage)?;

    match expected_type {
        PackageExportType::Native => restore_native_from_staging(storage, &staging.path)?,
        PackageExportType::Csv => restore_csv_from_staging(storage, &staging.path)?,
        PackageExportType::AutoSnapshot => return Err("snapshot_import_not_supported".to_string()),
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
    let user_db_snapshot = staging_path.join(USER_DB_PACKAGE_PATH);
    let user_media_db_snapshot = staging_path.join(USER_MEDIA_DB_PACKAGE_PATH);
    if !user_db_snapshot.is_file() || !user_media_db_snapshot.is_file() {
        return Err("native_package_database_missing".to_string());
    }

    validate_sqlite_database(&user_db_snapshot, true)?;
    validate_sqlite_database(&user_media_db_snapshot, false)?;
    replace_user_storage_files(
        storage,
        &user_db_snapshot,
        &user_media_db_snapshot,
        &staging_path.join("vault").join("user"),
    )
}

fn restore_csv_from_staging(storage: &StorageManager, staging_path: &Path) -> Result<(), String> {
    if !staging_path.join("data_csv").is_dir() {
        return Err("csv_package_data_missing".to_string());
    }

    let temp_user_db = staging_path.join("import-user.db");
    let temp_media_db = staging_path.join("import-user-media.db");
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

    validate_sqlite_database(&temp_user_db, true)?;
    validate_sqlite_database(&temp_media_db, false)?;
    replace_user_storage_files(
        storage,
        &temp_user_db,
        &temp_media_db,
        &staging_path.join("vault").join("user"),
    )
}

fn replace_user_storage_files(
    storage: &StorageManager,
    user_db_source: &Path,
    user_media_db_source: &Path,
    vault_user_source: &Path,
) -> Result<(), String> {
    storage.close_user_bundle_connections()?;
    let result = (|| {
        replace_sqlite_file(user_db_source, &storage.user_database_path())?;
        replace_sqlite_file(user_media_db_source, &storage.user_media_database_path())?;
        merge_imported_cas(storage, vault_user_source)?;
        Ok(())
    })();

    let reopen_result = storage.reopen_user_bundle_connections();
    result.and(reopen_result)
}
