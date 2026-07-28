//! Durable outbound replication outbox.
//!
//! Patches are stored locally before delivery so network/NAS failures do not
//! lose changes. Delivery is tracked per target, which lets one target fail
//! without forcing already-confirmed targets to receive the same patch again.

use crate::{
    replication::types::{
        CasMediaPayload, EnvelopeStage, OutboxItem, PatchEnvelope, StorageDomain, TargetId,
    },
    storage::{sha256, StorageManager},
};
use rusqlite::{
    params, types::Type, Connection, OptionalExtension, Transaction, TransactionBehavior,
};
use std::{
    fs, io,
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const OUTBOX_DB_NAME: &str = "outbox.db";

pub(crate) struct QueueCounts {
    pub micro: u64,
    pub c1: u64,
    pub c2: u64,
    pub c3: u64,
}

impl QueueCounts {
    pub(crate) fn total(&self) -> u64 {
        self.micro + self.c1 + self.c2 + self.c3
    }
}

pub(crate) fn open_queue(storage: &StorageManager) -> Result<Connection, String> {
    let path = queue_path(storage)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("replication_dir_create_failed:{error}"))?;
    }

    let connection = Connection::open(path)
        .map_err(|error| format!("replication_outbox_open_failed:{error}"))?;
    connection
        .busy_timeout(Duration::from_secs(5))
        .map_err(|error| format!("replication_outbox_busy_timeout_failed:{error}"))?;
    connection.set_prepared_statement_cache_capacity(64);
    initialize_queue_schema(&connection)?;
    Ok(connection)
}

fn initialize_queue_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            r#"
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            PRAGMA foreign_keys = ON;
            PRAGMA cache_size = -2000;

            CREATE TABLE IF NOT EXISTS queue_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS outbound_queue (
                id TEXT PRIMARY KEY,
                sequence_id INTEGER NOT NULL,
                domain TEXT NOT NULL,
                stage TEXT NOT NULL CHECK(stage IN ('micro', 'c1', 'c2', 'c3')),
                device_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                patch_bytes BLOB NOT NULL,
                media_files_json TEXT NOT NULL DEFAULT '[]',
                origin_target TEXT,
                delivered_targets_json TEXT NOT NULL DEFAULT '[]',
                attempts INTEGER NOT NULL DEFAULT 0,
                next_attempt_at INTEGER NOT NULL DEFAULT 0,
                last_error TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_outbound_queue_pending
                ON outbound_queue(stage, domain, sequence_id);

            CREATE TABLE IF NOT EXISTS known_media_files (
                hash_hex TEXT PRIMARY KEY,
                queued_at INTEGER NOT NULL
            );
            "#,
        )
        .map_err(|error| format!("replication_outbox_schema_failed:{error}"))?;
    ensure_queue_column(&connection, "origin_target", "TEXT")?;
    ensure_queue_column(
        &connection,
        "delivered_targets_json",
        "TEXT NOT NULL DEFAULT '[]'",
    )?;
    Ok(())
}

pub(crate) fn queue_path(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(replication_dir(storage)?.join(OUTBOX_DB_NAME))
}

pub(crate) fn replication_dir(storage: &StorageManager) -> Result<PathBuf, String> {
    Ok(storage.app_data_dir()?.join("replication"))
}

pub(crate) fn now_unix() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| i64::try_from(duration.as_secs()).unwrap_or(i64::MAX))
        .unwrap_or_default()
}

pub(crate) fn new_id(prefix: &str) -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let source = format!("{prefix}:{now}:{}", std::process::id());
    crate::storage::bytes_to_hex(&sha256(source.as_bytes()))
}

pub(crate) fn device_id(connection: &Connection) -> Result<String, String> {
    if let Some(existing) = meta_get(connection, "device_id")? {
        return Ok(existing);
    }

    let id = new_id("device");
    meta_set(connection, "device_id", &id)?;
    Ok(id)
}

pub(crate) fn next_sequence_id(connection: &Connection) -> Result<u64, String> {
    let current = meta_get(connection, "next_sequence_id")?
        .and_then(|value| value.parse::<u64>().ok())
        .unwrap_or(1);
    let next = current.saturating_add(1);
    meta_set(connection, "next_sequence_id", &next.to_string())?;
    Ok(current)
}

pub(crate) fn enqueue_envelope(
    connection: &Connection,
    envelope: &PatchEnvelope,
    stage: EnvelopeStage,
    origin_target: Option<TargetId>,
    delivered_targets: &[TargetId],
) -> Result<String, String> {
    let id = new_id("patch");
    let media_files_json = serde_json::to_string(&envelope.media_files)
        .map_err(|error| format!("replication_media_json_failed:{error}"))?;
    let delivered_targets_json = serialize_targets(delivered_targets)?;
    connection
        .execute(
            r#"
            INSERT INTO outbound_queue (
                id, sequence_id, domain, stage, device_id, created_at, patch_bytes,
                media_files_json, origin_target, delivered_targets_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                id,
                i64::try_from(envelope.sequence_id).unwrap_or(i64::MAX),
                envelope.domain.as_str(),
                stage.as_str(),
                envelope.device_id,
                envelope.created_at,
                envelope.patch_bytes,
                media_files_json,
                origin_target.map(TargetId::as_str),
                delivered_targets_json
            ],
        )
        .map_err(|error| format!("replication_outbox_insert_failed:{error}"))?;
    Ok(id)
}

pub(crate) fn remember_media_files(
    connection: &Connection,
    media_files: &[CasMediaPayload],
) -> Result<(), String> {
    let queued_at = now_unix();
    for media in media_files {
        connection
            .execute(
                "INSERT OR IGNORE INTO known_media_files (hash_hex, queued_at) VALUES (?1, ?2)",
                params![media.hash_hex, queued_at],
            )
            .map_err(|error| format!("replication_known_media_insert_failed:{error}"))?;
    }
    Ok(())
}

pub(crate) fn remember_media_hashes(
    connection: &Connection,
    hash_hexes: &[String],
) -> Result<(), String> {
    let queued_at = now_unix();
    for hash_hex in hash_hexes {
        connection
            .execute(
                "INSERT OR IGNORE INTO known_media_files (hash_hex, queued_at) VALUES (?1, ?2)",
                params![hash_hex, queued_at],
            )
            .map_err(|error| format!("replication_known_media_insert_failed:{error}"))?;
    }
    Ok(())
}

pub(crate) fn is_media_known(connection: &Connection, hash_hex: &str) -> Result<bool, String> {
    let found = connection
        .query_row(
            "SELECT 1 FROM known_media_files WHERE hash_hex = ?1",
            params![hash_hex],
            |_| Ok(()),
        )
        .optional()
        .map_err(|error| format!("replication_known_media_select_failed:{error}"))?;
    Ok(found.is_some())
}

pub(crate) fn pending_counts(connection: &Connection) -> Result<QueueCounts, String> {
    Ok(QueueCounts {
        micro: count_stage(connection, EnvelopeStage::Micro)?,
        c1: count_stage(connection, EnvelopeStage::C1)?,
        c2: count_stage(connection, EnvelopeStage::C2)?,
        c3: count_stage(connection, EnvelopeStage::C3)?,
    })
}

pub(crate) fn has_pending_delivery_for_target(
    connection: &Connection,
    target_id: TargetId,
) -> Result<bool, String> {
    let mut statement = connection
        .prepare_cached("SELECT origin_target, delivered_targets_json FROM outbound_queue")
        .map_err(|error| format!("replication_outbox_target_pending_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| format!("replication_outbox_target_pending_select_failed:{error}"))?;

    for row in rows {
        let (origin_target_text, delivered_targets_json) =
            row.map_err(|error| format!("replication_outbox_target_pending_row_failed:{error}"))?;
        let origin_target = origin_target_text
            .as_deref()
            .map(TargetId::try_from)
            .transpose()?;
        if origin_target == Some(target_id) {
            continue;
        }
        let delivered_targets = deserialize_targets(&delivered_targets_json)?;
        if !delivered_targets.contains(&target_id) {
            return Ok(true);
        }
    }
    Ok(false)
}

pub(crate) fn load_ready_envelopes(
    connection: &Connection,
    limit: usize,
) -> Result<Vec<OutboxItem>, String> {
    let now = now_unix();
    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT id, sequence_id, domain, stage, device_id, created_at, patch_bytes,
                   media_files_json, origin_target, delivered_targets_json
            FROM outbound_queue
            WHERE next_attempt_at <= ?1
            ORDER BY sequence_id, id
            LIMIT ?2
            "#,
        )
        .map_err(|error| format!("replication_outbox_select_prepare_failed:{error}"))?;
    let rows = statement
        .query_map(
            params![now, i64::try_from(limit).unwrap_or(i64::MAX)],
            row_to_envelope,
        )
        .map_err(|error| format!("replication_outbox_select_failed:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_outbox_row_failed:{error}"))
}

pub(crate) fn delete_envelope(connection: &Connection, id: &str) -> Result<(), String> {
    connection
        .execute("DELETE FROM outbound_queue WHERE id = ?1", params![id])
        .map_err(|error| format!("replication_outbox_delete_failed:{error}"))?;
    Ok(())
}

pub(crate) fn mark_target_delivered(
    connection: &Connection,
    id: &str,
    target_id: TargetId,
) -> Result<(), String> {
    let delivered_json = connection
        .query_row(
            "SELECT delivered_targets_json FROM outbound_queue WHERE id = ?1",
            params![id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("replication_outbox_delivery_select_failed:{error}"))?
        .unwrap_or_else(|| "[]".to_string());
    let mut delivered = deserialize_targets(&delivered_json)?;
    if !delivered.contains(&target_id) {
        delivered.push(target_id);
    }
    let delivered_json = serialize_targets(&delivered)?;
    connection
        .execute(
            "UPDATE outbound_queue SET delivered_targets_json = ?2 WHERE id = ?1",
            params![id, delivered_json],
        )
        .map_err(|error| format!("replication_outbox_delivery_update_failed:{error}"))?;
    Ok(())
}

pub(crate) fn mark_attempt_failed(
    connection: &Connection,
    id: &str,
    error: &str,
) -> Result<(), String> {
    let attempts = connection
        .query_row(
            "SELECT attempts FROM outbound_queue WHERE id = ?1",
            params![id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(|error| format!("replication_outbox_attempt_select_failed:{error}"))?
        .unwrap_or_default()
        .saturating_add(1);
    let backoff_seconds = 2_i64
        .saturating_pow(u32::try_from(attempts.min(8)).unwrap_or(8))
        .min(900);
    let next_attempt_at = now_unix().saturating_add(backoff_seconds);
    connection
        .execute(
            r#"
            UPDATE outbound_queue
            SET attempts = ?2, next_attempt_at = ?3, last_error = ?4
            WHERE id = ?1
            "#,
            params![id, attempts, next_attempt_at, error],
        )
        .map_err(|error| format!("replication_outbox_attempt_update_failed:{error}"))?;
    Ok(())
}

pub(crate) fn oldest_error(connection: &Connection) -> Result<Option<String>, String> {
    connection
        .query_row(
            "SELECT last_error FROM outbound_queue WHERE last_error IS NOT NULL ORDER BY sequence_id LIMIT 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("replication_outbox_error_select_failed:{error}"))
}

pub(crate) fn rollup_candidates(
    connection: &Connection,
    stage: EnvelopeStage,
) -> Result<Option<Vec<OutboxItem>>, String> {
    let threshold = stage.rollup_threshold();
    if threshold == usize::MAX {
        return Ok(None);
    }

    let domain = connection
        .query_row(
            r#"
            SELECT domain
            FROM outbound_queue
            WHERE stage = ?1
              AND delivered_targets_json = '[]'
              AND origin_target IS NULL
            GROUP BY domain
            HAVING COUNT(*) >= ?2
            ORDER BY MIN(sequence_id)
            LIMIT 1
            "#,
            params![stage.as_str(), i64::try_from(threshold).unwrap_or(i64::MAX)],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("replication_rollup_domain_failed:{error}"))?;
    let Some(domain) = domain else {
        return Ok(None);
    };

    let mut statement = connection
        .prepare_cached(
            r#"
            SELECT id, sequence_id, domain, stage, device_id, created_at, patch_bytes,
                   media_files_json, origin_target, delivered_targets_json
            FROM outbound_queue
            WHERE stage = ?1
              AND domain = ?2
              AND delivered_targets_json = '[]'
              AND origin_target IS NULL
            ORDER BY sequence_id, id
            LIMIT ?3
            "#,
        )
        .map_err(|error| format!("replication_rollup_select_prepare_failed:{error}"))?;
    let rows = statement
        .query_map(
            params![
                stage.as_str(),
                domain,
                i64::try_from(threshold).unwrap_or(i64::MAX)
            ],
            row_to_envelope,
        )
        .map_err(|error| format!("replication_rollup_select_failed:{error}"))?;
    let items = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("replication_rollup_row_failed:{error}"))?;
    Ok(Some(items))
}

pub(crate) fn replace_with_rollup(
    connection: &Connection,
    source_ids: &[String],
    stage: EnvelopeStage,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    let id = new_id("rollup");
    let media_files_json = serde_json::to_string(&envelope.media_files)
        .map_err(|error| format!("replication_rollup_media_json_failed:{error}"))?;
    let transaction = Transaction::new_unchecked(connection, TransactionBehavior::Immediate)
        .map_err(|error| format!("replication_rollup_begin_failed:{error}"))?;

    transaction
        .execute(
            r#"
            INSERT INTO outbound_queue (
                id, sequence_id, domain, stage, device_id, created_at, patch_bytes,
                media_files_json, origin_target, delivered_targets_json
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, '[]')
            "#,
            params![
                id,
                i64::try_from(envelope.sequence_id).unwrap_or(i64::MAX),
                envelope.domain.as_str(),
                stage.as_str(),
                envelope.device_id,
                envelope.created_at,
                envelope.patch_bytes,
                media_files_json
            ],
        )
        .map_err(|error| format!("replication_rollup_insert_failed:{error}"))?;
    for source_id in source_ids {
        transaction
            .execute(
                "DELETE FROM outbound_queue WHERE id = ?1",
                params![source_id],
            )
            .map_err(|error| format!("replication_rollup_delete_source_failed:{error}"))?;
    }
    transaction
        .commit()
        .map_err(|error| format!("replication_rollup_commit_failed:{error}"))
}

fn count_stage(connection: &Connection, stage: EnvelopeStage) -> Result<u64, String> {
    let count = connection
        .query_row(
            "SELECT COUNT(*) FROM outbound_queue WHERE stage = ?1",
            params![stage.as_str()],
            |row| row.get::<_, i64>(0),
        )
        .map_err(|error| format!("replication_outbox_count_failed:{error}"))?;
    Ok(u64::try_from(count).unwrap_or_default())
}

fn meta_get(connection: &Connection, key: &str) -> Result<Option<String>, String> {
    connection
        .query_row(
            "SELECT value FROM queue_meta WHERE key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("replication_meta_select_failed:{error}"))
}

fn meta_set(connection: &Connection, key: &str, value: &str) -> Result<(), String> {
    connection
        .execute(
            r#"
            INSERT INTO queue_meta (key, value) VALUES (?1, ?2)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            "#,
            params![key, value],
        )
        .map_err(|error| format!("replication_meta_update_failed:{error}"))?;
    Ok(())
}

fn ensure_queue_column(
    connection: &Connection,
    column_name: &str,
    column_definition: &str,
) -> Result<(), String> {
    let mut statement = connection
        .prepare_cached("PRAGMA table_info(outbound_queue)")
        .map_err(|error| format!("replication_outbox_column_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("replication_outbox_column_select_failed:{error}"))?;
    for row in rows {
        if row.map_err(|error| format!("replication_outbox_column_row_failed:{error}"))?
            == column_name
        {
            return Ok(());
        }
    }
    let sql = format!("ALTER TABLE outbound_queue ADD COLUMN {column_name} {column_definition}");
    connection
        .execute_batch(&sql)
        .map_err(|error| format!("replication_outbox_column_add_failed:{error}"))?;
    Ok(())
}

fn row_to_envelope(row: &rusqlite::Row<'_>) -> rusqlite::Result<OutboxItem> {
    let id: String = row.get(0)?;
    let sequence_id: i64 = row.get(1)?;
    let domain_text: String = row.get(2)?;
    let stage_text: String = row.get(3)?;
    let device_id: String = row.get(4)?;
    let created_at: i64 = row.get(5)?;
    let patch_bytes: Vec<u8> = row.get(6)?;
    let media_files_json: String = row.get(7)?;
    let origin_target_text: Option<String> = row.get(8)?;
    let delivered_targets_json: String = row.get(9)?;
    let media_files =
        serde_json::from_str::<Vec<CasMediaPayload>>(&media_files_json).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(7, Type::Text, Box::new(error))
        })?;
    let origin_target = origin_target_text
        .as_deref()
        .map(TargetId::try_from)
        .transpose()
        .map_err(|error| domain_row_error(8, error))?;
    let delivered_targets =
        deserialize_targets(&delivered_targets_json).map_err(|error| domain_row_error(9, error))?;
    let domain = StorageDomain::try_from(domain_text.as_str())
        .map_err(|error| domain_row_error(2, error))?;
    let stage =
        EnvelopeStage::try_from(stage_text.as_str()).map_err(|error| domain_row_error(3, error))?;
    Ok(OutboxItem {
        id,
        stage,
        origin_target,
        delivered_targets,
        envelope: PatchEnvelope {
            sequence_id: u64::try_from(sequence_id).unwrap_or_default(),
            domain,
            device_id,
            created_at,
            patch_bytes,
            media_files,
        },
    })
}

fn serialize_targets(targets: &[TargetId]) -> Result<String, String> {
    let values = targets
        .iter()
        .map(|target| target.as_str())
        .collect::<Vec<_>>();
    serde_json::to_string(&values)
        .map_err(|error| format!("replication_target_json_serialize_failed:{error}"))
}

fn deserialize_targets(value: &str) -> Result<Vec<TargetId>, String> {
    let values = serde_json::from_str::<Vec<String>>(value)
        .map_err(|error| format!("replication_target_json_failed:{error}"))?;
    values
        .iter()
        .map(|target| TargetId::try_from(target.as_str()))
        .collect()
}

fn domain_row_error(index: usize, error: String) -> rusqlite::Error {
    rusqlite::Error::FromSqlConversionFailure(
        index,
        Type::Text,
        Box::new(io::Error::new(io::ErrorKind::InvalidData, error)),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn partial_delivery_is_preserved_for_next_attempt() {
        let connection = memory_queue();
        let envelope = sample_envelope(1);

        let id = enqueue_envelope(
            &connection,
            &envelope,
            EnvelopeStage::Micro,
            None,
            &[TargetId::Local],
        )
        .expect("enqueue");

        let items = load_ready_envelopes(&connection, 10).expect("load ready");
        assert_eq!(1, items.len());
        assert_eq!(vec![TargetId::Local], items[0].delivered_targets);

        mark_target_delivered(&connection, &id, TargetId::Cloud).expect("mark cloud delivered");

        let items = load_ready_envelopes(&connection, 10).expect("reload ready");
        assert_eq!(
            vec![TargetId::Local, TargetId::Cloud],
            items[0].delivered_targets
        );
    }

    #[test]
    fn pending_delivery_for_target_ignores_already_delivered_or_origin_target() {
        let connection = memory_queue();
        enqueue_envelope(
            &connection,
            &sample_envelope(1),
            EnvelopeStage::Micro,
            None,
            &[TargetId::Local],
        )
        .expect("enqueue delivered local");
        enqueue_envelope(
            &connection,
            &sample_envelope(2),
            EnvelopeStage::Micro,
            Some(TargetId::Local),
            &[],
        )
        .expect("enqueue local origin");

        assert!(
            !has_pending_delivery_for_target(&connection, TargetId::Local)
                .expect("check local pending")
        );
        assert!(
            has_pending_delivery_for_target(&connection, TargetId::Cloud)
                .expect("check cloud pending")
        );
    }

    #[test]
    fn rollup_ignores_partially_delivered_items() {
        let connection = memory_queue();
        for index in 0..EnvelopeStage::Micro.rollup_threshold() {
            enqueue_envelope(
                &connection,
                &sample_envelope(u64::try_from(index).unwrap_or_default()),
                EnvelopeStage::Micro,
                None,
                &[TargetId::Local],
            )
            .expect("enqueue partially delivered item");
        }

        let candidates =
            rollup_candidates(&connection, EnvelopeStage::Micro).expect("rollup candidates");

        assert!(candidates.is_none());
    }

    fn memory_queue() -> Connection {
        let connection = Connection::open_in_memory().expect("open memory queue");
        initialize_queue_schema(&connection).expect("initialize queue schema");
        connection
    }

    fn sample_envelope(sequence_id: u64) -> PatchEnvelope {
        PatchEnvelope {
            sequence_id,
            domain: StorageDomain::UserData,
            device_id: "device-a".to_string(),
            created_at: 1,
            patch_bytes: vec![1, 2, 3],
            media_files: Vec::new(),
        }
    }
}
