//! Transport rollup.
//!
//! Rollups combine queued changesets for cheaper transport after offline
//! periods. They are transport artifacts only; active/base databases are never
//! mutated by this module.

use super::queue;
use crate::replication::types::{CasMediaPayload, EnvelopeStage, OutboxItem, PatchEnvelope};
use rusqlite::session::Changegroup;
use std::{collections::BTreeMap, io::Cursor};

pub(crate) fn consolidate_transport_queue(connection: &rusqlite::Connection) -> Result<(), String> {
    consolidate_stage(connection, EnvelopeStage::Micro)?;
    consolidate_stage(connection, EnvelopeStage::C1)?;
    consolidate_stage(connection, EnvelopeStage::C2)
}

fn consolidate_stage(
    connection: &rusqlite::Connection,
    stage: EnvelopeStage,
) -> Result<(), String> {
    while let Some(items) = queue::rollup_candidates(connection, stage)? {
        if items.is_empty() {
            break;
        }
        let next_stage = stage
            .next()
            .ok_or_else(|| "replication_rollup_stage_invalid".to_string())?;
        debug_assert!(items.iter().all(|item| item.stage == stage));
        let envelope = rollup_envelopes(&items)?;
        let source_ids = items.iter().map(|item| item.id.clone()).collect::<Vec<_>>();
        queue::replace_with_rollup(connection, &source_ids, next_stage, &envelope)?;
    }
    Ok(())
}

fn rollup_envelopes(items: &[OutboxItem]) -> Result<PatchEnvelope, String> {
    let first = items
        .first()
        .ok_or_else(|| "replication_rollup_empty".to_string())?;
    let patch_bytes = group_patch_bytes(items)?;
    Ok(PatchEnvelope {
        sequence_id: first.envelope.sequence_id,
        domain: first.envelope.domain,
        device_id: first.envelope.device_id.clone(),
        created_at: queue::now_unix(),
        patch_bytes,
        media_files: dedupe_media_files(items),
    })
}

fn group_patch_bytes(items: &[OutboxItem]) -> Result<Vec<u8>, String> {
    let mut group = Changegroup::new()
        .map_err(|error| format!("replication_changegroup_new_failed:{error}"))?;
    for item in items {
        let mut input = Cursor::new(item.envelope.patch_bytes.as_slice());
        group
            .add_stream(&mut input)
            .map_err(|error| format!("replication_changegroup_add_failed:{error}"))?;
    }
    let mut output = Vec::new();
    group
        .output_strm(&mut output)
        .map_err(|error| format!("replication_changegroup_output_failed:{error}"))?;
    Ok(output)
}

fn dedupe_media_files(items: &[OutboxItem]) -> Vec<CasMediaPayload> {
    let mut media = BTreeMap::new();
    for item in items {
        for file in &item.envelope.media_files {
            media
                .entry(file.hash_hex.clone())
                .or_insert_with(|| file.clone());
        }
    }
    media.into_values().collect()
}
