//! Local mirror configuration persisted under app replication data.

use crate::{
    replication::{outbox::queue, types::LocalReceptorConfig},
    storage::StorageManager,
};
use std::{fs, path::PathBuf};

const CONFIG_FILE: &str = "local_mirror.json";

pub(crate) fn load_config(storage: &StorageManager) -> Result<LocalReceptorConfig, String> {
    let path = config_path(storage)?;
    if !path.is_file() {
        return Ok(LocalReceptorConfig {
            enabled: false,
            target_path: PathBuf::new(),
        });
    }

    let bytes =
        fs::read(path).map_err(|error| format!("replication_config_read_failed:{error}"))?;
    serde_json::from_slice(&bytes)
        .map_err(|error| format!("replication_config_parse_failed:{error}"))
}

pub(crate) fn save_config(
    storage: &StorageManager,
    config: &LocalReceptorConfig,
) -> Result<(), String> {
    let path = config_path(storage)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_config_dir_failed:{error}"))?;
    }
    let bytes = serde_json::to_vec_pretty(config)
        .map_err(|error| format!("replication_config_serialize_failed:{error}"))?;
    fs::write(path, bytes).map_err(|error| format!("replication_config_write_failed:{error}"))
}

fn config_path(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(queue::replication_dir(storage)?.join(CONFIG_FILE))
}
