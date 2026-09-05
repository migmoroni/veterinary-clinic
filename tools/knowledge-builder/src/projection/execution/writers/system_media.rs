//! Persists locale media metadata and thumbnails into the system-media database.

use super::metadata::write_metadata;
use super::{
    database_path, params, preserve_deterministic_write_epochs, ConfirmedReceiptBatch, Connection,
    DatabaseError, DatabaseKind, MetadataOperation, PendingReceipt, ProjectionEvent,
    SystemMediaProjectionOperation,
};

pub(crate) fn write_system_media(
    connection: &mut Connection,
    metadata: &[MetadataOperation],
    operations: &[SystemMediaProjectionOperation],
) -> Result<ConfirmedReceiptBatch, DatabaseError> {
    let path = database_path(connection);
    let transaction = connection
        .transaction()
        .map_err(|source| DatabaseError::Sqlite {
            database: path.clone(),
            operation: "begin system_media transaction",
            source: Box::new(source),
        })?;
    let mut pending = write_metadata(&transaction, DatabaseKind::SystemMedia, metadata)?;
    for operation in operations {
        let row = &operation.row;
        let affected = transaction.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![row.media_key, row.content_hash, row.thumbnail, row.thumbnail_mime_type,
                row.thumbnail_width, row.thumbnail_height, row.mime_type, row.size_bytes, row.width, row.height],
        ).map_err(|source| DatabaseError::Table {
            database: path.clone(),
            table: "media_assets".to_string(),
            operation: "insert media asset",
            source: Box::new(source),
        })?;
        pending.push(
            PendingReceipt::new(
                operation.id(),
                operation.obligations.clone(),
                ProjectionEvent::SqliteRow(operation.event.clone()),
                affected,
            )
            .map_err(|detail| DatabaseError::invariant(&path, "confirm media receipt", detail))?,
        );
    }
    transaction
        .commit()
        .map_err(|source| DatabaseError::Sqlite {
            database: path.clone(),
            operation: "commit system_media transaction",
            source: Box::new(source),
        })?;
    preserve_deterministic_write_epochs(
        connection,
        DatabaseKind::SystemMedia,
        metadata
            .iter()
            .filter(|operation| operation.database == DatabaseKind::SystemMedia)
            .count(),
        !operations.is_empty(),
    )?;
    ConfirmedReceiptBatch::confirm(pending).map_err(|detail| {
        DatabaseError::invariant(path, "confirm system_media receipt batch", detail)
    })
}
