//! Storage boundary for the local-first app.
//!
//! The module is split by responsibility:
//! - `data`: operational/system SQLite connections and generic SQL execution.
//! - `media`: media index metadata stored in SQLite.
//! - `cas`: physical content-addressable files stored in the vault.

mod cas;
mod commands;
mod contracts;
mod data;
mod database_manifest;
mod deletion;
mod dirty;
mod media;
mod sql_bridge;
mod sqlite;
mod uuid;

pub use cas::{bytes_to_hex, detect_mime_type, StorageDomain};
pub use commands::*;
pub use contracts::{
    DbType, DeletionAuditLog, DeletionAuditLogsRequest, GalleryItem, GalleryRequest,
    HardDeleteTrashRequest, MediaHashRequest, SaveMediaRequest, SaveMediaResponse,
    SqlConnectionRequest, SqlExecuteResponse, SqlRequest, StorageDatabase, SyncStatusRequest,
};
pub use data::StorageManager;
pub use sqlite::open_sqlite_db;

pub(crate) use cas::{decode_hash_hex, path_to_string, sha256};
pub(crate) use database_manifest::{
    ensure_database_manifest, ensure_same_database_identity, read_database_manifest,
    validate_database_manifest_schema,
};
pub(crate) use dirty::UserBundleDirtyFlags;
pub(crate) use sql_bridge::{execute_statement, select_rows};
pub(crate) use uuid::uuid_v7_string;
