use super::{
    contracts::{CreatePackageRequest, ImportPackageRequest, PackageResponse},
    exporter, importer,
};
use crate::storage::StorageManager;
use tauri::State;

#[tauri::command]
pub fn export_user_native_package(
    state: State<'_, StorageManager>,
    request: CreatePackageRequest,
) -> Result<PackageResponse, String> {
    exporter::export_native_package(state.inner(), &request.destination_path)
}

#[tauri::command]
pub fn export_user_csv_package(
    state: State<'_, StorageManager>,
    request: CreatePackageRequest,
) -> Result<PackageResponse, String> {
    exporter::export_csv_package(state.inner(), &request.destination_path)
}

#[tauri::command]
pub fn import_user_native_package(
    state: State<'_, StorageManager>,
    request: ImportPackageRequest,
) -> Result<PackageResponse, String> {
    importer::import_native_package(state.inner(), &request.source_path)
}

#[tauri::command]
pub fn import_user_csv_package(
    state: State<'_, StorageManager>,
    request: ImportPackageRequest,
) -> Result<PackageResponse, String> {
    importer::import_csv_package(state.inner(), &request.source_path)
}
