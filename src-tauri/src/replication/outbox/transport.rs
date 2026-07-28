//! Outbox dispatcher.
//!
//! This module asks the target coordinator to push queued envelopes. It does
//! not know whether a target is a local folder, NAS, or cloud API.

use super::{consolidator, queue};
use crate::{replication::targets, storage::StorageManager};

pub(crate) fn route_pending(storage: &StorageManager) -> Result<(), String> {
    let connection = queue::open_queue(storage)?;
    consolidator::consolidate_transport_queue(&connection)?;

    let pending = queue::load_ready_envelopes(&connection, 25)?;
    for item in pending {
        match targets::push_envelope(
            storage,
            &item.envelope,
            item.origin_target,
            &item.delivered_targets,
        ) {
            Ok(outcome) if outcome.enabled_targets.is_empty() => return Ok(()),
            Ok(outcome) => {
                let mut delivered_targets = item.delivered_targets.clone();
                for target_id in outcome.newly_pushed_targets {
                    queue::mark_target_delivered(&connection, &item.id, target_id)?;
                    if !delivered_targets.contains(&target_id) {
                        delivered_targets.push(target_id);
                    }
                }

                let complete = outcome
                    .enabled_targets
                    .iter()
                    .filter(|target_id| Some(**target_id) != item.origin_target)
                    .all(|target_id| delivered_targets.contains(target_id));
                if complete {
                    queue::delete_envelope(&connection, &item.id)?;
                    continue;
                }

                let error = if outcome.errors.is_empty() {
                    "replication_target_delivery_incomplete".to_string()
                } else {
                    outcome.errors.join(";")
                };
                queue::mark_attempt_failed(&connection, &item.id, &error)?;
            }
            Err(error) => queue::mark_attempt_failed(&connection, &item.id, &error)?,
        }
    }
    Ok(())
}
