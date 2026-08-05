//! Target coordinator.
//!
//! Targets are external sync surfaces. A target can receive local patches
//! (`push`) and can provide inbound patches (`pull`). The engine decides what
//! to do with inbound patches; targets only move bytes across their boundary.

mod cloud;
pub(crate) mod cloud_client;
mod local;
pub(crate) mod local_mirror;

use crate::{
    replication::types::{PatchEnvelope, StorageDomain, TargetId},
    storage::StorageManager,
};

pub(crate) struct PushOutcome {
    pub enabled_targets: Vec<TargetId>,
    pub newly_pushed_targets: Vec<TargetId>,
    pub errors: Vec<String>,
}

pub(crate) struct PulledEnvelope {
    pub origin: TargetId,
    pub envelope: PatchEnvelope,
}

pub(crate) fn push_envelope(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
    origin_target: Option<TargetId>,
    already_delivered: &[TargetId],
) -> Result<PushOutcome, String> {
    let mut outcome = PushOutcome {
        enabled_targets: Vec::new(),
        newly_pushed_targets: Vec::new(),
        errors: Vec::new(),
    };

    if local::is_enabled(storage)? {
        push_to_target(
            TargetId::Local,
            origin_target,
            already_delivered,
            &mut outcome,
            || local::push_envelope(storage, envelope),
        );
    }
    if cloud::is_enabled(storage)? {
        push_to_target(
            TargetId::Cloud,
            origin_target,
            already_delivered,
            &mut outcome,
            || cloud::push_envelope(storage, envelope),
        );
    }

    Ok(outcome)
}

pub(crate) fn pull_from_configured_targets(
    storage: &StorageManager,
) -> Result<Vec<PulledEnvelope>, String> {
    let mut envelopes = Vec::new();
    envelopes.extend(
        local::pull_from_target(storage)?
            .into_iter()
            .map(|envelope| PulledEnvelope {
                origin: TargetId::Local,
                envelope,
            }),
    );
    envelopes.extend(
        cloud::pull_from_target(storage)?
            .into_iter()
            .map(|envelope| PulledEnvelope {
                origin: TargetId::Cloud,
                envelope,
            }),
    );
    Ok(envelopes)
}

pub(crate) fn ack_pulled(
    storage: &StorageManager,
    origin: TargetId,
    domain: StorageDomain,
) -> Result<(), String> {
    match origin {
        TargetId::Local => local::ack_pulled_domain(storage, domain),
        TargetId::Cloud => cloud::ack_pulled_domain(storage, domain),
    }
}

fn push_to_target<F>(
    target_id: TargetId,
    origin_target: Option<TargetId>,
    already_delivered: &[TargetId],
    outcome: &mut PushOutcome,
    operation: F,
) where
    F: FnOnce() -> Result<(), String>,
{
    outcome.enabled_targets.push(target_id);
    if origin_target == Some(target_id) || already_delivered.contains(&target_id) {
        return;
    }

    match operation() {
        Ok(()) => outcome.newly_pushed_targets.push(target_id),
        Err(error) => outcome
            .errors
            .push(format!("{}:{error}", target_id.as_str())),
    }
}
