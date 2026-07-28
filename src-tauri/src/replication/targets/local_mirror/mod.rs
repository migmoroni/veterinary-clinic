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
mod identity;
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

pub(crate) fn general_target_path_for_config(
    config: &LocalReceptorConfig,
) -> Option<std::path::PathBuf> {
    target::general_target_path_for_config(config)
}

pub(crate) fn receive_envelope(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    let config = load_config(storage)?;
    if !config.enabled {
        return Err("replication_local_mirror_disabled".to_string());
    }

    let target = target::resolve_effective_target(storage, &config)?;
    let target_had_any_base_database = base::has_any_base_database(&target.path);
    identity::validate_existing_target(storage, &target.path, target_had_any_base_database)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    identity::validate_current_target(storage, &target.path)?;
    for media in &envelope.media_files {
        media::write_mirror_media(&target.path, envelope.domain, media)?;
    }

    let base_db_path = target.path.join(envelope.domain.base_database_name());
    let connection = applier::open_domain_database(&base_db_path, envelope.domain)?;
    applier::apply_patch_to_connection(&connection, &envelope.patch_bytes)?;
    baseline::reset_domain(storage, &target.path, envelope.domain)
}

pub(crate) fn initialize_configured_target(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<EffectiveTarget, String> {
    let target = target::resolve_effective_target(storage, config)?;
    let target_had_any_base_database = base::has_any_base_database(&target.path);
    identity::validate_existing_target(storage, &target.path, target_had_any_base_database)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    identity::validate_current_target(storage, &target.path)?;
    bootstrap::bootstrap_databases(storage, &target.path)?;
    let _ = media::sync_user_cas_bidirectional(storage, &target.path)?;
    media::seed_known_media_hashes(storage)?;
    baseline::reset_all(storage, &target.path)?;
    Ok(target)
}

pub(crate) fn pull_envelopes(storage: &StorageManager) -> Result<Vec<PatchEnvelope>, String> {
    let config = load_config(storage)?;
    if !config.enabled {
        return Ok(Vec::new());
    }

    let target = target::resolve_effective_target(storage, &config)?;
    let target_had_any_base_database = base::has_any_base_database(&target.path);
    identity::validate_existing_target(storage, &target.path, target_had_any_base_database)?;
    base::ensure_all_base_databases(storage, &target.path)?;
    identity::validate_current_target(storage, &target.path)?;
    let _ = media::sync_user_cas_bidirectional(storage, &target.path)?;

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
    use crate::storage::{open_sqlite_db, read_database_manifest, DbType, StorageManager};
    use rusqlite::{params, Connection};
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

        let target = initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");
        let manifest = {
            let active_logs = storage.user_logs_db.lock().expect("lock active logs db");
            read_database_manifest(&active_logs).expect("read active manifest")
        };

        assert_eq!(target_path, target.path.parent().expect("target parent"));
        assert_eq!(
            format!("Veterinary Clinic - {}", manifest.database_id),
            target
                .path
                .file_name()
                .expect("target label")
                .to_string_lossy()
        );
        assert!(target
            .path
            .join(StorageDomain::UserData.base_database_name())
            .is_file());
        assert!(target
            .path
            .join(StorageDomain::UserMedia.base_database_name())
            .is_file());
        assert!(target
            .path
            .join(StorageDomain::UserLogs.base_database_name())
            .is_file());
    }

    #[test]
    fn bootstrap_empty_local_mirror_does_not_copy_unindexed_cas_files() {
        let (storage, root) = test_storage("orphan-cas-bootstrap");
        setup_active_user_table(&storage, "active", "2026-07-23T10:00:00Z");
        let orphan_hash = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        let active_orphan_path = cas_path_from_root(&storage.user_vault_path(), orphan_hash);
        fs::create_dir_all(active_orphan_path.parent().expect("orphan parent"))
            .expect("create orphan dir");
        fs::write(&active_orphan_path, b"orphan").expect("write orphan");
        let target_path = root.join("mirror");

        let target = initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");
        let target_orphan_path = cas_path_from_root(
            &target
                .path
                .join(StorageDomain::UserMedia.as_str())
                .join("vault"),
            orphan_hash,
        );

        assert!(active_orphan_path.is_file());
        assert!(!target_orphan_path.exists());
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
        seed_target_logs_with_active_identity(&storage, &target_path);

        initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");

        let active = storage.user_db.lock().expect("lock active db");
        assert_record(&active, "mirror-new", "2026-07-23T11:00:00Z");
    }

    #[test]
    fn bootstrap_existing_local_mirror_keeps_newer_tombstone_over_imported_old_row() {
        let (storage, root) = test_storage("existing-tombstone-bootstrap");
        setup_active_user_table_with_removed(
            &storage,
            "imported-old",
            "2026-07-23T10:00:00Z",
            None,
        );
        let target_path = root.join("mirror");
        fs::create_dir_all(&target_path).expect("create mirror");
        let target_user_db = open_sqlite_db(
            &target_path.join(StorageDomain::UserData.base_database_name()),
            DbType::Operational,
        )
        .expect("open mirror db");
        setup_records_table_with_removed(
            &target_user_db,
            "[deleted]",
            "2026-07-23T11:00:00Z",
            Some("2026-07-23T11:00:00Z"),
        );
        seed_target_logs_with_active_identity(&storage, &target_path);

        initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect("initialize target");

        let active = storage.user_db.lock().expect("lock active db");
        assert_record_with_removed(
            &active,
            "[deleted]",
            "2026-07-23T11:00:00Z",
            Some("2026-07-23T11:00:00Z"),
        );
        assert_record_with_removed(
            &target_user_db,
            "[deleted]",
            "2026-07-23T11:00:00Z",
            Some("2026-07-23T11:00:00Z"),
        );
    }

    #[test]
    fn bootstrap_existing_local_mirror_rejects_another_database_identity() {
        let (storage, root) = test_storage("identity-mismatch");
        setup_active_user_table(&storage, "active", "2026-07-23T10:00:00Z");
        let target_path = root.join("mirror");
        fs::create_dir_all(&target_path).expect("create mirror");
        let _target_logs_db = open_sqlite_db(
            &target_path.join(StorageDomain::UserLogs.base_database_name()),
            DbType::Logs,
        )
        .expect("create target logs db");

        let error = initialize_configured_target(&storage, &enabled_config(&target_path))
            .expect_err("reject another database identity");

        assert!(error.starts_with("database_manifest_identity_mismatch:"));
    }

    #[test]
    fn local_mirror_change_generates_patch_envelope() {
        let (storage, root) = test_storage("pull-patch");
        setup_active_user_table(&storage, "active", "2026-07-23T10:00:00Z");
        let target_path = root.join("mirror");
        let config = enabled_config(&target_path);
        save_config(&storage, &config).expect("save config");
        let target = initialize_configured_target(&storage, &config).expect("initialize target");

        let target_user_db = open_sqlite_db(
            &target
                .path
                .join(StorageDomain::UserData.base_database_name()),
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

    fn cas_path_from_root(root: &std::path::Path, hash_hex: &str) -> PathBuf {
        root.join(&hash_hex[0..2])
            .join(&hash_hex[2..4])
            .join(format!("{hash_hex}.bin"))
    }

    fn setup_active_user_table(storage: &StorageManager, value: &str, updated_at: &str) {
        let active = storage.user_db.lock().expect("lock active db");
        setup_records_table(&active, value, updated_at);
    }

    fn setup_active_user_table_with_removed(
        storage: &StorageManager,
        value: &str,
        updated_at: &str,
        removed_at: Option<&str>,
    ) {
        let active = storage.user_db.lock().expect("lock active db");
        setup_records_table_with_removed(&active, value, updated_at, removed_at);
    }

    fn setup_records_table(connection: &Connection, value: &str, updated_at: &str) {
        setup_records_table_with_removed(connection, value, updated_at, None);
    }

    fn setup_records_table_with_removed(
        connection: &Connection,
        value: &str,
        updated_at: &str,
        removed_at: Option<&str>,
    ) {
        connection
            .execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS records (
                    id TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    removed_at TEXT
                );
                DELETE FROM records;
                "#,
            )
            .expect("create records table");
        connection
            .execute(
                r#"
                INSERT INTO records (id, value, updated_at, created_at, removed_at)
                VALUES ('a', ?1, ?2, '2026-07-23T09:00:00Z', ?3)
                "#,
                params![value, updated_at, removed_at],
            )
            .expect("insert record");
    }

    fn seed_target_logs_with_active_identity(
        storage: &StorageManager,
        target_path: &std::path::Path,
    ) {
        let manifest = {
            let active_logs = storage.user_logs_db.lock().expect("lock active logs db");
            read_database_manifest(&active_logs).expect("read active manifest")
        };
        let target_logs = open_sqlite_db(
            &target_path.join(StorageDomain::UserLogs.base_database_name()),
            DbType::Logs,
        )
        .expect("open target logs db");
        target_logs
            .execute("DELETE FROM database_manifest", [])
            .expect("clear target manifest");
        target_logs
            .execute(
                r#"
                INSERT INTO database_manifest (
                    scope, database_id, app_version, schema_version, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                "#,
                params![
                    manifest.scope,
                    manifest.database_id,
                    manifest.app_version,
                    manifest.schema_version,
                    manifest.created_at,
                    manifest.updated_at
                ],
            )
            .expect("seed target manifest");
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

    fn assert_record_with_removed(
        connection: &Connection,
        value: &str,
        updated_at: &str,
        removed_at: Option<&str>,
    ) {
        let row = connection
            .query_row(
                "SELECT value, updated_at, removed_at FROM records WHERE id = 'a'",
                [],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                    ))
                },
            )
            .expect("load record");
        assert_eq!(
            (
                value.to_string(),
                updated_at.to_string(),
                removed_at.map(str::to_string)
            ),
            row
        );
    }
}
