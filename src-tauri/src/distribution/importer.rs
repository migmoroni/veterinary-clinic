//! Import flow for native, CSV and local mirror package sources.
//!
//! The importer validates package structure, asks replication for a final sync,
//! creates a safety export if needed, then atomically replaces the user bundle.

use super::{
    contracts::{PackageExportType, PackageResponse},
    csv::import_csv_tables,
    csv_tables::{LOG_CSV_TABLES, MEDIA_CSV_TABLE, USER_CSV_TABLES},
    exporter::export_native_package_to_path,
    files::{
        normalized_existing_file_path, normalized_existing_path, path_to_string,
        replace_dir_recursive_if_exists, replace_sqlite_file, TempDirectory,
    },
    sqlite::{create_empty_schema_from, validate_sqlite_database},
    time::timestamp_for_file,
    zip::extract_zip_file,
    CURRENT_SCHEMA_VERSION, USER_DB_PACKAGE_PATH, USER_LOGS_DB_PACKAGE_PATH,
    USER_MEDIA_DB_PACKAGE_PATH,
};
use crate::replication::orchestrator;
use crate::storage::{open_sqlite_db, DbType, StorageManager};
use crate::storage::{read_database_manifest, validate_database_manifest_schema};
use rusqlite::Connection;
use std::{
    fs,
    path::{Path, PathBuf},
};

struct NativeImportSource {
    user_db: PathBuf,
    user_media_db: PathBuf,
    user_logs_db: PathBuf,
    vault_user: PathBuf,
    replication_target_path: Option<PathBuf>,
}

struct ImportRecovery {
    replication_target_path: Option<PathBuf>,
    safety_export_path: Option<PathBuf>,
}

// Importer flow: validates a complete package, creates a local safety export
// when replication could not do a final sync, and replaces the live user bundle.
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
    let source_path = if expected_type == PackageExportType::Native {
        normalized_existing_path(source_path)?
    } else {
        normalized_existing_file_path(source_path)?
    };
    if source_path.is_dir() {
        if expected_type != PackageExportType::Native {
            return Err("csv_package_must_be_zip_file".to_string());
        }
        let source = resolve_native_import_source(&source_path)?;
        validate_native_import_source(&source)?;
        let recovery = prepare_current_bundle_for_import(storage)?;
        replace_native_import_source(storage, &source)?;
        return Ok(PackageResponse {
            path: path_to_string(&source_path)?,
            safety_export_path: optional_path_to_string(&recovery.safety_export_path)?,
            replication_target_path: optional_path_to_string(
                &source
                    .replication_target_path
                    .clone()
                    .or(recovery.replication_target_path),
            )?,
        });
    }

    let staging = TempDirectory::new("veterinary-clinic-import")?;
    extract_zip_file(&source_path, &staging.path)?;

    match expected_type {
        PackageExportType::Native => {
            let source = native_package_source(&staging.path)
                .ok_or_else(|| "native_package_database_missing".to_string())?;
            validate_native_import_source(&source)?;
            let recovery = prepare_current_bundle_for_import(storage)?;
            replace_native_import_source(storage, &source)?;
            Ok(PackageResponse {
                path: path_to_string(&source_path)?,
                safety_export_path: optional_path_to_string(&recovery.safety_export_path)?,
                replication_target_path: optional_path_to_string(
                    &recovery.replication_target_path,
                )?,
            })
        }
        PackageExportType::Csv => {
            let source = prepare_csv_import_source(storage, &staging.path)?;
            let recovery = prepare_current_bundle_for_import(storage)?;
            replace_native_import_source(storage, &source)?;
            Ok(PackageResponse {
                path: path_to_string(&source_path)?,
                safety_export_path: optional_path_to_string(&recovery.safety_export_path)?,
                replication_target_path: optional_path_to_string(
                    &recovery.replication_target_path,
                )?,
            })
        }
    }
}

fn validate_native_import_source(source: &NativeImportSource) -> Result<(), String> {
    validate_sqlite_database(&source.user_db, true)?;
    validate_sqlite_database(&source.user_media_db, false)?;
    validate_sqlite_database(&source.user_logs_db, false)?;
    validate_logs_manifest(&source.user_logs_db)
}

fn prepare_csv_import_source(
    storage: &StorageManager,
    staging_path: &Path,
) -> Result<NativeImportSource, String> {
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
        if !staging_path.join("logs_csv").is_dir() {
            return Err("csv_package_logs_missing".to_string());
        }
        logs.execute("DELETE FROM database_manifest", [])
            .map_err(|error| format!("csv_logs_manifest_clear_failed:{error}"))?;
        import_csv_tables(&logs, LOG_CSV_TABLES, staging_path)?;
    }

    validate_sqlite_database(&temp_user_db, true)?;
    validate_sqlite_database(&temp_media_db, false)?;
    validate_sqlite_database(&temp_logs_db, false)?;
    validate_logs_manifest(&temp_logs_db)?;
    Ok(NativeImportSource {
        user_db: temp_user_db,
        user_media_db: temp_media_db,
        user_logs_db: temp_logs_db,
        vault_user: staging_path.join("vault").join("user"),
        replication_target_path: None,
    })
}

fn validate_logs_manifest(logs_db_path: &Path) -> Result<(), String> {
    let connection = Connection::open(logs_db_path)
        .map_err(|error| format!("package_logs_manifest_open_failed:{error}"))?;
    let manifest = read_database_manifest(&connection)?;
    validate_database_manifest_schema(&manifest)
}

fn resolve_native_import_source(source_path: &Path) -> Result<NativeImportSource, String> {
    if let Some(source) = native_import_source_at(source_path) {
        return Ok(source);
    }

    let mut candidates = Vec::new();
    for entry in fs::read_dir(source_path)
        .map_err(|error| format!("native_distribution_directory_read_failed:{error}"))?
    {
        let entry =
            entry.map_err(|error| format!("native_distribution_directory_entry_failed:{error}"))?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        if let Some(source) = native_import_source_at(&path) {
            candidates.push(source);
        }
    }

    match candidates.len() {
        1 => Ok(candidates.remove(0)),
        0 => Err("native_distribution_directory_invalid".to_string()),
        _ => Err("native_distribution_directory_ambiguous".to_string()),
    }
}

fn native_import_source_at(path: &Path) -> Option<NativeImportSource> {
    native_package_source(path).or_else(|| local_mirror_source(path))
}

fn native_package_source(path: &Path) -> Option<NativeImportSource> {
    let user_db = path.join(USER_DB_PACKAGE_PATH);
    let user_media_db = path.join(USER_MEDIA_DB_PACKAGE_PATH);
    let user_logs_db = path.join(USER_LOGS_DB_PACKAGE_PATH);
    if !user_db.is_file() || !user_media_db.is_file() || !user_logs_db.is_file() {
        return None;
    }
    Some(NativeImportSource {
        user_db,
        user_media_db,
        user_logs_db,
        vault_user: path.join("vault").join("user"),
        replication_target_path: None,
    })
}

fn local_mirror_source(path: &Path) -> Option<NativeImportSource> {
    let user_db = path.join("base_veterinary_clinic_user.db");
    let user_media_db = path.join("base_veterinary_clinic_user_media.db");
    let user_logs_db = path.join("base_veterinary_clinic_user_logs.db");
    if !user_db.is_file() || !user_media_db.is_file() || !user_logs_db.is_file() {
        return None;
    }
    Some(NativeImportSource {
        user_db,
        user_media_db,
        user_logs_db,
        vault_user: path.join("userMedia").join("vault"),
        replication_target_path: path.parent().map(Path::to_path_buf),
    })
}

fn replace_native_import_source(
    storage: &StorageManager,
    source: &NativeImportSource,
) -> Result<(), String> {
    replace_user_storage_files(
        storage,
        &source.user_db,
        &source.user_media_db,
        &source.user_logs_db,
        &source.vault_user,
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
        replace_dir_recursive_if_exists(vault_user_source, &storage.user_vault_path())?;
        Ok(())
    })();

    let reopen_result = storage.reopen_user_bundle_connections();
    result.and(reopen_result)
}

fn prepare_current_bundle_for_import(storage: &StorageManager) -> Result<ImportRecovery, String> {
    let preparation = orchestrator::prepare_for_database_import(storage).ok();
    let replication_target_path = preparation
        .as_ref()
        .and_then(|preparation| preparation.backup_target_path.clone());
    let final_sync_succeeded = preparation
        .as_ref()
        .map(|preparation| preparation.final_sync_succeeded)
        .unwrap_or(false);
    let safety_export_path = if final_sync_succeeded {
        None
    } else {
        Some(create_pre_import_safety_export(storage)?)
    };
    Ok(ImportRecovery {
        replication_target_path,
        safety_export_path,
    })
}

fn create_pre_import_safety_export(storage: &StorageManager) -> Result<std::path::PathBuf, String> {
    let folder = storage.app_data_dir()?.join("import_safety_exports");
    std::fs::create_dir_all(&folder)
        .map_err(|error| format!("import_safety_export_dir_create_failed:{error}"))?;
    let destination_path = folder.join(format!("pre_import_{}.zip", timestamp_for_file()));
    export_native_package_to_path(storage, &destination_path)?;
    Ok(destination_path)
}

fn optional_path_to_string(path: &Option<PathBuf>) -> Result<Option<String>, String> {
    path.as_ref().map(|path| path_to_string(path)).transpose()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    const BASE_USER_DB: &str = "base_veterinary_clinic_user.db";
    const BASE_USER_MEDIA_DB: &str = "base_veterinary_clinic_user_media.db";
    const BASE_USER_LOGS_DB: &str = "base_veterinary_clinic_user_logs.db";

    #[test]
    fn resolves_direct_local_mirror_folder() {
        let root = test_root("direct-local-mirror");
        seed_local_mirror_files(&root);

        let source = resolve_native_import_source(&root).expect("resolve source");

        assert_eq!(source.user_db, root.join(BASE_USER_DB));
        assert_eq!(source.vault_user, root.join("userMedia").join("vault"));
        assert_eq!(
            source.replication_target_path,
            root.parent().map(Path::to_path_buf)
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn resolves_single_local_mirror_child_from_selected_parent() {
        let root = test_root("parent-local-mirror");
        let child = root.join("Veterinary Clinic - database-id");
        fs::create_dir_all(root.join("notes")).expect("create ignored folder");
        seed_local_mirror_files(&child);

        let source = resolve_native_import_source(&root).expect("resolve source");

        assert_eq!(source.user_logs_db, child.join(BASE_USER_LOGS_DB));
        assert_eq!(source.replication_target_path, Some(root.clone()));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_ambiguous_distribution_parent_folder() {
        let root = test_root("ambiguous-local-mirror");
        seed_local_mirror_files(&root.join("Veterinary Clinic - one"));
        seed_local_mirror_files(&root.join("Veterinary Clinic - two"));

        let error = match resolve_native_import_source(&root) {
            Ok(_) => panic!("ambiguous folder should not resolve"),
            Err(error) => error,
        };

        assert_eq!(error, "native_distribution_directory_ambiguous");
        let _ = fs::remove_dir_all(root);
    }

    fn seed_local_mirror_files(path: &Path) {
        touch(&path.join(BASE_USER_DB));
        touch(&path.join(BASE_USER_MEDIA_DB));
        touch(&path.join(BASE_USER_LOGS_DB));
    }

    fn touch(path: &Path) {
        fs::create_dir_all(path.parent().expect("parent")).expect("create parent");
        fs::write(path, b"sqlite placeholder").expect("write file");
    }

    fn test_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "vclinic-importer-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }
}
