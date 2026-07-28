//! Local filesystem/NAS mirror target.
//!
//! This target has direct access to backup databases and CAS files. Normal
//! cycles are patch based: target base databases are compared against their own
//! baselines, and inbound deltas are returned to the engine. Bootstrap converges
//! existing folders with full-state changesets.

mod base;
mod baseline;
mod bootstrap;
mod config;
mod manifest;
mod media;
mod schema;
mod status;
mod target;

use crate::{
    replication::{
        applier, capture,
        outbox::queue,
        types::{LocalReceptorConfig, PatchEnvelope, StorageDomain},
    },
    storage::StorageManager,
};

pub(crate) use config::{load_config, save_config};
pub(crate) use status::status;
pub(crate) use target::EffectiveTarget;

pub(crate) fn receive_envelope(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    let config = load_config(storage)?;
    if !config.enabled {
        return Err("replication_local_mirror_disabled".to_string());
    }

    let target = target::resolve_effective_target(storage, &config)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    for media in &envelope.media_files {
        media::write_mirror_media(&target.path, envelope.domain, media)?;
    }

    let base_db_path = target.path.join(envelope.domain.base_database_name());
    let connection = applier::open_domain_database(&base_db_path, envelope.domain)?;
    applier::apply_patch_to_connection(&connection, &envelope.patch_bytes)?;
    baseline::reset_domain(storage, &target.path, envelope.domain)?;
    manifest::write(storage, &target.path)
}

pub(crate) fn initialize_configured_target(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<EffectiveTarget, String> {
    let target = target::resolve_effective_target(storage, config)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    bootstrap::bootstrap_databases(storage, &target.path)?;
    let _ = media::sync_user_cas_bidirectional(storage, &target.path)?;
    media::seed_known_media_hashes(storage)?;
    baseline::reset_all(storage, &target.path)?;
    manifest::write(storage, &target.path)?;
    Ok(target)
}

pub(crate) fn pull_envelopes(storage: &StorageManager) -> Result<Vec<PatchEnvelope>, String> {
    let config = load_config(storage)?;
    if !config.enabled {
        return Ok(Vec::new());
    }

    let target = target::resolve_effective_target(storage, &config)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    let cas_changed = media::sync_user_cas_bidirectional(storage, &target.path)?;
    if cas_changed {
        manifest::write(storage, &target.path)?;
    } else {
        manifest::ensure_exists(storage, &target.path)?;
    }

    let queue_connection = queue::open_queue(storage)?;
    let mut envelopes = Vec::new();
    for domain in [
        StorageDomain::UserData,
        StorageDomain::UserMedia,
        StorageDomain::UserLogs,
    ] {
        if !baseline::ensure_exists(storage, &target.path, domain)? {
            continue;
        }
        let connection =
            applier::open_domain_database(&target.path.join(domain.base_database_name()), domain)?;
        let patch_bytes = capture::create_patch_against_baseline(
            &connection,
            &baseline::path_for(storage, domain)?,
        )?;
        if patch_bytes.is_empty() {
            continue;
        }
        let media_files = if domain == StorageDomain::UserMedia {
            media::collect_new_target_payloads(&target.path, &queue_connection)?
        } else {
            Vec::new()
        };
        envelopes.push(PatchEnvelope {
            sequence_id: queue::next_sequence_id(&queue_connection)?,
            domain,
            device_id: queue::device_id(&queue_connection)?,
            created_at: queue::now_unix(),
            patch_bytes,
            media_files,
        });
    }

    Ok(envelopes)
}

pub(crate) fn ack_pulled_domain(
    storage: &StorageManager,
    domain: StorageDomain,
) -> Result<(), String> {
    let config = load_config(storage)?;
    if !config.enabled {
        return Ok(());
    }
    let target = target::resolve_effective_target(storage, &config)?;
    baseline::reset_domain(storage, &target.path, domain)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{open_sqlite_db, DbType, StorageManager};
    use rusqlite::Connection;
    use std::{
        fs,
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn bootstrap_empty_local_mirror_creates_all_base_databases() {
        let (storage, root) = test_storage("empty-bootstrap");
        setup_active_user_table(&storage, "active", "2026-07-23T10:00:00Z");
        let target_path = root.join("mirror");

        initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");

        assert!(target_path
            .join(StorageDomain::UserData.base_database_name())
            .is_file());
        assert!(target_path
            .join(StorageDomain::UserMedia.base_database_name())
            .is_file());
        assert!(target_path
            .join(StorageDomain::UserLogs.base_database_name())
            .is_file());
        assert!(target_path.join("manifest.json").is_file());
    }

    #[test]
    fn bootstrap_existing_local_mirror_pulls_newer_target_row() {
        let (storage, root) = test_storage("existing-bootstrap");
        setup_active_user_table(&storage, "active-old", "2026-07-23T10:00:00Z");
        let target_path = root.join("mirror");
        fs::create_dir_all(&target_path).expect("create mirror");
        let target_user_db = open_sqlite_db(
            &target_path.join(StorageDomain::UserData.base_database_name()),
            DbType::Operational,
        )
        .expect("open mirror db");
        setup_records_table(&target_user_db, "mirror-new", "2026-07-23T11:00:00Z");

        initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");

        let active = storage.user_db.lock().expect("lock active db");
        assert_record(&active, "mirror-new", "2026-07-23T11:00:00Z");
    }

    #[test]
    fn local_mirror_change_generates_patch_envelope() {
        let (storage, root) = test_storage("pull-patch");
        setup_active_user_table(&storage, "active", "2026-07-23T10:00:00Z");
        let target_path = root.join("mirror");
        let config = enabled_config(&target_path);
        save_config(&storage, &config).expect("save config");
        initialize_configured_target(&storage, &config).expect("initialize target");

        let target_user_db = open_sqlite_db(
            &target_path.join(StorageDomain::UserData.base_database_name()),
            DbType::Operational,
        )
        .expect("open target db");
        target_user_db
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                ["mirror-change", "2026-07-23T12:00:00Z"],
            )
            .expect("update target");

        let envelopes = pull_envelopes(&storage).expect("pull envelopes");

        assert_eq!(1, envelopes.len());
        assert_eq!(StorageDomain::UserData, envelopes[0].domain);
        assert!(!envelopes[0].patch_bytes.is_empty());
    }

    fn test_storage(label: &str) -> (StorageManager, PathBuf) {
        let root = std::env::temp_dir().join(format!(
            "vclinic-replication-{label}-{}-{}",
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

    fn enabled_config(target_path: &std::path::Path) -> LocalReceptorConfig {
        LocalReceptorConfig {
            enabled: true,
            target_path: target_path.to_path_buf(),
        }
    }

    fn setup_active_user_table(storage: &StorageManager, value: &str, updated_at: &str) {
        let active = storage.user_db.lock().expect("lock active db");
        setup_records_table(&active, value, updated_at);
    }

    fn setup_records_table(connection: &Connection, value: &str, updated_at: &str) {
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

    fn assert_record(connection: &Connection, value: &str, updated_at: &str) {
        let row = connection
            .query_row(
                "SELECT value, updated_at FROM records WHERE id = 'a'",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("load record");
        assert_eq!((value.to_string(), updated_at.to_string()), row);
    }
}
