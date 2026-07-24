use super::{
    execute_statement, open_sqlite_db, select_rows, DbType, SqlConnectionRequest,
    SqlExecuteResponse, SqlRequest, StorageDatabase, StorageDomain,
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

#[derive(Clone)]
pub struct StorageManager {
    pub user_db: Arc<Mutex<Connection>>,
    pub system_db: Arc<Mutex<Connection>>,
    pub user_media_db: Arc<Mutex<Connection>>,
    pub system_media_db: Arc<Mutex<Connection>>,
    pub base_vault_path: PathBuf,
    database_dir: PathBuf,
    external_dbs: Arc<Mutex<HashMap<String, Arc<Mutex<Connection>>>>>,
}

impl StorageManager {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        let database_dir = app
            .path()
            .app_config_dir()
            .map_err(|error| format!("app_config_dir_unavailable:{error}"))?;
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| format!("app_data_dir_unavailable:{error}"))?;
        let base_vault_path = app_data_dir.join("vault");

        fs::create_dir_all(&database_dir)
            .map_err(|error| format!("database_dir_create_failed:{error}"))?;
        fs::create_dir_all(&base_vault_path)
            .map_err(|error| format!("vault_dir_create_failed:{error}"))?;

        Ok(Self {
            user_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(USER_DATABASE_FILE),
                DbType::Operational,
            )?)),
            system_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_DATABASE_FILE),
                DbType::Operational,
            )?)),
            user_media_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(USER_MEDIA_DATABASE_FILE),
                DbType::MediaIndex,
            )?)),
            system_media_db: Arc::new(Mutex::new(open_sqlite_db(
                &database_dir.join(SYSTEM_MEDIA_DATABASE_FILE),
                DbType::MediaIndex,
            )?)),
            base_vault_path,
            database_dir,
            external_dbs: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub fn user_database_path(&self) -> PathBuf {
        self.database_dir.join(USER_DATABASE_FILE)
    }

    pub fn user_media_database_path(&self) -> PathBuf {
        self.database_dir.join(USER_MEDIA_DATABASE_FILE)
    }

    pub fn user_vault_path(&self) -> PathBuf {
        self.base_vault_path
            .join(StorageDomain::User.vault_segment())
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
        let connection = self.connection_for(&SqlConnectionRequest {
            database: request.database,
            file_name: request.file_name,
            db_type: request.db_type,
        })?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        execute_statement(&guard, &request.query, request.values)
    }

    pub(crate) fn close_connection(&self, request: SqlConnectionRequest) -> Result<(), String> {
        if request.database == StorageDatabase::AppConfigFile {
            let file_name = validate_app_config_file_name(
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
        if request.database == StorageDatabase::AppConfigFile {
            let file_name = validate_app_config_file_name(
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
        let db_type = request.db_type.unwrap_or(match request.database {
            StorageDatabase::UserMedia | StorageDatabase::SystemMedia => DbType::MediaIndex,
            StorageDatabase::User | StorageDatabase::System | StorageDatabase::AppConfigFile => {
                DbType::Operational
            }
        });
        let mut guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        *guard = open_sqlite_db(&path, db_type)?;
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
            StorageDatabase::AppConfigFile => None,
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
            StorageDatabase::AppConfigFile => {
                Ok(self.database_dir.join(validate_app_config_file_name(
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

        let file_name = validate_app_config_file_name(
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

        let db_type = request.db_type.unwrap_or(DbType::Operational);
        let connection = Arc::new(Mutex::new(open_sqlite_db(
            &self.database_dir.join(file_name),
            db_type,
        )?));
        external.insert(file_name.to_string(), Arc::clone(&connection));
        Ok(connection)
    }
}

fn validate_app_config_file_name(value: &str) -> Result<&str, String> {
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
