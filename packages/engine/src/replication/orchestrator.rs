//! Background loop and Tauri IPC for replication.
//!
//! This file deliberately stays thin: it starts the background timer, delegates
//! the actual sync work to `engine`, and exposes commands used by Settings/Backup
//! UI.

use crate::{
    replication::{
        engine,
        outbox::queue,
        targets::local_mirror,
        types::{BackupStatus, LocalReceptorConfig, PatchEnvelope, RestoreFromBackupRequest},
    },
    storage::StorageManager,
};
use std::{path::PathBuf, thread, time::Duration};
use tauri::{AppHandle, Emitter, State};

const PRODUCER_INTERVAL: Duration = Duration::from_secs(10);

pub(crate) struct PreImportBackupState {
    pub backup_target_path: Option<PathBuf>,
    pub final_sync_succeeded: bool,
}

pub fn start_background(storage: StorageManager, app: AppHandle) {
    tauri::async_runtime::spawn_blocking(move || loop {
        // Only notify the UI when the engine pulled external data into the app.
        if matches!(run_once(&storage), Ok(true)) {
            let _ = app.emit("db-updated", "all");
        }
        thread::sleep(PRODUCER_INTERVAL);
    });
}

pub(crate) fn run_once(storage: &StorageManager) -> Result<bool, String> {
    Ok(engine::run_once(storage)?.active_changed_from_targets)
}

pub(crate) fn prepare_for_database_import(
    storage: &StorageManager,
) -> Result<PreImportBackupState, String> {
    let config = local_mirror::load_config(storage)?;
    let backup_target_path = local_mirror::general_target_path_for_config(&config);
    if backup_target_path.is_none() {
        return Ok(PreImportBackupState {
            backup_target_path,
            final_sync_succeeded: false,
        });
    }

    let final_sync_succeeded = run_once(storage)
        .and_then(|_| {
            let status = local_mirror::status(storage)?;
            let queue_connection = queue::open_queue(storage)?;
            Ok(status.enabled
                && status.destination_available
                && !status.using_fallback
                && !queue::has_pending_delivery_for_target(
                    &queue_connection,
                    crate::replication::types::TargetId::Local,
                )?)
        })
        .unwrap_or(false);
    Ok(PreImportBackupState {
        backup_target_path,
        final_sync_succeeded,
    })
}

#[tauri::command]
pub async fn set_backup_target_path(
    app: AppHandle,
    state: State<'_, StorageManager>,
    path: String,
) -> Result<BackupStatus, String> {
    let storage = state.inner().clone();
    run_blocking(move || {
        let trimmed = path.trim();
        let config = LocalReceptorConfig {
            enabled: !trimmed.is_empty(),
            target_path: PathBuf::from(trimmed),
        };
        local_mirror::save_config(&storage, &config)?;
        let active_changed = if config.enabled {
            engine::initialize_local_target(&storage, &config)?.active_changed_from_targets
        } else {
            run_once(&storage)?
        };
        if active_changed {
            app.emit("db-updated", "all")
                .map_err(|error| format!("replication_run_emit_failed:{error}"))?;
        }
        local_mirror::status(&storage)
    })
    .await
}

#[tauri::command]
pub async fn get_backup_status(state: State<'_, StorageManager>) -> Result<BackupStatus, String> {
    let storage = state.inner().clone();
    run_blocking(move || {
        let queue_connection = queue::open_queue(&storage)?;
        let _ = queue::device_id(&queue_connection)?;
        local_mirror::status(&storage)
    })
    .await
}

#[tauri::command]
pub async fn restore_from_backup(
    app: AppHandle,
    state: State<'_, StorageManager>,
    backup_path: String,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_blocking(move || {
        engine::restore_from_backup(&storage, RestoreFromBackupRequest { backup_path })?;
        app.emit("db-updated", "all")
            .map_err(|error| format!("replication_restore_emit_failed:{error}"))?;
        Ok(())
    })
    .await
}

#[tauri::command]
pub async fn apply_inbound_patch(
    app: AppHandle,
    state: State<'_, StorageManager>,
    envelope: PatchEnvelope,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_blocking(move || engine::apply_inbound_envelope(&storage, &app, envelope)).await
}

async fn run_blocking<T, F>(operation: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| format!("replication_task_join_failed:{error}"))?
}
