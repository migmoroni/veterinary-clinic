//! Applies inbound changes to active databases.
//!
//! This is used by explicit inbound IPC, target pulls and restore flows. The
//! module is intentionally small: SQLite transaction handling, LWW conflict
//! choice, CAS media ingestion and full restore live in focused child modules.

mod lww;
mod media;
mod restore;
mod sqlite;

use crate::{
    replication::types::{PatchEnvelope, StorageDomain},
    storage::StorageManager,
};
use rusqlite::Connection;
use std::io::Cursor;

pub(crate) use restore::restore_from_backup;
pub(crate) use sqlite::open_domain_database;

pub(crate) fn apply_patch_to_connection(
    connection: &Connection,
    patch_bytes: &[u8],
) -> Result<(), String> {
    sqlite::with_inbound_transaction(connection, || {
        let timestamp_indexes = lww::table_timestamp_indexes(connection)?;
        let mut input = Cursor::new(patch_bytes);
        connection
            .apply_strm(
                &mut input,
                None::<fn(&str) -> bool>,
                move |conflict_type, item| {
                    lww::conflict_action(conflict_type, item, &timestamp_indexes)
                },
            )
            .map_err(|error| format!("replication_changeset_apply_failed:{error}"))?;
        Ok(())
    })
}

pub(crate) fn apply_envelope_to_active(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    media::write_inbound_media_files(storage, envelope)?;
    let connection = match envelope.domain {
        StorageDomain::UserData => storage.user_db.clone(),
        StorageDomain::UserMedia => storage.user_media_db.clone(),
        StorageDomain::UserLogs => storage.user_logs_db.clone(),
    };
    let guard = connection
        .lock()
        .map_err(|_| "database_connection_lock_failed".to_string())?;
    apply_patch_to_connection(&guard, &envelope.patch_bytes)
}
