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
        types::{CasMediaPayload, UserStorageDomain},
    },
    storage::{bytes_to_hex, decode_hash_hex, StorageManager},
};
use rusqlite::Connection;
use std::{fs, path::Path};

pub(super) fn write_mirror_media(
    target_path: &Path,
    domain: UserStorageDomain,
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
        .join(UserStorageDomain::Media.as_str())
        .join("vault");

    // CAS files are only meaningful when indexed by the media DB. Copying every
    // physical file would let orphan bytes from an old/imported base leak into a
    // new mirror, so both directions are constrained by each side's active
    // `blobs.hash` rows.
    let active_hashes = active_media_hashes(storage)?;
    let target_hashes = target_media_hashes(target_path)?;
    let pushed = copy_referenced_files(&active_vault, &backup_vault, &active_hashes)?;
    let pulled = copy_referenced_files(&backup_vault, &active_vault, &target_hashes)?;
    Ok(pushed || pulled)
}

pub(super) fn collect_new_target_payloads(
    target_path: &Path,
    queue_connection: &Connection,
) -> Result<Vec<CasMediaPayload>, String> {
    let media_db_path = target_path.join(UserStorageDomain::Media.base_database_name());
    if !media_db_path.is_file() {
        return Ok(Vec::new());
    }
    let connection = applier::open_domain_database(&media_db_path, UserStorageDomain::Media)?;
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
        let path = target_cas_path(target_path, UserStorageDomain::Media, &hash_hex);
        if !path.is_file() {
            continue;
        }
        let bytes = fs::read(&path)
            .map_err(|error| format!("replication_target_media_read_failed:{error}"))?;
        payloads.push(CasMediaPayload { hash_hex, bytes });
    }
    Ok(payloads)
}

fn copy_referenced_files(
    source_root: &Path,
    destination_root: &Path,
    hash_hexes: &[String],
) -> Result<bool, String> {
    let mut changed = false;
    for hash_hex in hash_hexes {
        let source_path = cas_path_from_root(source_root, hash_hex)?;
        if !source_path.is_file() {
            continue;
        }
        let destination_path = cas_path_from_root(destination_root, hash_hex)?;
        if destination_path.is_file() {
            continue;
        }
        if let Some(parent) = destination_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("replication_initial_vault_parent_failed:{error}"))?;
        }
        fs::copy(&source_path, &destination_path)
            .map_err(|error| format!("replication_initial_vault_copy_failed:{error}"))?;
        changed = true;
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
    media_hashes(&media_db, "replication_initial_media")
}

fn target_media_hashes(target_path: &Path) -> Result<Vec<String>, String> {
    let media_db_path = target_path.join(UserStorageDomain::Media.base_database_name());
    if !media_db_path.is_file() {
        return Ok(Vec::new());
    }
    let connection = applier::open_domain_database(&media_db_path, UserStorageDomain::Media)?;
    media_hashes(&connection, "replication_target_media")
}

fn media_hashes(connection: &Connection, error_prefix: &str) -> Result<Vec<String>, String> {
    if !table_exists(connection, "blobs")? {
        return Ok(Vec::new());
    }
    let mut statement = connection
        .prepare_cached("SELECT hash FROM blobs WHERE removed_at IS NULL ORDER BY hash")
        .map_err(|error| format!("{error_prefix}_hash_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, Vec<u8>>(0))
        .map_err(|error| format!("{error_prefix}_hash_select_failed:{error}"))?;
    rows.map(|row| {
        row.map(|hash| bytes_to_hex(&hash))
            .map_err(|error| format!("{error_prefix}_hash_row_failed:{error}"))
    })
    .collect()
}

fn cas_path_from_root(root: &Path, hash_hex: &str) -> Result<std::path::PathBuf, String> {
    let hash = decode_hash_hex(hash_hex)?;
    let normalized = bytes_to_hex(&hash);
    Ok(root
        .join(&normalized[0..2])
        .join(&normalized[2..4])
        .join(format!("{normalized}.bin")))
}

fn target_cas_path(
    target_path: &Path,
    domain: UserStorageDomain,
    hash_hex: &str,
) -> std::path::PathBuf {
    target_path
        .join(domain.as_str())
        .join("vault")
        .join(&hash_hex[0..2])
        .join(&hash_hex[2..4])
        .join(format!("{hash_hex}.bin"))
}
