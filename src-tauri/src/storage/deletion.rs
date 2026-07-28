use super::{
    bytes_to_hex, data::StorageManager, decode_hash_hex, sha256, DeletionAuditLog,
    DeletionAuditLogsRequest, HardDeleteTrashRequest, StorageDomain,
};
use rusqlite::{params, Connection, OptionalExtension};
use std::{
    fs,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

static UUID_COUNTER: AtomicU64 = AtomicU64::new(0);

enum TrashTarget {
    UserData {
        table: &'static str,
        id_column: &'static str,
        dependencies: &'static [DependencyTarget],
    },
    UserMedia,
}

struct DependencyTarget {
    table: &'static str,
    id_column: &'static str,
    owner_column: &'static str,
}

const PET_DEPENDENCIES: &[DependencyTarget] = &[
    DependencyTarget {
        table: "medical_records",
        id_column: "id",
        owner_column: "pet_id",
    },
    DependencyTarget {
        table: "pet_treatments",
        id_column: "id",
        owner_column: "pet_id",
    },
];

const PROTOCOL_DEPENDENCIES: &[DependencyTarget] = &[
    DependencyTarget {
        table: "treatment_protocol_items",
        id_column: "id",
        owner_column: "protocol_id",
    },
    DependencyTarget {
        table: "treatment_protocol_doses",
        id_column: "id",
        owner_column: "protocol_id",
    },
];

impl StorageManager {
    pub fn hard_delete_trash_item(&self, request: HardDeleteTrashRequest) -> Result<(), String> {
        match trash_target(&request.kind)? {
            TrashTarget::UserData {
                table,
                id_column,
                dependencies,
            } => {
                let logs_path = self
                    .user_logs_database_path()
                    .to_string_lossy()
                    .into_owned();
                let connection = self
                    .user_db
                    .lock()
                    .map_err(|_| "database_connection_lock_failed".to_string())?;
                hard_delete_user_data(
                    &connection,
                    &logs_path,
                    table,
                    id_column,
                    dependencies,
                    &request.id,
                    request.deleted_by.as_deref(),
                )?;
                self.mark_user_bundle_dirty(super::StorageDatabase::User);
                self.mark_user_bundle_dirty(super::StorageDatabase::UserLogs);
                Ok(())
            }
            TrashTarget::UserMedia => {
                let hash = decode_hash_hex(&request.id)?;
                let logs_path = self
                    .user_logs_database_path()
                    .to_string_lossy()
                    .into_owned();
                let connection = self
                    .user_media_db
                    .lock()
                    .map_err(|_| "database_connection_lock_failed".to_string())?;
                hard_delete_user_media(
                    &connection,
                    &logs_path,
                    &request.id,
                    &hash,
                    request.deleted_by.as_deref(),
                )?;
                self.mark_user_bundle_dirty(super::StorageDatabase::UserMedia);
                self.mark_user_bundle_dirty(super::StorageDatabase::UserLogs);
                let path = self.resolve_cas_path(StorageDomain::User, &hash)?;
                if path.is_file() {
                    fs::remove_file(path)
                        .map_err(|error| format!("media_file_delete_failed:{error}"))?;
                }
                Ok(())
            }
        }
    }

    pub fn deletion_audit_logs(
        &self,
        request: DeletionAuditLogsRequest,
    ) -> Result<Vec<DeletionAuditLog>, String> {
        let limit = i64::from(request.limit.unwrap_or(100).clamp(1, 500));
        let connection = self
            .user_logs_db
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        let mut statement = connection
            .prepare(
                r#"
                SELECT id, domain, target_table, target_id, deleted_by, snapshot_json, created_at
                FROM permanent_deletion_logs
                ORDER BY created_at DESC, id DESC
                LIMIT ?1
                "#,
            )
            .map_err(|error| format!("deletion_logs_prepare_failed:{error}"))?;
        let rows = statement
            .query_map(params![limit], |row| {
                Ok(DeletionAuditLog {
                    id: row.get(0)?,
                    domain: row.get(1)?,
                    target_table: row.get(2)?,
                    target_id: row.get(3)?,
                    deleted_by: row.get(4)?,
                    snapshot_json: row.get(5)?,
                    created_at: row.get(6)?,
                })
            })
            .map_err(|error| format!("deletion_logs_select_failed:{error}"))?;
        let mut logs = Vec::new();
        for row in rows {
            logs.push(row.map_err(|error| format!("deletion_logs_row_failed:{error}"))?);
        }
        Ok(logs)
    }
}

fn trash_target(kind: &str) -> Result<TrashTarget, String> {
    match kind {
        "owner" => Ok(TrashTarget::UserData {
            table: "owners",
            id_column: "id",
            dependencies: &[],
        }),
        "pet" => Ok(TrashTarget::UserData {
            table: "pets",
            id_column: "id",
            dependencies: PET_DEPENDENCIES,
        }),
        "record" => Ok(TrashTarget::UserData {
            table: "medical_records",
            id_column: "id",
            dependencies: &[],
        }),
        "treatment" => Ok(TrashTarget::UserData {
            table: "pet_treatments",
            id_column: "id",
            dependencies: &[],
        }),
        "protocol" => Ok(TrashTarget::UserData {
            table: "treatment_protocols",
            id_column: "id",
            dependencies: PROTOCOL_DEPENDENCIES,
        }),
        "media" => Ok(TrashTarget::UserMedia),
        _ => Err("trash_kind_invalid".to_string()),
    }
}

fn hard_delete_user_data(
    connection: &Connection,
    logs_path: &str,
    table: &str,
    id_column: &str,
    dependencies: &[DependencyTarget],
    id: &str,
    deleted_by: Option<&str>,
) -> Result<(), String> {
    with_attached_logs(connection, logs_path, || {
        connection
            .execute_batch("BEGIN IMMEDIATE")
            .map_err(|error| format!("delete_transaction_begin_failed:{error}"))?;
        let result = (|| {
            for dependency in dependencies {
                log_dependency_rows(connection, dependency, id, deleted_by)?;
            }
            log_row(connection, "user_data", table, id_column, id, deleted_by)?;

            for dependency in dependencies.iter().rev() {
                let sql = format!(
                    "DELETE FROM {} WHERE {} = ?1 AND removed_at IS NOT NULL",
                    quote_identifier(dependency.table),
                    quote_identifier(dependency.owner_column),
                );
                connection
                    .execute(&sql, params![id])
                    .map_err(|error| format!("dependent_hard_delete_failed:{error}"))?;
            }

            let sql = format!(
                "DELETE FROM {} WHERE {} = ?1 AND removed_at IS NOT NULL",
                quote_identifier(table),
                quote_identifier(id_column),
            );
            let affected = connection
                .execute(&sql, params![id])
                .map_err(|error| format!("hard_delete_failed:{error}"))?;
            if affected == 0 {
                return Err("trash_item_not_found".to_string());
            }
            Ok(())
        })();

        finish_transaction(connection, result)
    })
}

fn hard_delete_user_media(
    connection: &Connection,
    logs_path: &str,
    target_id: &str,
    hash: &[u8],
    deleted_by: Option<&str>,
) -> Result<(), String> {
    with_attached_logs(connection, logs_path, || {
        connection
            .execute_batch("BEGIN IMMEDIATE")
            .map_err(|error| format!("delete_transaction_begin_failed:{error}"))?;
        let result = (|| {
            log_media_row(connection, target_id, hash, deleted_by)?;
            let affected = connection
                .execute(
                    "DELETE FROM blobs WHERE hash = ?1 AND removed_at IS NOT NULL",
                    params![hash],
                )
                .map_err(|error| format!("media_hard_delete_failed:{error}"))?;
            if affected == 0 {
                return Err("trash_item_not_found".to_string());
            }
            Ok(())
        })();

        finish_transaction(connection, result)
    })
}

fn with_attached_logs<F>(
    connection: &Connection,
    logs_path: &str,
    operation: F,
) -> Result<(), String>
where
    F: FnOnce() -> Result<(), String>,
{
    connection
        .execute("ATTACH DATABASE ?1 AS logs", params![logs_path])
        .map_err(|error| format!("logs_attach_failed:{error}"))?;
    let result = operation();
    let detach_result = connection
        .execute_batch("DETACH DATABASE logs")
        .map_err(|error| format!("logs_detach_failed:{error}"));
    result.and(detach_result)
}

fn finish_transaction(connection: &Connection, result: Result<(), String>) -> Result<(), String> {
    match result {
        Ok(()) => connection
            .execute_batch("COMMIT")
            .map_err(|error| format!("delete_transaction_commit_failed:{error}")),
        Err(error) => {
            let _ = connection.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}

fn log_dependency_rows(
    connection: &Connection,
    dependency: &DependencyTarget,
    owner_id: &str,
    deleted_by: Option<&str>,
) -> Result<(), String> {
    let sql = format!(
        "SELECT {} FROM {} WHERE {} = ?1 AND removed_at IS NOT NULL",
        quote_identifier(dependency.id_column),
        quote_identifier(dependency.table),
        quote_identifier(dependency.owner_column),
    );
    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("dependency_log_prepare_failed:{error}"))?;
    let rows = statement
        .query_map(params![owner_id], |row| row.get::<_, String>(0))
        .map_err(|error| format!("dependency_log_select_failed:{error}"))?;
    for row in rows {
        let id = row.map_err(|error| format!("dependency_log_row_failed:{error}"))?;
        log_row(
            connection,
            "user_data",
            dependency.table,
            dependency.id_column,
            &id,
            deleted_by,
        )?;
    }
    Ok(())
}

fn log_row(
    connection: &Connection,
    domain: &str,
    table: &str,
    id_column: &str,
    id: &str,
    deleted_by: Option<&str>,
) -> Result<(), String> {
    let snapshot = select_json_snapshot(connection, table, id_column, id)?;
    insert_deletion_log(
        connection,
        domain,
        table,
        id,
        deleted_by,
        snapshot.as_deref(),
    )
}

fn log_media_row(
    connection: &Connection,
    target_id: &str,
    hash: &[u8],
    deleted_by: Option<&str>,
) -> Result<(), String> {
    let snapshot = select_media_snapshot(connection, hash)?;
    insert_deletion_log(
        connection,
        "user_media",
        "blobs",
        target_id,
        deleted_by,
        snapshot.as_deref(),
    )
}

fn insert_deletion_log(
    connection: &Connection,
    domain: &str,
    table: &str,
    target_id: &str,
    deleted_by: Option<&str>,
    snapshot_json: Option<&str>,
) -> Result<(), String> {
    let id = uuid_v7_string();
    connection
        .execute(
            r#"
            INSERT INTO logs.permanent_deletion_logs (
                id, domain, target_table, target_id, deleted_by, snapshot_json, created_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            )
            "#,
            params![id, domain, table, target_id, deleted_by, snapshot_json],
        )
        .map_err(|error| format!("deletion_log_insert_failed:{error}"))?;

    connection
        .execute(
            r#"
            INSERT INTO logs.system_audit_logs (
                id, action_type, description, actor_id, created_at
            ) VALUES (
                ?1, 'permanent_delete', ?2, ?3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            )
            "#,
            params![
                uuid_v7_string(),
                format!("Permanent delete from {domain}.{table}:{target_id}"),
                deleted_by
            ],
        )
        .map_err(|error| format!("system_audit_log_insert_failed:{error}"))?;
    Ok(())
}

fn select_json_snapshot(
    connection: &Connection,
    table: &str,
    id_column: &str,
    id: &str,
) -> Result<Option<String>, String> {
    let columns = table_columns(connection, table)?;
    if columns.is_empty() {
        return Ok(None);
    }
    let pairs = columns
        .iter()
        .flat_map(|column| {
            let identifier = quote_identifier(column);
            [
                format!("'{}'", column.replace('\'', "''")),
                format!("CASE WHEN typeof({identifier}) = 'blob' THEN lower(hex({identifier})) ELSE {identifier} END"),
            ]
        })
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "SELECT json_object({pairs}) FROM {} WHERE {} = ?1 AND removed_at IS NOT NULL LIMIT 1",
        quote_identifier(table),
        quote_identifier(id_column),
    );
    connection
        .query_row(&sql, params![id], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|error| format!("snapshot_select_failed:{error}"))
}

fn select_media_snapshot(connection: &Connection, hash: &[u8]) -> Result<Option<String>, String> {
    let sql = r#"
        SELECT json_object(
            'hash', lower(hex(hash)),
            'mime_type', mime_type,
            'size_bytes', size_bytes,
            'width', width,
            'height', height,
            'sync_status', sync_status,
            'created_at', created_at,
            'updated_at', updated_at,
            'uploaded_at', uploaded_at,
            'removed_at', removed_at
        )
        FROM blobs
        WHERE hash = ?1 AND removed_at IS NOT NULL
        LIMIT 1
    "#;
    connection
        .query_row(sql, params![hash], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|error| format!("media_snapshot_select_failed:{error}"))
}

fn table_columns(connection: &Connection, table: &str) -> Result<Vec<String>, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({})", quote_identifier(table)))
        .map_err(|error| format!("table_columns_prepare_failed:{error}"))?;
    let rows = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("table_columns_select_failed:{error}"))?;
    let mut columns = Vec::new();
    for row in rows {
        columns.push(row.map_err(|error| format!("table_columns_row_failed:{error}"))?);
    }
    Ok(columns)
}

fn quote_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn uuid_v7_string() -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default();
    let counter = UUID_COUNTER.fetch_add(1, Ordering::Relaxed);
    let seed = format!("{}:{}:{}", millis, std::process::id(), counter);
    let entropy = sha256(seed.as_bytes());
    let mut bytes = [0_u8; 16];
    bytes[0] = ((millis >> 40) & 0xff) as u8;
    bytes[1] = ((millis >> 32) & 0xff) as u8;
    bytes[2] = ((millis >> 24) & 0xff) as u8;
    bytes[3] = ((millis >> 16) & 0xff) as u8;
    bytes[4] = ((millis >> 8) & 0xff) as u8;
    bytes[5] = (millis & 0xff) as u8;
    bytes[6..16].copy_from_slice(&entropy[0..10]);
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = bytes_to_hex(&bytes);
    format!(
        "{}-{}-{}-{}-{}",
        &hex[0..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..32]
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::{params, Connection, OptionalExtension};
    use std::path::PathBuf;

    const TEST_LOGS_DDL: &str = r#"
	CREATE TABLE permanent_deletion_logs (
		id TEXT PRIMARY KEY,
		domain TEXT NOT NULL,
		target_table TEXT NOT NULL,
		target_id TEXT NOT NULL,
		deleted_by TEXT,
		snapshot_json TEXT,
		created_at TEXT NOT NULL
	);

	CREATE TABLE system_audit_logs (
		id TEXT PRIMARY KEY,
		action_type TEXT NOT NULL,
		description TEXT NOT NULL,
		actor_id TEXT,
		created_at TEXT NOT NULL
	);
	"#;

    fn temp_logs_path(name: &str) -> PathBuf {
        let nonce = UUID_COUNTER.fetch_add(1, Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "veterinary-clinic-{name}-{}-{nonce}.db",
            std::process::id()
        ))
    }

    fn create_logs_database(path: &PathBuf) {
        let _ = fs::remove_file(path);
        let connection = Connection::open(path).expect("open logs database");
        connection
            .execute_batch(TEST_LOGS_DDL)
            .expect("create logs schema");
    }

    fn log_count(path: &PathBuf) -> i64 {
        let connection = Connection::open(path).expect("open logs database");
        connection
            .query_row("SELECT COUNT(*) FROM permanent_deletion_logs", [], |row| {
                row.get(0)
            })
            .expect("count logs")
    }

    #[test]
    fn hard_delete_user_data_deletes_row_and_writes_tombstone_log() {
        let logs_path = temp_logs_path("user-data-delete");
        create_logs_database(&logs_path);
        let connection = Connection::open_in_memory().expect("open user db");
        connection
            .execute_batch(
                r#"
				CREATE TABLE owners (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					removed_at TEXT
				);
				INSERT INTO owners (id, name, removed_at)
				VALUES ('owner-1', 'Ana', '2026-07-25T00:00:00Z');
				"#,
            )
            .expect("create user table");

        hard_delete_user_data(
            &connection,
            &logs_path.to_string_lossy(),
            "owners",
            "id",
            &[],
            "owner-1",
            Some("actor-1"),
        )
        .expect("hard delete");

        let remaining: i64 = connection
            .query_row("SELECT COUNT(*) FROM owners", [], |row| row.get(0))
            .expect("count owners");
        assert_eq!(remaining, 0);

        let logs = Connection::open(&logs_path).expect("open logs database");
        let snapshot: String = logs
            .query_row(
                "SELECT snapshot_json FROM permanent_deletion_logs WHERE target_id = 'owner-1'",
                [],
                |row| row.get(0),
            )
            .expect("select snapshot");
        assert!(snapshot.contains("\"name\":\"Ana\""));
        assert_eq!(log_count(&logs_path), 1);
        let _ = fs::remove_file(logs_path);
    }

    #[test]
    fn hard_delete_user_data_rolls_back_log_when_row_is_not_in_trash() {
        let logs_path = temp_logs_path("user-data-rollback");
        create_logs_database(&logs_path);
        let connection = Connection::open_in_memory().expect("open user db");
        connection
            .execute_batch(
                r#"
				CREATE TABLE owners (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					removed_at TEXT
				);
				INSERT INTO owners (id, name, removed_at)
				VALUES ('owner-1', 'Ana', NULL);
				"#,
            )
            .expect("create user table");

        let result = hard_delete_user_data(
            &connection,
            &logs_path.to_string_lossy(),
            "owners",
            "id",
            &[],
            "owner-1",
            None,
        );

        assert_eq!(result, Err("trash_item_not_found".to_string()));
        assert_eq!(log_count(&logs_path), 0);
        let remaining: i64 = connection
            .query_row("SELECT COUNT(*) FROM owners", [], |row| row.get(0))
            .expect("count owners");
        assert_eq!(remaining, 1);
        let _ = fs::remove_file(logs_path);
    }

    #[test]
    fn hard_delete_user_media_deletes_blob_metadata_and_writes_tombstone_log() {
        let logs_path = temp_logs_path("user-media-delete");
        create_logs_database(&logs_path);
        let connection = Connection::open_in_memory().expect("open media db");
        connection
            .execute_batch(
                r#"
				CREATE TABLE blobs (
					hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
					thumbnail BLOB,
					mime_type TEXT NOT NULL,
					size_bytes INTEGER NOT NULL,
					width INTEGER,
					height INTEGER,
					sync_status TEXT NOT NULL,
					created_at TEXT NOT NULL,
					updated_at TEXT NOT NULL,
					uploaded_at TEXT,
					removed_at TEXT
				) WITHOUT ROWID;
				"#,
            )
            .expect("create media table");
        let hash = [7_u8; 32];
        connection
			.execute(
				r#"
				INSERT INTO blobs (
					hash, mime_type, size_bytes, width, height, sync_status, created_at, updated_at, removed_at
				) VALUES (?1, 'image/webp', 128, 10, 10, 'pending', '2026-07-25T00:00:00Z', '2026-07-25T00:00:00Z', '2026-07-25T01:00:00Z')
				"#,
				params![hash.as_slice()],
			)
			.expect("insert media row");

        hard_delete_user_media(
            &connection,
            &logs_path.to_string_lossy(),
            &bytes_to_hex(&hash),
            &hash,
            Some("actor-1"),
        )
        .expect("hard delete media");

        let deleted = connection
            .query_row(
                "SELECT 1 FROM blobs WHERE hash = ?1",
                params![hash.as_slice()],
                |_| Ok(()),
            )
            .optional()
            .expect("select deleted media")
            .is_none();
        assert!(deleted);

        let logs = Connection::open(&logs_path).expect("open logs database");
        let domain: String = logs
            .query_row(
                "SELECT domain FROM permanent_deletion_logs WHERE target_table = 'blobs'",
                [],
                |row| row.get(0),
            )
            .expect("select log domain");
        assert_eq!(domain, "user_media");
        assert_eq!(log_count(&logs_path), 1);
        let _ = fs::remove_file(logs_path);
    }
}
