//! Local mirror target adapter.

use crate::{
    replication::{
        targets::local_mirror,
        types::{PatchEnvelope, StorageDomain},
    },
    storage::StorageManager,
};

pub(super) fn is_enabled(storage: &StorageManager) -> Result<bool, String> {
    Ok(local_mirror::load_config(storage)?.enabled)
}

pub(super) fn push_envelope(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    local_mirror::receive_envelope(storage, envelope)
}

pub(super) fn pull_from_target(storage: &StorageManager) -> Result<Vec<PatchEnvelope>, String> {
    local_mirror::pull_envelopes(storage)
}

pub(super) fn ack_pulled_domain(
    storage: &StorageManager,
    domain: StorageDomain,
) -> Result<(), String> {
    local_mirror::ack_pulled_domain(storage, domain)
}
