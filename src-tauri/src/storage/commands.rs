use super::{
    GalleryItem, GalleryRequest, MediaHashRequest, SaveMediaRequest, SaveMediaResponse,
    SqlConnectionRequest, SqlExecuteResponse, SqlRequest, StorageManager, SyncStatusRequest,
};
use serde_json::Value as JsonValue;
use tauri::State;

#[tauri::command]
pub fn storage_select(
    state: State<'_, StorageManager>,
    request: SqlRequest,
) -> Result<Vec<JsonValue>, String> {
    state.select(request)
}

#[tauri::command]
pub fn storage_execute(
    state: State<'_, StorageManager>,
    request: SqlRequest,
) -> Result<SqlExecuteResponse, String> {
    state.execute(request)
}

#[tauri::command]
pub fn storage_close(
    state: State<'_, StorageManager>,
    request: SqlConnectionRequest,
) -> Result<(), String> {
    state.close_connection(request)
}

#[tauri::command]
pub fn storage_reopen(
    state: State<'_, StorageManager>,
    request: SqlConnectionRequest,
) -> Result<(), String> {
    state.reopen_connection(request)
}

#[tauri::command]
pub fn save_media(
    state: State<'_, StorageManager>,
    request: SaveMediaRequest,
) -> Result<SaveMediaResponse, String> {
    state.save_media(request)
}

#[tauri::command]
pub fn get_gallery_items(
    state: State<'_, StorageManager>,
    request: GalleryRequest,
) -> Result<Vec<GalleryItem>, String> {
    state.get_gallery_items(request)
}

#[tauri::command]
pub fn get_media_path(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<String, String> {
    state.get_media_path(request)
}

#[tauri::command]
pub fn get_media_data(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<Option<Vec<u8>>, String> {
    state.get_media_data(request)
}

#[tauri::command]
pub fn update_media_sync_status(
    state: State<'_, StorageManager>,
    request: SyncStatusRequest,
) -> Result<(), String> {
    state.update_sync_status(request)
}

#[tauri::command]
pub fn mark_as_removed(
    state: State<'_, StorageManager>,
    request: MediaHashRequest,
) -> Result<(), String> {
    state.mark_as_removed(request)
}
