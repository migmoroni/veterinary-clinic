//! Target path resolution for local backup.
//!
//! If the configured folder is unavailable, the local mirror writes to an
//! internal fallback staging path until the destination returns.

use crate::{
    replication::{
        outbox::queue,
        types::{LocalReceptorConfig, UserStorageDomain},
    },
    storage::{read_database_manifest, StorageManager},
};
use std::{
    fs,
    path::{Path, PathBuf},
};

const APP_BACKUP_LABEL: &str = "Veterinary Clinic";

#[derive(Debug)]
pub(crate) struct EffectiveTarget {
    pub path: PathBuf,
    pub using_fallback: bool,
    pub destination_available: bool,
}

pub(super) fn resolve_effective_target(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<EffectiveTarget, String> {
    if config.enabled
        && !config.target_path.as_os_str().is_empty()
        && fs::create_dir_all(&config.target_path).is_ok()
        && config.target_path.is_dir()
    {
        let path = resolve_configured_target_path(storage, &config.target_path)?;
        fs::create_dir_all(&path)
            .map_err(|error| format!("replication_target_create_failed:{error}"))?;
        return Ok(EffectiveTarget {
            path,
            using_fallback: false,
            destination_available: true,
        });
    }

    let fallback = queue::replication_dir(storage)?
        .join("fallback_staging")
        .join(backup_folder_label(storage)?);
    fs::create_dir_all(&fallback)
        .map_err(|error| format!("replication_fallback_create_failed:{error}"))?;
    Ok(EffectiveTarget {
        path: fallback,
        using_fallback: true,
        destination_available: false,
    })
}

pub(super) fn path_to_string_optional(path: &Path) -> Option<String> {
    if path.as_os_str().is_empty() {
        None
    } else {
        path.to_str().map(str::to_string)
    }
}

pub(super) fn general_target_path_for_config(config: &LocalReceptorConfig) -> Option<PathBuf> {
    if !config.enabled || config.target_path.as_os_str().is_empty() {
        return None;
    }
    if looks_like_mirror_root(&config.target_path) {
        return config
            .target_path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .map(Path::to_path_buf)
            .or_else(|| Some(config.target_path.clone()));
    }
    Some(config.target_path.clone())
}

fn resolve_configured_target_path(
    storage: &StorageManager,
    configured_path: &Path,
) -> Result<PathBuf, String> {
    if looks_like_mirror_root(configured_path) {
        return Ok(configured_path.to_path_buf());
    }

    Ok(configured_path.join(backup_folder_label(storage)?))
}

fn backup_folder_label(storage: &StorageManager) -> Result<String, String> {
    let logs = storage
        .user_logs_db
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    let manifest = read_database_manifest(&logs)?;
    Ok(format!("{APP_BACKUP_LABEL} - {}", manifest.database_id))
}

fn looks_like_mirror_root(path: &Path) -> bool {
    [
        UserStorageDomain::Main,
        UserStorageDomain::Media,
        UserStorageDomain::Logs,
    ]
    .into_iter()
    .any(|domain| path.join(domain.base_database_name()).is_file())
}
