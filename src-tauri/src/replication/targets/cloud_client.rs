//! Future cloud replication client.
//!
//! This module is intentionally a stub while there is no remote API contract.
//! Keep it API-bound: no direct file/database reconciliation belongs here.
//! The cloud server owns its own outbox/queue and only sends patches after this
//! client requests them.

use crate::{
    replication::types::{PatchEnvelope, StorageDomain},
    storage::StorageManager,
};

// Cloud backup is intentionally API-bound. Unlike the local mirror, it must
// not read or reconcile remote databases/files directly from disk.
pub(crate) fn is_enabled(_storage: &StorageManager) -> Result<bool, String> {
    Ok(false)
}

pub(crate) fn push_envelope(
    _storage: &StorageManager,
    _envelope: &PatchEnvelope,
) -> Result<(), String> {
    Err("cloud_client_not_configured".to_string())
}

pub(crate) fn pull_pending_from_server(
    _storage: &StorageManager,
) -> Result<Vec<PatchEnvelope>, String> {
    Ok(Vec::new())
}

pub(crate) fn ack_pulled_domain(
    _storage: &StorageManager,
    _domain: StorageDomain,
) -> Result<(), String> {
    Ok(())
}
