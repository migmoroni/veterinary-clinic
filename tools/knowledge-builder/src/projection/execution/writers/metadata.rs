//! Persists build and release metadata operations inside a locale transaction.

use super::{
    database_path, params, DatabaseError, DatabaseKind, MetadataOperation, MetadataRow,
    PendingReceipt, ProjectionEvent, Transaction,
};

pub(crate) fn write_metadata(
    transaction: &Transaction<'_>,
    database: DatabaseKind,
    operations: &[MetadataOperation],
) -> Result<Vec<PendingReceipt>, DatabaseError> {
    let mut pending = Vec::new();
    for operation in operations
        .iter()
        .filter(|operation| operation.database == database)
    {
        let affected = match &operation.row {
            MetadataRow::Build {
                build_version,
                builder_version,
                build_result_schema_version,
                source_digest,
                locale,
            } => transaction.execute(
                "INSERT INTO knowledge_build_metadata (singleton, build_version, builder_version, build_result_schema_version, source_digest_sha256, locale) VALUES (1, ?1, ?2, ?3, ?4, ?5)",
                params![build_version, builder_version, build_result_schema_version, source_digest, locale],
            ),
            MetadataRow::Release {
                release_id,
                generation,
                revision,
                locale,
            } => transaction.execute(
                "INSERT INTO knowledge_release_metadata (singleton, release_id, generation, revision, locale) VALUES (1, ?1, ?2, ?3, ?4)",
                params![release_id, generation, revision, locale],
            ),
        }
        .map_err(|source| DatabaseError::Table {
            database: database_path(transaction),
            table: operation.event.table.as_str().to_string(),
            operation: "insert metadata row",
            source: Box::new(source),
        })?;
        pending.push(
            PendingReceipt::new(
                operation.id(),
                operation.obligations.clone(),
                ProjectionEvent::SqliteRow(operation.event.clone()),
                affected,
            )
            .map_err(|source| DatabaseError::Contract {
                database: database_path(transaction),
                operation: "confirm metadata receipt",
                source: Box::new(source),
            })?,
        );
    }
    Ok(pending)
}
