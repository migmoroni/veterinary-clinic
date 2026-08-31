//! Local mirror baselines.
//!
//! The app capture has its own baselines. The local mirror needs a second set
//! so it can detect changes written by another machine into the selected
//! folder/NAS without doing permanent row-by-row reconciliation.

use crate::{
    replication::{applier, capture, outbox::queue, types::UserStorageDomain},
    storage::StorageManager,
};
use std::{
    fs,
    path::{Path, PathBuf},
};

pub(super) fn path_for(
    storage: &StorageManager,
    domain: UserStorageDomain,
) -> Result<PathBuf, String> {
    Ok(queue::replication_dir(storage)?
        .join("baseline")
        .join("local_mirror")
        .join(domain.base_database_name()))
}

pub(super) fn reset_domain(
    storage: &StorageManager,
    target_path: &Path,
    domain: UserStorageDomain,
) -> Result<(), String> {
    let connection =
        applier::open_domain_database(&target_path.join(domain.base_database_name()), domain)?;
    capture::snapshot_connection(&connection, &path_for(storage, domain)?)
}

pub(super) fn reset_all(storage: &StorageManager, target_path: &Path) -> Result<(), String> {
    for domain in [
        UserStorageDomain::Main,
        UserStorageDomain::Media,
        UserStorageDomain::Logs,
    ] {
        reset_domain(storage, target_path, domain)?;
    }
    Ok(())
}

pub(super) fn ensure_exists(
    storage: &StorageManager,
    target_path: &Path,
    domain: UserStorageDomain,
) -> Result<bool, String> {
    let baseline_path = path_for(storage, domain)?;
    if baseline_path.is_file() {
        return Ok(true);
    }
    if let Some(parent) = baseline_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_local_baseline_dir_failed:{error}"))?;
    }
    reset_domain(storage, target_path, domain)?;
    Ok(false)
}
