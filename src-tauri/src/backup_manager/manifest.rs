use super::{
    contracts::PackageExportType, time::now_iso, APP_VERSION, CURRENT_SCHEMA_VERSION, MANIFEST_FILE,
};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct PackageManifest {
    app_version: String,
    schema_version: i64,
    created_at: String,
    export_type: PackageExportType,
    domain: String,
}

pub(crate) fn new_manifest(export_type: PackageExportType, schema_version: i64) -> PackageManifest {
    PackageManifest {
        app_version: APP_VERSION.to_string(),
        schema_version,
        created_at: now_iso(),
        export_type,
        domain: "user".to_string(),
    }
}

pub(crate) fn write_manifest(staging_path: &Path, manifest: PackageManifest) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&manifest)
        .map_err(|error| format!("manifest_serialize_failed:{error}"))?;
    fs::write(staging_path.join(MANIFEST_FILE), format!("{json}\n"))
        .map_err(|error| format!("manifest_write_failed:{error}"))
}

pub(crate) fn read_manifest(staging_path: &Path) -> Result<PackageManifest, String> {
    let bytes = fs::read(staging_path.join(MANIFEST_FILE))
        .map_err(|error| format!("manifest_read_failed:{error}"))?;
    serde_json::from_slice(&bytes).map_err(|error| format!("manifest_parse_failed:{error}"))
}

pub(crate) fn validate_manifest(
    manifest: &PackageManifest,
    expected_type: PackageExportType,
) -> Result<(), String> {
    if manifest.domain != "user" {
        return Err("package_domain_invalid".to_string());
    }
    if manifest.export_type != expected_type {
        return Err("package_export_type_invalid".to_string());
    }
    if manifest.schema_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "package_schema_from_future:{}",
            manifest.schema_version
        ));
    }
    Ok(())
}
