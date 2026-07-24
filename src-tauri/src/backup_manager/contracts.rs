use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PackageExportType {
    Native,
    Csv,
    AutoSnapshot,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePackageRequest {
    pub(crate) destination_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportPackageRequest {
    pub(crate) source_path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageResponse {
    pub(crate) path: String,
    pub(crate) safety_backup_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupFileInfo {
    pub(crate) file_name: String,
    pub(crate) path: String,
    pub(crate) size_bytes: u64,
    pub(crate) modified_at: Option<String>,
}
