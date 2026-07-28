//! Tauri command boundary for storage operations.
//!
//! rusqlite is synchronous, so every command clones the `StorageManager` and
//! runs the blocking work on Tauri's background pool.

use super::{
    DeletionAuditLog, DeletionAuditLogsRequest, GalleryItem, GalleryRequest,
    HardDeleteTrashRequest, MediaHashRequest, SaveMediaRequest, SaveMediaResponse,
    SqlConnectionRequest, SqlExecuteResponse, SqlRequest, StorageManager, SyncStatusRequest,
};
use serde_json::Value as JsonValue;
use tauri::State;

async fn run_storage_blocking<T, F>(operation: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(operation)
        .await
        .map_err(|error| format!("storage_task_join_failed:{error}"))?
}

#[tauri::command]
pub async fn storage_select(
    state: State<'_, StorageManager>,
    request: SqlRequest,
) -> Result<Vec<JsonValue>, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.select(request)).await
}

#[tauri::command]
pub async fn storage_execute(
    state: State<'_, StorageManager>,
    request: SqlRequest,
) -> Result<SqlExecuteResponse, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.execute(request)).await
}

#[tauri::command]
pub async fn storage_close(
    state: State<'_, StorageManager>,
    request: SqlConnectionRequest,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.close_connection(request)).await
}

#[tauri::command]
pub async fn storage_reopen(
    state: State<'_, StorageManager>,
    request: SqlConnectionRequest,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.reopen_connection(request)).await
}

#[tauri::command]
pub async fn save_media(
    state: State<'_, StorageManager>,
    request: SaveMediaRequest,
) -> Result<SaveMediaResponse, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.save_media(request)).await
}

#[tauri::command]
pub async fn get_gallery_items(
    state: State<'_, StorageManager>,
    request: GalleryRequest,
) -> Result<Vec<GalleryItem>, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.get_gallery_items(request)).await
}

#[tauri::command]
pub async fn get_media_path(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<String, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.get_media_path(request)).await
}

#[tauri::command]
pub async fn get_media_data(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<Option<Vec<u8>>, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.get_media_data(request)).await
}

#[tauri::command]
pub async fn update_media_sync_status(
    state: State<'_, StorageManager>,
    request: SyncStatusRequest,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.update_sync_status(request)).await
}

#[tauri::command]
pub async fn mark_as_removed(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.mark_as_removed(request)).await
}

#[tauri::command]
pub async fn hard_delete_trash_item(
    state: State<'_, StorageManager>,
    request: HardDeleteTrashRequest,
) -> Result<(), String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.hard_delete_trash_item(request)).await
}

#[tauri::command]
pub async fn get_deletion_audit_logs(
    state: State<'_, StorageManager>,
    request: DeletionAuditLogsRequest,
) -> Result<Vec<DeletionAuditLog>, String> {
    let storage = state.inner().clone();
    run_storage_blocking(move || storage.deletion_audit_logs(request)).await
}
