//! Target path resolution for local backup.
//!
//! If the configured folder is unavailable, the local mirror writes to an
//! internal fallback staging path until the destination returns.

use crate::{
    replication::{outbox::queue, types::LocalReceptorConfig},
    storage::StorageManager,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(crate) struct EffectiveTarget {
    pub path: PathBuf,
    pub using_fallback: bool,
    pub destination_available: bool,
}

pub(super) fn resolve_effective_target(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<EffectiveTarget, String> {
    if config.enabled && !config.target_path.as_os_str().is_empty() {
        if fs::create_dir_all(&config.target_path).is_ok() && config.target_path.is_dir() {
            return Ok(EffectiveTarget {
                path: config.target_path.clone(),
                using_fallback: false,
                destination_available: true,
            });
        }
    }

    let fallback = queue::replication_dir(storage)?.join("fallback_staging");
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
