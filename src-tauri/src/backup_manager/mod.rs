mod backup;
mod cas_mirror;
mod commands;
mod contracts;
mod csv;
mod csv_tables;
mod db_snapshot;
mod exporter;
mod files;
mod importer;
mod manifest;
mod sqlite;
mod time;
mod zip;

pub use commands::*;

const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const CURRENT_SCHEMA_VERSION: i64 = 1;
const MANIFEST_FILE: &str = "manifest.json";
const USER_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user.db";
const USER_MEDIA_DB_PACKAGE_PATH: &str = "data/veterinary_clinic_user_media.db";
const DB_SNAPSHOT_KEEP_COUNT: usize = 6;
const SQLITE_SIDECARS: [&str; 2] = ["-wal", "-shm"];
