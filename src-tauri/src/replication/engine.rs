//! Serialized client-side replication engine.
//!
//! This is the only place that should run the full client engine:
//! produce local patches, push queued patches to targets, then pull inbound
//! changes from configured targets. A global lock prevents a background tick
//! and a user-triggered command from racing over baselines and active DBs.

use crate::{
    replication::{
        applier, capture,
        outbox::{queue, transport},
        targets::{self, local_mirror, PulledEnvelope},
        types::{
            EnvelopeStage, LocalReceptorConfig, PatchEnvelope, RestoreFromBackupRequest, TargetId,
        },
    },
    storage::StorageManager,
};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

static CYCLE_LOCK: Mutex<()> = Mutex::new(());

pub(crate) struct EngineOutcome {
    pub active_changed_from_targets: bool,
}

pub(crate) fn run_once(storage: &StorageManager) -> Result<EngineOutcome, String> {
    let _guard = CYCLE_LOCK
        .lock()
        .map_err(|_| "replication_cycle_lock_failed".to_string())?;
    run_once_unlocked(storage)
}

pub(crate) fn initialize_local_target(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<EngineOutcome, String> {
    let _guard = CYCLE_LOCK
        .lock()
        .map_err(|_| "replication_cycle_lock_failed".to_string())?;

    local_mirror::initialize_configured_target(storage, config)?;
    capture::reset_all_baselines(storage)?;

    // Run one normal engine while still holding the lock so target bootstrap,
    // outbound queue delivery and target pull cannot interleave with the
    // background loop.
    let mut outcome = run_once_unlocked(storage)?;
    outcome.active_changed_from_targets = true;
    Ok(outcome)
}

pub(crate) fn apply_inbound_envelope(
    storage: &StorageManager,
    app: &AppHandle,
    envelope: PatchEnvelope,
) -> Result<(), String> {
    let _guard = CYCLE_LOCK
        .lock()
        .map_err(|_| "replication_cycle_lock_failed".to_string())?;
    apply_and_enqueue_inbound(storage, None, envelope)?;
    capture::reset_all_baselines(storage)?;
    app.emit("db-updated", "all")
        .map_err(|error| format!("replication_emit_failed:{error}"))?;
    Ok(())
}

pub(crate) fn restore_from_backup(
    storage: &StorageManager,
    request: RestoreFromBackupRequest,
) -> Result<(), String> {
    let _guard = CYCLE_LOCK
        .lock()
        .map_err(|_| "replication_cycle_lock_failed".to_string())?;
    applier::restore_from_backup(storage, request)?;
    capture::reset_all_baselines(storage)
}

fn run_once_unlocked(storage: &StorageManager) -> Result<EngineOutcome, String> {
    capture::capture_once(storage)?;
    transport::route_pending(storage)?;

    let mut active_changed = false;
    for pulled in targets::pull_from_configured_targets(storage)? {
        apply_pulled_envelope(storage, pulled)?;
        active_changed = true;
    }

    if active_changed {
        transport::route_pending(storage)?;
    }

    Ok(EngineOutcome {
        active_changed_from_targets: active_changed,
    })
}

fn apply_pulled_envelope(storage: &StorageManager, pulled: PulledEnvelope) -> Result<(), String> {
    let domain = pulled.envelope.domain;
    apply_and_enqueue_inbound(storage, Some(pulled.origin), pulled.envelope)?;
    targets::ack_pulled(storage, pulled.origin, domain)?;
    capture::reset_all_baselines(storage)
}

fn apply_and_enqueue_inbound(
    storage: &StorageManager,
    origin_target: Option<TargetId>,
    envelope: PatchEnvelope,
) -> Result<(), String> {
    applier::apply_envelope_to_active(storage, &envelope)?;
    let queue_connection = queue::open_queue(storage)?;
    let delivered_targets = origin_target.into_iter().collect::<Vec<_>>();
    queue::enqueue_envelope(
        &queue_connection,
        &envelope,
        EnvelopeStage::Micro,
        origin_target,
        &delivered_targets,
    )?;
    queue::remember_media_files(&queue_connection, &envelope.media_files)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{session::Session, Connection};
    use std::{
        path::PathBuf,
        time::{SystemTime, UNIX_EPOCH},
    };

    #[test]
    fn cloud_patch_is_applied_and_enqueued_for_other_targets() {
        let (storage, _root) = test_storage("cloud-inbound");
        setup_active_user_table(&storage, "base", "2026-07-23T10:00:00Z");
        let envelope = sample_update_envelope("cloud-new", "2026-07-23T11:00:00Z");

        apply_and_enqueue_inbound(&storage, Some(TargetId::Cloud), envelope)
            .expect("apply cloud inbound");

        assert_active_record(&storage, "cloud-new", "2026-07-23T11:00:00Z");
        let item = first_outbox_item(&storage);
        assert_eq!(Some(TargetId::Cloud), item.origin_target);
        assert_eq!(vec![TargetId::Cloud], item.delivered_targets);
    }

    #[test]
    fn local_patch_is_applied_and_enqueued_for_other_targets() {
        let (storage, _root) = test_storage("local-inbound");
        setup_active_user_table(&storage, "base", "2026-07-23T10:00:00Z");
        let envelope = sample_update_envelope("local-new", "2026-07-23T11:00:00Z");

        apply_and_enqueue_inbound(&storage, Some(TargetId::Local), envelope)
            .expect("apply local inbound");

        assert_active_record(&storage, "local-new", "2026-07-23T11:00:00Z");
        let item = first_outbox_item(&storage);
        assert_eq!(Some(TargetId::Local), item.origin_target);
        assert_eq!(vec![TargetId::Local], item.delivered_targets);
    }

    fn first_outbox_item(storage: &StorageManager) -> crate::replication::types::OutboxItem {
        let connection = queue::open_queue(storage).expect("open queue");
        let items = queue::load_ready_envelopes(&connection, 10).expect("load ready envelopes");
        assert_eq!(1, items.len());
        items.into_iter().next().expect("first item")
    }

    fn sample_update_envelope(value: &str, updated_at: &str) -> PatchEnvelope {
        PatchEnvelope {
            sequence_id: 1,
            domain: crate::replication::types::StorageDomain::UserData,
            device_id: "remote-device".to_string(),
            created_at: 1,
            patch_bytes: update_patch(value, updated_at),
            media_files: Vec::new(),
        }
    }

    fn update_patch(value: &str, updated_at: &str) -> Vec<u8> {
        let source = base_connection();
        let mut session = Session::new(&source).expect("session");
        session.attach(Some("records")).expect("attach records");
        source
            .execute(
                "UPDATE records SET value = ?1, updated_at = ?2 WHERE id = 'a'",
                [value, updated_at],
            )
            .expect("source update");
        let mut patch = Vec::new();
        session
            .changeset_strm(&mut patch)
            .expect("changeset stream");
        patch
    }

    fn test_storage(label: &str) -> (StorageManager, PathBuf) {
        let root = std::env::temp_dir().join(format!(
            "vclinic-engine-{label}-{}-{}",
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

    fn setup_active_user_table(storage: &StorageManager, value: &str, updated_at: &str) {
        let active = storage.user_db.lock().expect("lock active db");
        setup_records_table(&active, value, updated_at);
    }

    fn base_connection() -> Connection {
        let connection = Connection::open_in_memory().expect("open memory db");
        setup_records_table(&connection, "base", "2026-07-23T10:00:00Z");
        connection
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

    fn assert_active_record(storage: &StorageManager, value: &str, updated_at: &str) {
        let active = storage.user_db.lock().expect("lock active db");
        let row = active
            .query_row(
                "SELECT value, updated_at FROM records WHERE id = 'a'",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .expect("load record");
        assert_eq!((value.to_string(), updated_at.to_string()), row);
    }
}
