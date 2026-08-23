//! Cloud target adapter.
//!
//! The cloud server owns its own router/outbox. This adapter is only the future
//! client boundary: push local patches to the API, then pull patches that the
//! server has prepared for this device.

use crate::{
    replication::{
        targets::cloud_client,
        types::{PatchEnvelope, StorageDomain},
    },
    storage::StorageManager,
};

pub(super) fn is_enabled(storage: &StorageManager) -> Result<bool, String> {
    cloud_client::is_enabled(storage)
}

pub(super) fn push_envelope(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    cloud_client::push_envelope(storage, envelope)
}

pub(super) fn pull_from_target(storage: &StorageManager) -> Result<Vec<PatchEnvelope>, String> {
    cloud_client::pull_pending_from_server(storage)
}

pub(super) fn ack_pulled_domain(
    storage: &StorageManager,
    domain: StorageDomain,
) -> Result<(), String> {
    cloud_client::ack_pulled_domain(storage, domain)
}
