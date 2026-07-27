use super::StorageDomain;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DbType {
    Operational,
    MediaIndex,
    SystemMediaIndex,
    Logs,
}

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StorageDatabase {
    User,
    System,
    UserMedia,
    SystemMedia,
    UserLogs,
    AppConfigFile,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlRequest {
    pub(crate) database: StorageDatabase,
    pub(crate) file_name: Option<String>,
    pub(crate) db_type: Option<DbType>,
    pub(crate) query: String,
    #[serde(default)]
    pub(crate) values: Vec<JsonValue>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlConnectionRequest {
    pub(crate) database: StorageDatabase,
    pub(crate) file_name: Option<String>,
    pub(crate) db_type: Option<DbType>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SqlExecuteResponse {
    pub(crate) rows_affected: usize,
    pub(crate) last_insert_id: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMediaRequest {
    pub(crate) source: StorageDomain,
    pub(crate) bytes: Vec<u8>,
    pub(crate) mime_type: Option<String>,
    pub(crate) thumbnail: Option<Vec<u8>>,
    pub(crate) width: Option<i64>,
    pub(crate) height: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMediaResponse {
    pub(crate) hash: Vec<u8>,
    pub(crate) hash_hex: String,
    pub(crate) path: String,
    pub(crate) mime_type: String,
    pub(crate) size_bytes: i64,
    pub(crate) width: Option<i64>,
    pub(crate) height: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GalleryItem {
    pub(crate) hash: Vec<u8>,
    pub(crate) hash_hex: String,
    pub(crate) thumbnail: Option<Vec<u8>>,
    pub(crate) width: Option<i64>,
    pub(crate) height: Option<i64>,
    pub(crate) mime_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GalleryRequest {
    pub(crate) source: StorageDomain,
    pub(crate) hashes: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaHashRequest {
    pub(crate) source: StorageDomain,
    pub(crate) hash: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusRequest {
    pub(crate) source: StorageDomain,
    pub(crate) hash: String,
    pub(crate) sync_status: String,
    pub(crate) uploaded_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardDeleteTrashRequest {
    pub(crate) kind: String,
    pub(crate) id: String,
    pub(crate) deleted_by: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletionAuditLogsRequest {
    pub(crate) limit: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletionAuditLog {
    pub(crate) id: String,
    pub(crate) domain: String,
    pub(crate) target_table: String,
    pub(crate) target_id: String,
    pub(crate) deleted_by: Option<String>,
    pub(crate) snapshot_json: Option<String>,
    pub(crate) created_at: String,
}
