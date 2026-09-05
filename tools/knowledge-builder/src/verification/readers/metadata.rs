//! Reads complete build and release metadata rows with literal SELECT statements.

use crate::{
    databases::DatabaseKind,
    projection::contract::{MetadataRow, ProjectionContract},
};
use rusqlite::Connection;

pub(super) fn read(connection: &Connection) -> Result<Vec<MetadataRow>, String> {
    let mut observed = Vec::new();
    let build = connection
        .query_row(
            "SELECT build_version, builder_version, build_result_schema_version, source_digest_sha256, locale FROM knowledge_build_metadata",
            [],
            |row| {
                Ok(MetadataRow::Build {
                    build_version: row.get(0)?,
                    builder_version: row.get(1)?,
                    build_result_schema_version: row.get(2)?,
                    source_digest: row.get(3)?,
                    locale: row.get(4)?,
                })
            },
        )
        .map_err(|error| format!("cannot read semantic build metadata: {error}"))?;
    observed.push(build);

    let mut statement = connection
        .prepare(
            "SELECT release_id, generation, revision, locale FROM knowledge_release_metadata ORDER BY singleton",
        )
        .map_err(|error| format!("cannot prepare semantic release metadata: {error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok(MetadataRow::Release {
                release_id: row.get(0)?,
                generation: row.get(1)?,
                revision: row.get(2)?,
                locale: row.get(3)?,
            })
        })
        .map_err(|error| format!("cannot read semantic release metadata: {error}"))?;
    for row in rows {
        observed.push(row.map_err(|error| error.to_string())?);
    }
    Ok(observed)
}

pub(super) fn verify(
    observed: &[MetadataRow],
    contract: &ProjectionContract,
    database: DatabaseKind,
) -> Result<(), String> {
    let expected = contract
        .metadata
        .iter()
        .filter(|operation| operation.database == database)
        .map(|operation| operation.row.clone())
        .collect::<Vec<_>>();
    if observed != expected {
        return Err(format!(
            "metadata is not semantically equivalent for {}",
            contract.locale
        ));
    }
    Ok(())
}
