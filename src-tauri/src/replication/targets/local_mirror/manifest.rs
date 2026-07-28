//! Safety manifest for a local mirror folder.
//!
//! The mirror is not a one-shot export package, but the selected directory must
//! be self-describing. This manifest lets future restore/import code validate
//! that the folder belongs to the replication backup layout before touching
//! active application data.

use crate::{replication::types::StorageDomain, storage::StorageManager};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

const MANIFEST_FILE: &str = "manifest.json";
const FORMAT_VERSION: i64 = 1;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalMirrorManifest {
    app_version: String,
    schema_version: i64,
    created_at: String,
    updated_at: String,
    export_type: String,
    domain: String,
    format_version: i64,
    databases: Vec<MirrorDatabase>,
    cas_roots: Vec<MirrorCasRoot>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MirrorDatabase {
    domain: &'static str,
    path: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MirrorCasRoot {
    domain: &'static str,
    path: &'static str,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExistingManifest {
    created_at: Option<String>,
}

pub(super) fn ensure_exists(storage: &StorageManager, target_path: &Path) -> Result<(), String> {
    if target_path.join(MANIFEST_FILE).is_file() {
        return Ok(());
    }
    write(storage, target_path)
}

pub(super) fn write(storage: &StorageManager, target_path: &Path) -> Result<(), String> {
    fs::create_dir_all(target_path)
        .map_err(|error| format!("replication_manifest_dir_failed:{error}"))?;

    let updated_at = sqlite_now_iso(storage)?;
    let manifest = LocalMirrorManifest {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        schema_version: user_schema_version(storage)?,
        created_at: existing_created_at(target_path).unwrap_or_else(|| updated_at.clone()),
        updated_at,
        export_type: "local_mirror".to_string(),
        domain: "user".to_string(),
        format_version: FORMAT_VERSION,
        databases: vec![
            MirrorDatabase {
                domain: StorageDomain::UserData.as_str(),
                path: StorageDomain::UserData.base_database_name(),
            },
            MirrorDatabase {
                domain: StorageDomain::UserMedia.as_str(),
                path: StorageDomain::UserMedia.base_database_name(),
            },
            MirrorDatabase {
                domain: StorageDomain::UserLogs.as_str(),
                path: StorageDomain::UserLogs.base_database_name(),
            },
        ],
        cas_roots: vec![MirrorCasRoot {
            domain: StorageDomain::UserMedia.as_str(),
            path: "userMedia/vault",
        }],
    };

    let json = serde_json::to_string_pretty(&manifest)
        .map_err(|error| format!("replication_manifest_serialize_failed:{error}"))?;
    let final_path = target_path.join(MANIFEST_FILE);
    let temp_path = target_path.join(format!("{MANIFEST_FILE}.tmp"));
    fs::write(&temp_path, format!("{json}\n"))
        .map_err(|error| format!("replication_manifest_write_failed:{error}"))?;
    if final_path.exists() {
        fs::remove_file(&final_path)
            .map_err(|error| format!("replication_manifest_replace_failed:{error}"))?;
    }
    fs::rename(&temp_path, &final_path)
        .map_err(|error| format!("replication_manifest_commit_failed:{error}"))
}

fn existing_created_at(target_path: &Path) -> Option<String> {
    let bytes = fs::read(target_path.join(MANIFEST_FILE)).ok()?;
    let manifest = serde_json::from_slice::<ExistingManifest>(&bytes).ok()?;
    manifest.created_at
}

fn sqlite_now_iso(storage: &StorageManager) -> Result<String, String> {
    let connection = storage
        .user_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    connection
        .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", [], |row| {
            row.get(0)
        })
        .map_err(|error| format!("replication_manifest_clock_failed:{error}"))
}

fn user_schema_version(storage: &StorageManager) -> Result<i64, String> {
    let connection = storage
        .user_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("replication_manifest_schema_failed:{error}"))
}
