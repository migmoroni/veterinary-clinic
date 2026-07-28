use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PackageExportType {
    Native,
    Csv,
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
    pub(crate) backup_target_path: Option<String>,
}
