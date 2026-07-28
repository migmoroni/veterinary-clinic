//! Database identity helpers for the user data bundle.
//!
//! The manifest lives in the user logs database so imports, exports, and
//! replication mirrors can validate that they belong to the same logical base.

use super::uuid_v7_string;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

const DATABASE_SCOPE: &str = "user";
const CURRENT_SCHEMA_VERSION: i64 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DatabaseManifest {
    pub scope: String,
    pub database_id: String,
    pub app_version: String,
    pub schema_version: i64,
    pub created_at: String,
    pub updated_at: String,
}

pub(crate) fn ensure_database_manifest(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            r#"
            INSERT INTO database_manifest (
                scope, database_id, app_version, schema_version, created_at, updated_at
            )
            SELECT
                'user',
                ?1,
                ?2,
                ?3,
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
                strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
            WHERE NOT EXISTS (
                SELECT 1 FROM database_manifest WHERE scope = 'user'
            )
            "#,
            params![
                uuid_v7_string(),
                env!("CARGO_PKG_VERSION"),
                CURRENT_SCHEMA_VERSION
            ],
        )
        .map_err(|error| format!("database_manifest_insert_failed:{error}"))?;
    Ok(())
}

pub(crate) fn read_database_manifest(connection: &Connection) -> Result<DatabaseManifest, String> {
    connection
        .query_row(
            r#"
            SELECT scope, database_id, app_version, schema_version, created_at, updated_at
            FROM database_manifest
            WHERE scope = ?1
            LIMIT 1
            "#,
            params![DATABASE_SCOPE],
            |row| {
                Ok(DatabaseManifest {
                    scope: row.get(0)?,
                    database_id: row.get(1)?,
                    app_version: row.get(2)?,
                    schema_version: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|error| format!("database_manifest_missing:{error}"))
}

pub(crate) fn validate_database_manifest_schema(manifest: &DatabaseManifest) -> Result<(), String> {
    if manifest.scope != DATABASE_SCOPE {
        return Err(format!(
            "database_manifest_scope_invalid:{}",
            manifest.scope
        ));
    }
    if manifest.schema_version > CURRENT_SCHEMA_VERSION {
        return Err(format!(
            "database_manifest_schema_from_future:{}",
            manifest.schema_version
        ));
    }
    Ok(())
}

pub(crate) fn ensure_same_database_identity(
    active: &Connection,
    other: &Connection,
) -> Result<(), String> {
    let active_manifest = read_database_manifest(active)?;
    let other_manifest = read_database_manifest(other)?;
    validate_database_manifest_schema(&other_manifest)?;
    if active_manifest.database_id != other_manifest.database_id {
        return Err(format!(
            "database_manifest_identity_mismatch:{}:{}",
            active_manifest.database_id, other_manifest.database_id
        ));
    }
    Ok(())
}
