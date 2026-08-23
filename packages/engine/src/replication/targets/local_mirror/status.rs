//! Status projection for the Backup settings UI.

use super::{config, target};
use crate::{
    replication::{outbox::queue, types::BackupStatus},
    storage::StorageManager,
};

pub(crate) fn status(storage: &StorageManager) -> Result<BackupStatus, String> {
    let config = config::load_config(storage)?;
    let target = if config.enabled {
        Some(target::resolve_effective_target(storage, &config)?)
    } else {
        None
    };
    let queue_connection = queue::open_queue(storage)?;
    let counts = queue::pending_counts(&queue_connection)?;
    Ok(BackupStatus {
        enabled: config.enabled,
        target_path: target::path_to_string_optional(&config.target_path),
        effective_path: target
            .as_ref()
            .and_then(|target| target::path_to_string_optional(&target.path)),
        using_fallback: target
            .as_ref()
            .map(|target| target.using_fallback)
            .unwrap_or(false),
        destination_available: target
            .as_ref()
            .map(|target| target.destination_available)
            .unwrap_or(false),
        pending_micro: counts.micro,
        pending_c1: counts.c1,
        pending_c2: counts.c2,
        pending_c3: counts.c3,
        pending_total: counts.total(),
        last_error: queue::oldest_error(&queue_connection)?,
    })
}
