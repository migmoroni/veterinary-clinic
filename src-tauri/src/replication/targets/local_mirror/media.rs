//! Local CAS media synchronization.
//!
//! CAS files are immutable by hash. The local mirror can copy files directly
//! because it has filesystem access; when a mirror-originated media patch must
//! be propagated to another target, this module also turns missing files into
//! `CasMediaPayload` attachments.

use super::schema::table_exists;
use crate::{
    replication::{
        applier,
        outbox::queue,
        types::{CasMediaPayload, StorageDomain},
    },
    storage::{bytes_to_hex, decode_hash_hex, StorageManager},
};
use rusqlite::Connection;
use std::{fs, path::Path};

pub(super) fn write_mirror_media(
    target_path: &Path,
    domain: StorageDomain,
    media: &CasMediaPayload,
) -> Result<(), String> {
    let hash = decode_hash_hex(&media.hash_hex)?;
    let expected_hex = bytes_to_hex(&hash);
    if expected_hex != media.hash_hex {
        return Err("replication_media_hash_invalid".to_string());
    }
    let path = target_cas_path(target_path, domain, &media.hash_hex);
    if path.is_file() {
        return Ok(());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_media_dir_failed:{error}"))?;
    }
    fs::write(path, &media.bytes).map_err(|error| format!("replication_media_write_failed:{error}"))
}

pub(super) fn sync_user_cas_bidirectional(
    storage: &StorageManager,
    target_path: &Path,
) -> Result<bool, String> {
    let active_vault = storage.user_vault_path();
    let backup_vault = target_path
        .join(StorageDomain::UserMedia.as_str())
        .join("vault");
    // Local/NAS can be inspected directly, so no API transfer protocol is
    // needed here. Cloud must implement its own CAS API in `cloud_client`.
    let pushed = copy_missing_files_recursive(&active_vault, &backup_vault)?;
    let pulled = copy_missing_files_recursive(&backup_vault, &active_vault)?;
    Ok(pushed || pulled)
}

pub(super) fn collect_new_target_payloads(
    target_path: &Path,
    queue_connection: &Connection,
) -> Result<Vec<CasMediaPayload>, String> {
    let media_db_path = target_path.join(StorageDomain::UserMedia.base_database_name());
    if !media_db_path.is_file() {
        return Ok(Vec::new());
    }
    let connection = applier::open_domain_database(&media_db_path, StorageDomain::UserMedia)?;
    if !table_exists(&connection, "blobs")? {
        return Ok(Vec::new());
    }

    let mut statement = connection
        .prepare_cached("SELECT hash FROM blobs WHERE removed_at IS NULL ORDER BY created_at, hash")
        .map_err(|error| format!("replication_target_media_hash_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, Vec<u8>>(0))
        .map_err(|error| format!("replication_target_media_hash_select_failed:{error}"))?;
    let mut payloads = Vec::new();
    for row in rows {
        let hash =
            row.map_err(|error| format!("replication_target_media_hash_row_failed:{error}"))?;
        let hash_hex = bytes_to_hex(&hash);
        if queue::is_media_known(queue_connection, &hash_hex)? {
            continue;
        }
        let path = target_cas_path(target_path, StorageDomain::UserMedia, &hash_hex);
        if !path.is_file() {
            continue;
        }
        let bytes = fs::read(&path)
            .map_err(|error| format!("replication_target_media_read_failed:{error}"))?;
        payloads.push(CasMediaPayload { hash_hex, bytes });
    }
    Ok(payloads)
}

fn copy_missing_files_recursive(source: &Path, destination: &Path) -> Result<bool, String> {
    if !source.exists() {
        return Ok(false);
    }
    fs::create_dir_all(destination)
        .map_err(|error| format!("replication_initial_vault_dir_failed:{error}"))?;
    let mut changed = false;
    for entry in fs::read_dir(source)
        .map_err(|error| format!("replication_initial_vault_read_failed:{error}"))?
    {
        let entry =
            entry.map_err(|error| format!("replication_initial_vault_entry_failed:{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            changed |= copy_missing_files_recursive(&source_path, &destination_path)?;
        } else if source_path.is_file() && !destination_path.is_file() {
            if let Some(parent) = destination_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| format!("replication_initial_vault_parent_failed:{error}"))?;
            }
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("replication_initial_vault_copy_failed:{error}"))?;
            changed = true;
        }
    }
    Ok(changed)
}

pub(super) fn seed_known_media_hashes(storage: &StorageManager) -> Result<(), String> {
    let hashes = active_media_hashes(storage)?;
    if hashes.is_empty() {
        return Ok(());
    }
    let queue_connection = queue::open_queue(storage)?;
    queue::remember_media_hashes(&queue_connection, &hashes)
}

fn active_media_hashes(storage: &StorageManager) -> Result<Vec<String>, String> {
    let media_db = storage
        .user_media_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    if !table_exists(&media_db, "blobs")? {
        return Ok(Vec::new());
    }
    let mut statement = media_db
        .prepare_cached("SELECT hash FROM blobs WHERE removed_at IS NULL ORDER BY hash")
        .map_err(|error| format!("replication_initial_media_hash_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, Vec<u8>>(0))
        .map_err(|error| format!("replication_initial_media_hash_select_failed:{error}"))?;
    rows.map(|row| {
        row.map(|hash| bytes_to_hex(&hash))
            .map_err(|error| format!("replication_initial_media_hash_row_failed:{error}"))
    })
    .collect()
}

fn target_cas_path(
    target_path: &Path,
    domain: StorageDomain,
    hash_hex: &str,
) -> std::path::PathBuf {
    target_path
        .join(domain.as_str())
        .join("vault")
        .join(&hash_hex[0..2])
        .join(&hash_hex[2..4])
        .join(format!("{hash_hex}.bin"))
}
