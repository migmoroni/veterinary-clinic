//! SQLite helpers used by inbound patch application.

use crate::{
    replication::types::StorageDomain,
    storage::{open_sqlite_db, DbType},
};
use rusqlite::Connection;
use std::path::Path;

pub(crate) fn open_domain_database(
    path: &Path,
    domain: StorageDomain,
) -> Result<Connection, String> {
    let db_type = match domain {
        StorageDomain::UserData => DbType::Operational,
        StorageDomain::UserMedia => DbType::MediaIndex,
        StorageDomain::UserLogs => DbType::Logs,
    };
    open_sqlite_db(path, db_type)
}

pub(super) fn with_inbound_transaction(
    connection: &Connection,
    apply: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    connection
        .execute_batch("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;")
        .map_err(|error| format!("replication_apply_begin_failed:{error}"))?;
    let result = apply();

    if result.is_ok() {
        connection
            .execute_batch("COMMIT; PRAGMA foreign_keys = ON;")
            .map_err(|error| format!("replication_apply_commit_failed:{error}"))?;
    } else {
        let _ = connection.execute_batch("ROLLBACK; PRAGMA foreign_keys = ON;");
    }
    result
}
