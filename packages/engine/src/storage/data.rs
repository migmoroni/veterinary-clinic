//! Main storage manager and SQLite connection ownership.
//!
//! This module owns the fixed user/system database connections, lazily opens
//! additional database files, and exposes the generic SQL bridge used by the UI.

use super::{
    execute_statement, open_sqlite_db, select_rows, DbType, SqlConnectionRequest,
    SqlExecuteResponse, SqlRequest, StorageDatabase, StorageDomain, UserBundleDirtyFlags,
};
use rusqlite::Connection;
use serde_json::Value as JsonValue;
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager};

const USER_DATABASE_FILE: &str = "veterinary_clinic_user.db";
const SYSTEM_DATABASE_FILE: &str = "veterinary_clinic_system.db";
const USER_MEDIA_DATABASE_FILE: &str = "veterinary_clinic_user_media.db";
const SYSTEM_MEDIA_DATABASE_FILE: &str = "veterinary_clinic_system_media.db";
const USER_LOGS_DATABASE_FILE: &str = "veterinary_clinic_user_logs.db";
const DATABASE_DIRECTORY: &str = "databases";

#[derive(Clone)]
pub struct StorageManager {
    pub user_db: Arc<Mutex<Connection>>,
    pub system_db: Arc<Mutex<Connection>>,
    pub user_media_db: Arc<Mutex<Connection>>,
    pub system_media_db: Arc<Mutex<Connection>>,
    pub user_logs_db: Arc<Mutex<Connection>>,
    pub base_vault_path: PathBuf,
    database_dir: PathBuf,
    external_dbs: Arc<Mutex<HashMap<String, Arc<Mutex<Connection>>>>>,
    user_bundle_dirty: Arc<UserBundleDirtyFlags>,
}

impl StorageManager {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("app_data_dir_unavailable:{error}"))?;
        let database_dir = app_database_dir(&app_data_dir);
        let base_vault_path = app_data_dir.join("vault");

        fs::create_dir_all(&database_dir)
            .map_err(|error| format!("database_dir_create_failed:{error}"))?;
        fs::create_dir_all(&base_vault_path)
            .map_err(|error| format!("vault_dir_create_failed:{error}"))?;
        let user_bundle_dirty = Arc::new(UserBundleDirtyFlags::default());

        user_bundle_dirty.mark_user_bundle();
        Ok(Self {
            user_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_DATABASE_FILE),
                DbType::Operational,
                StorageDatabase::User,
                &user_bundle_dirty,
            )?)),
            system_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_DATABASE_FILE),
                DbType::Operational,
            )?)),
            user_media_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_MEDIA_DATABASE_FILE),
                DbType::MediaIndex,
                StorageDatabase::UserMedia,
                &user_bundle_dirty,
            )?)),
            system_media_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_MEDIA_DATABASE_FILE),
                DbType::SystemMediaIndex,
            )?)),
            user_logs_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_LOGS_DATABASE_FILE),
                DbType::Logs,
                StorageDatabase::UserLogs,
                &user_bundle_dirty,
            )?)),
            base_vault_path,
            database_dir,
            external_dbs: Arc::new(Mutex::new(HashMap::new())),
            user_bundle_dirty,
        })
    }

    #[cfg(test)]
    pub(crate) fn new_for_tests(
        database_dir: PathBuf,
        app_data_dir: PathBuf,
    ) -> Result<Self, String> {
        let base_vault_path = app_data_dir.join("vault");
        fs::create_dir_all(&database_dir)
            .map_err(|error| format!("database_dir_create_failed:{error}"))?;
        fs::create_dir_all(&base_vault_path)
            .map_err(|error| format!("vault_dir_create_failed:{error}"))?;
        let user_bundle_dirty = Arc::new(UserBundleDirtyFlags::default());

        user_bundle_dirty.mark_user_bundle();
        Ok(Self {
            user_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_DATABASE_FILE),
                DbType::Operational,
                StorageDatabase::User,
                &user_bundle_dirty,
            )?)),
            system_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_DATABASE_FILE),
                DbType::Operational,
            )?)),
            user_media_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_MEDIA_DATABASE_FILE),
                DbType::MediaIndex,
                StorageDatabase::UserMedia,
                &user_bundle_dirty,
            )?)),
            system_media_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_MEDIA_DATABASE_FILE),
                DbType::SystemMediaIndex,
            )?)),
            user_logs_db: Arc::new(Mutex::new(open_tracked_user_database(
                &database_dir.join(USER_LOGS_DATABASE_FILE),
                DbType::Logs,
                StorageDatabase::UserLogs,
                &user_bundle_dirty,
            )?)),
            base_vault_path,
            database_dir,
            external_dbs: Arc::new(Mutex::new(HashMap::new())),
            user_bundle_dirty,
        })
    }

    pub fn user_database_path(&self) -> PathBuf {
        self.database_dir.join(USER_DATABASE_FILE)
    }

    pub fn user_media_database_path(&self) -> PathBuf {
        self.database_dir.join(USER_MEDIA_DATABASE_FILE)
    }

    pub fn user_logs_database_path(&self) -> PathBuf {
        self.database_dir.join(USER_LOGS_DATABASE_FILE)
    }

    pub fn user_vault_path(&self) -> PathBuf {
        self.base_vault_path
            .join(StorageDomain::User.vault_segment())
    }

    pub(crate) fn take_user_bundle_dirty(&self, database: StorageDatabase) -> bool {
        self.user_bundle_dirty.take_database(database)
    }

    pub(crate) fn clear_user_bundle_dirty(&self, database: StorageDatabase) {
        self.user_bundle_dirty.clear_database(database);
    }

    pub(crate) fn mark_user_bundle_dirty(&self, database: StorageDatabase) {
        self.user_bundle_dirty.mark_database(database);
    }

    pub fn app_data_dir(&self) -> Result<PathBuf, String> {
        self.base_vault_path
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "app_data_dir_unavailable".to_string())
    }

    pub fn close_user_bundle_connections(&self) -> Result<(), String> {
        self.close_connection(SqlConnectionRequest {
            database: StorageDatabase::User,
            file_name: None,
            db_type: Some(DbType::Operational),
        })?;
        self.close_connection(SqlConnectionRequest {
            database: StorageDatabase::UserMedia,
            file_name: None,
            db_type: Some(DbType::MediaIndex),
        })?;
        self.close_connection(SqlConnectionRequest {
            database: StorageDatabase::UserLogs,
            file_name: None,
            db_type: Some(DbType::Logs),
        })
    }

    pub fn reopen_user_bundle_connections(&self) -> Result<(), String> {
        self.reopen_connection(SqlConnectionRequest {
            database: StorageDatabase::User,
            file_name: None,
            db_type: Some(DbType::Operational),
        })?;
        self.reopen_connection(SqlConnectionRequest {
            database: StorageDatabase::UserMedia,
            file_name: None,
            db_type: Some(DbType::MediaIndex),
        })?;
        self.reopen_connection(SqlConnectionRequest {
            database: StorageDatabase::UserLogs,
            file_name: None,
            db_type: Some(DbType::Logs),
        })
    }

    pub(crate) fn select(&self, request: SqlRequest) -> Result<Vec<JsonValue>, String> {
        let connection = self.connection_for(&SqlConnectionRequest {
            database: request.database,
            file_name: request.file_name,
            db_type: request.db_type,
        })?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        select_rows(&guard, &request.query, request.values)
    }

    pub(crate) fn execute(&self, request: SqlRequest) -> Result<SqlExecuteResponse, String> {
        let database = request.database;
        let connection = self.connection_for(&SqlConnectionRequest {
            database: request.database,
            file_name: request.file_name,
            db_type: request.db_type,
        })?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        let response = execute_statement(&guard, &request.query, request.values)?;
        if response.rows_affected > 0 {
            self.user_bundle_dirty.mark_database(database);
        }
        Ok(response)
    }

    pub(crate) fn close_connection(&self, request: SqlConnectionRequest) -> Result<(), String> {
        if request.database == StorageDatabase::DatabaseFile {
            let file_name = validate_database_file_name(
                request
                    .file_name
                    .as_deref()
                    .ok_or_else(|| "database_file_name_required".to_string())?,
            )?;
            self.external_dbs
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?
                .remove(file_name);
            return Ok(());
        }

        let connection = self
            .fixed_connection(request.database)
            .ok_or_else(|| "database_target_invalid".to_string())?;
        let mut guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        let _ = guard.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
        *guard = Connection::open_in_memory()
            .map_err(|error| format!("database_close_failed:{error}"))?;
        Ok(())
    }

    pub(crate) fn reopen_connection(&self, request: SqlConnectionRequest) -> Result<(), String> {
        if request.database == StorageDatabase::DatabaseFile {
            let file_name = validate_database_file_name(
                request
                    .file_name
                    .as_deref()
                    .ok_or_else(|| "database_file_name_required".to_string())?,
            )?;
            self.external_dbs
                .lock()
                .map_err(|_| "database_connection_lock_failed".to_string())?
                .remove(file_name);
            return Ok(());
        }

        let connection = self
            .fixed_connection(request.database)
            .ok_or_else(|| "database_target_invalid".to_string())?;
        let path = self.database_path(request.database, None)?;
        let db_type = fixed_database_type(request.database, request.db_type);
        let mut guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        *guard = match request.database {
            StorageDatabase::User | StorageDatabase::UserMedia | StorageDatabase::UserLogs => {
                open_tracked_user_database(
                    &path,
                    db_type,
                    request.database,
                    &self.user_bundle_dirty,
                )?
            }
            StorageDatabase::System
            | StorageDatabase::SystemMedia
            | StorageDatabase::DatabaseFile => open_sqlite_db(&path, db_type)?,
        };
        Ok(())
    }

    pub(crate) fn fixed_connection(
        &self,
        database: StorageDatabase,
    ) -> Option<Arc<Mutex<Connection>>> {
        match database {
            StorageDatabase::User => Some(Arc::clone(&self.user_db)),
            StorageDatabase::System => Some(Arc::clone(&self.system_db)),
            StorageDatabase::UserMedia => Some(Arc::clone(&self.user_media_db)),
            StorageDatabase::SystemMedia => Some(Arc::clone(&self.system_media_db)),
            StorageDatabase::UserLogs => Some(Arc::clone(&self.user_logs_db)),
            StorageDatabase::DatabaseFile => None,
        }
    }

    fn database_path(
        &self,
        database: StorageDatabase,
        file_name: Option<&str>,
    ) -> Result<PathBuf, String> {
        match database {
            StorageDatabase::User => Ok(self.database_dir.join(USER_DATABASE_FILE)),
            StorageDatabase::System => Ok(self.database_dir.join(SYSTEM_DATABASE_FILE)),
            StorageDatabase::UserMedia => Ok(self.database_dir.join(USER_MEDIA_DATABASE_FILE)),
            StorageDatabase::SystemMedia => Ok(self.database_dir.join(SYSTEM_MEDIA_DATABASE_FILE)),
            StorageDatabase::UserLogs => Ok(self.database_dir.join(USER_LOGS_DATABASE_FILE)),
            StorageDatabase::DatabaseFile => {
                Ok(self.database_dir.join(validate_database_file_name(
                    file_name.ok_or_else(|| "database_file_name_required".to_string())?,
                )?))
            }
        }
    }

    fn connection_for(
        &self,
        request: &SqlConnectionRequest,
    ) -> Result<Arc<Mutex<Connection>>, String> {
        if let Some(connection) = self.fixed_connection(request.database) {
            return Ok(connection);
        }

        let file_name = validate_database_file_name(
            request
                .file_name
                .as_deref()
                .ok_or_else(|| "database_file_name_required".to_string())?,
        )?;
        let mut external = self
            .external_dbs
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;

        if let Some(connection) = external.get(file_name) {
            return Ok(Arc::clone(connection));
        }

        let db_type = fixed_database_type(request.database, request.db_type);
        let connection = Arc::new(Mutex::new(open_sqlite_db(
            &self.database_dir.join(file_name),
            db_type,
        )?));
        external.insert(file_name.to_string(), Arc::clone(&connection));
        Ok(connection)
    }
}

fn open_tracked_user_database(
    path: &Path,
    db_type: DbType,
    database: StorageDatabase,
    dirty: &Arc<UserBundleDirtyFlags>,
) -> Result<Connection, String> {
    let connection = open_sqlite_db(path, db_type)?;
    install_user_bundle_dirty_hook(&connection, database, dirty);
    Ok(connection)
}

fn install_user_bundle_dirty_hook(
    connection: &Connection,
    database: StorageDatabase,
    dirty: &Arc<UserBundleDirtyFlags>,
) {
    let dirty = Arc::clone(dirty);
    connection.update_hook(Some(move |_, database_name: &str, table_name: &str, _| {
        if database_name == "main" && !table_name.starts_with("sqlite_") {
            dirty.mark_database(database);
        }
    }));
}

fn fixed_database_type(database: StorageDatabase, requested: Option<DbType>) -> DbType {
    match database {
        StorageDatabase::User | StorageDatabase::System => DbType::Operational,
        StorageDatabase::UserMedia => DbType::MediaIndex,
        StorageDatabase::SystemMedia => DbType::SystemMediaIndex,
        StorageDatabase::UserLogs => DbType::Logs,
        StorageDatabase::DatabaseFile => requested.unwrap_or(DbType::Operational),
    }
}

fn app_database_dir(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(DATABASE_DIRECTORY)
}

fn validate_database_file_name(value: &str) -> Result<&str, String> {
    let trimmed = value.trim();
    if trimmed.is_empty()
        || trimmed.contains('/')
        || trimmed.contains('\\')
        || trimmed == "."
        || trimmed == ".."
        || trimmed.starts_with('.')
    {
        return Err("database_file_name_invalid".to_string());
    }
    Ok(trimmed)
}
