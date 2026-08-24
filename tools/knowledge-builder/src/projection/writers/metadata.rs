//! Persists build and release metadata operations into a locale database.

use super::*;

pub(crate) fn write_metadata(
    connection: &Connection,
    database: DatabaseKind,
    operations: &[MetadataOperation],
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let mut journal = ledger.journal();
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
            } => connection.execute(
                "INSERT INTO knowledge_build_metadata (singleton, build_version, builder_version, build_result_schema_version, source_digest_sha256, locale) VALUES (1, ?1, ?2, ?3, ?4, ?5)",
                params![build_version, builder_version, build_result_schema_version, source_digest, locale],
            ),
            MetadataRow::Release {
                release_id,
                generation,
                revision,
                locale,
            } => connection.execute(
                "INSERT INTO knowledge_release_metadata (singleton, release_id, generation, revision, locale) VALUES (1, ?1, ?2, ?3, ?4)",
                params![release_id, generation, revision, locale],
            ),
        }
        .map_err(|error| format!("cannot persist metadata operation: {error}"))?;
        journal.complete_operation(&operation.obligations, affected, operation.event.clone())?;
    }
    ledger.commit(journal)
}
