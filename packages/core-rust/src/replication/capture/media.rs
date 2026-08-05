//! CAS media payload collection for `UserMedia` patches.
//!
//! SQLite changesets carry media metadata. The original bytes are immutable CAS
//! files, so the capture attaches bytes only for hashes not already known by
//! the outbound queue.

use crate::{
    replication::{outbox::queue, types::CasMediaPayload},
    storage::{bytes_to_hex, StorageDomain as CasStorageDomain, StorageManager},
};
use rusqlite::Connection;
use std::fs;

pub(super) fn collect_new_payloads(
    storage: &StorageManager,
    media_db: &Connection,
    queue_connection: &Connection,
) -> Result<Vec<CasMediaPayload>, String> {
    let mut statement = media_db
        .prepare_cached("SELECT hash FROM blobs WHERE removed_at IS NULL ORDER BY created_at, hash")
        .map_err(|error| format!("replication_media_hash_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, Vec<u8>>(0))
        .map_err(|error| format!("replication_media_hash_select_failed:{error}"))?;
    let mut payloads = Vec::new();
    for row in rows {
        let hash = row.map_err(|error| format!("replication_media_hash_row_failed:{error}"))?;
        let hash_hex = bytes_to_hex(&hash);
        if queue::is_media_known(queue_connection, &hash_hex)? {
            continue;
        }
        let path = storage.resolve_cas_path(CasStorageDomain::User, &hash)?;
        if !path.is_file() {
            continue;
        }
        let bytes =
            fs::read(&path).map_err(|error| format!("replication_media_read_failed:{error}"))?;
        payloads.push(CasMediaPayload { hash_hex, bytes });
    }
    Ok(payloads)
}
