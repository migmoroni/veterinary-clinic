//! Full local package import/export.
//!
//! `distribution` owns explicit user-driven data movement: native ZIP export,
//! CSV export, native import and CSV import. Continuous local/cloud backup is
//! replication work and stays in `replication`.

mod commands;
mod contracts;
mod csv;
mod csv_tables;
mod database_package;
mod exporter;
mod files;
mod importer;
mod sqlite;
mod time;
mod zip;

pub use commands::*;

const CURRENT_USER_MAIN_SCHEMA_VERSION: i64 =
    crate::schema_versions::CURRENT_USER_MAIN_SCHEMA_VERSION;
const CURRENT_USER_MEDIA_SCHEMA_VERSION: i64 =
    crate::schema_versions::CURRENT_USER_MEDIA_SCHEMA_VERSION;
const CURRENT_USER_LOGS_SCHEMA_VERSION: i64 =
    crate::schema_versions::CURRENT_USER_LOGS_SCHEMA_VERSION;
const USER_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user.db";
const USER_MEDIA_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user_media.db";
const USER_LOGS_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user_logs.db";
const SQLITE_SIDECARS: [&str; 2] = ["-wal", "-shm"];
