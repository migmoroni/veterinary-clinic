//! Persists locale media metadata and thumbnails into the system-media database.

use super::*;

pub(crate) fn write_system_media(
    connection: &mut Connection,
    operations: &[SystemMediaProjectionOperation],
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system_media projection: {error}"))?;
    let mut journal = ledger.journal();
    for operation in operations {
        let row = &operation.row;
        let affected = transaction.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![row.media_key, row.content_hash, row.thumbnail, row.thumbnail_mime_type,
                row.thumbnail_width, row.thumbnail_height, row.mime_type, row.size_bytes, row.width, row.height],
        ).map_err(|error| format!("cannot persist media asset {}: {error}", row.media_key))?;
        journal.complete_operation(&operation.obligations, affected, operation.event.clone())?;
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system_media projection: {error}"))?;
    ledger.commit(journal)
}
