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

const CURRENT_SCHEMA_VERSION: i64 = 1;
const USER_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user.db";
const USER_MEDIA_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user_media.db";
const USER_LOGS_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user_logs.db";
const SQLITE_SIDECARS: [&str; 2] = ["-wal", "-shm"];
