//! Outbound patch capture.
//!
//! Each engine compares active user databases against local baseline snapshots.
//! Differences become SQLite changesets in the outbound queue. Media files are
//! content-addressed and attached only when their hash was not sent before.

mod baseline;
mod changeset;
mod media;
mod schema;

use crate::{
    replication::{
        outbox::queue,
        types::{EnvelopeStage, PatchEnvelope, StorageDomain},
    },
    storage::{StorageDatabase, StorageManager},
};
use rusqlite::Connection;
use std::path::Path;

pub(crate) fn capture_once(storage: &StorageManager) -> Result<usize, String> {
    let queue_connection = queue::open_queue(storage)?;
    let mut produced = 0_usize;
    for domain in [
        StorageDomain::UserData,
        StorageDomain::UserMedia,
        StorageDomain::UserLogs,
    ] {
        if capture_domain(storage, &queue_connection, domain)?.is_some() {
            produced = produced.saturating_add(1);
        }
    }
    Ok(produced)
}

pub(crate) fn reset_all_baselines(storage: &StorageManager) -> Result<(), String> {
    // A reset means the current active state is already represented by
    // receivers. It prevents duplicated patches after bootstrap/pull syncs.
    for domain in [
        StorageDomain::UserData,
        StorageDomain::UserMedia,
        StorageDomain::UserLogs,
    ] {
        let path = baseline::baseline_path(storage, domain)?;
        baseline::snapshot_active_database(storage, domain, &path)?;
        storage.clear_user_bundle_dirty(storage_database_for_domain(domain));
    }
    Ok(())
}

pub(crate) fn create_patch_against_baseline(
    connection: &Connection,
    baseline_path: &Path,
) -> Result<Vec<u8>, String> {
    changeset::create_against_baseline(connection, baseline_path)
}

pub(crate) fn snapshot_connection(
    connection: &Connection,
    destination: &Path,
) -> Result<(), String> {
    baseline::snapshot_connection(connection, destination)
}

fn capture_domain(
    storage: &StorageManager,
    queue_connection: &Connection,
    domain: StorageDomain,
) -> Result<Option<String>, String> {
    let database = storage_database_for_domain(domain);
    let baseline_path = baseline::baseline_path(storage, domain)?;
    if !baseline_path.is_file() {
        // First engine only creates the comparison base. The next engine can
        // safely emit a patch if something changed afterwards.
        baseline::snapshot_active_database(storage, domain, &baseline_path)?;
        storage.clear_user_bundle_dirty(database);
        return Ok(None);
    }

    if !storage.take_user_bundle_dirty(database) {
        return Ok(None);
    }

    let result = capture_dirty_domain(storage, queue_connection, domain, &baseline_path);
    if result.is_err() {
        storage.mark_user_bundle_dirty(database);
    }
    result
}

fn capture_dirty_domain(
    storage: &StorageManager,
    queue_connection: &Connection,
    domain: StorageDomain,
    baseline_path: &Path,
) -> Result<Option<String>, String> {
    let connection = match domain {
        StorageDomain::UserData => storage.user_db.clone(),
        StorageDomain::UserMedia => storage.user_media_db.clone(),
        StorageDomain::UserLogs => storage.user_logs_db.clone(),
    };
    let guard = connection
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    let patch_bytes = changeset::create_against_baseline(&guard, &baseline_path)?;

    if patch_bytes.is_empty() {
        return Ok(None);
    }

    let media_files = if domain == StorageDomain::UserMedia {
        media::collect_new_payloads(storage, &guard, queue_connection)?
    } else {
        Vec::new()
    };

    let envelope = PatchEnvelope {
        sequence_id: queue::next_sequence_id(queue_connection)?,
        domain,
        device_id: queue::device_id(queue_connection)?,
        created_at: queue::now_unix(),
        patch_bytes,
        media_files,
    };
    let id = queue::enqueue_envelope(queue_connection, &envelope, EnvelopeStage::Micro, None, &[])?;
    queue::remember_media_files(queue_connection, &envelope.media_files)?;
    baseline::snapshot_connection(&guard, &baseline_path)?;
    Ok(Some(id))
}

fn storage_database_for_domain(domain: StorageDomain) -> StorageDatabase {
    match domain {
        StorageDomain::UserData => StorageDatabase::User,
        StorageDomain::UserMedia => StorageDatabase::UserMedia,
        StorageDomain::UserLogs => StorageDatabase::UserLogs,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{SaveMediaRequest, StorageDomain as CasStorageDomain};
    use rusqlite::Connection;
    use std::{
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn clean_cycle_waits_until_user_data_is_dirty() {
        let (storage, _root) = test_storage("dirty-user-data");
        setup_records_table(&storage, "base", "2026-07-23T10:00:00Z");

        assert_eq!(0, capture_once(&storage).expect("create baselines"));
        assert_eq!(0, capture_once(&storage).expect("skip clean cycle"));

        storage
            .user_db
            .lock()
            .expect("lock user db")
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                ["changed", "2026-07-23T10:01:00Z"],
            )
            .expect("update record");

        assert_eq!(1, capture_once(&storage).expect("capture dirty db"));
    }

    #[test]
    fn user_media_write_marks_without_rowid_table_dirty() {
        let (storage, _root) = test_storage("dirty-user-media");

        assert_eq!(0, capture_once(&storage).expect("create baselines"));

        storage
            .save_media(SaveMediaRequest {
                source: CasStorageDomain::User,
                bytes: vec![0x89, 0x50, 0x4E, 0x47, 1, 2, 3, 4],
                mime_type: Some("image/png".to_string()),
                thumbnail: None,
                width: Some(10),
                height: Some(10),
            })
            .expect("save media");

        assert_eq!(1, capture_once(&storage).expect("capture dirty media db"));
    }

    fn test_storage(label: &str) -> (StorageManager, PathBuf) {
        let root = std::env::temp_dir().join(format!(
            "vclinic-capture-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        let storage = StorageManager::new_for_tests(root.join("db"), root.join("data"))
            .expect("test storage");
        (storage, root)
    }

    fn setup_records_table(storage: &StorageManager, value: &str, updated_at: &str) {
        let active = storage.user_db.lock().expect("lock active db");
        setup_records_connection(&active, value, updated_at);
    }

    fn setup_records_connection(connection: &Connection, value: &str, updated_at: &str) {
        connection
            .execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS records (
                    id TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                DELETE FROM records;
                "#,
            )
            .expect("create records table");
        connection
            .execute(
                r#"
                INSERT INTO records (id, value, updated_at, created_at)
                VALUES ('a', ?1, ?2, '2026-07-23T09:00:00Z')
                "#,
                [value, updated_at],
            )
            .expect("insert record");
    }
}
