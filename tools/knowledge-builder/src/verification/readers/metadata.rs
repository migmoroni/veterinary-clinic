//! Reads complete build and release metadata rows with literal SELECT statements.

use crate::{
    databases::DatabaseKind,
    projection::contract::{MetadataRow, ProjectionContract},
};
use rusqlite::Connection;
use std::path::Path;

pub(super) fn read(
    connection: &Connection,
    database: &Path,
) -> Result<Vec<MetadataRow>, crate::DatabaseError> {
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
        .map_err(|source| crate::DatabaseError::Sqlite { database: database.to_path_buf(), operation: "read semantic build metadata", source: Box::new(source) })?;
    observed.push(build);

    let mut statement = connection
        .prepare(
            "SELECT release_id, generation, revision, locale FROM knowledge_release_metadata ORDER BY singleton",
        )
        .map_err(|source| crate::DatabaseError::Sqlite { database: database.to_path_buf(), operation: "prepare semantic release metadata", source: Box::new(source) })?;
    let rows = statement
        .query_map([], |row| {
            Ok(MetadataRow::Release {
                release_id: row.get(0)?,
                generation: row.get(1)?,
                revision: row.get(2)?,
                locale: row.get(3)?,
            })
        })
        .map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "query semantic release metadata",
            source: Box::new(source),
        })?;
    for row in rows {
        observed.push(row.map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "read semantic release metadata",
            source: Box::new(source),
        })?);
    }
    Ok(observed)
}

pub(super) fn verify(
    observed: &[MetadataRow],
    contract: &ProjectionContract,
    database: DatabaseKind,
    path: &Path,
) -> Result<(), crate::DatabaseError> {
    let expected = contract
        .metadata
        .iter()
        .filter(|operation| operation.database == database)
        .map(|operation| operation.row.clone())
        .collect::<Vec<_>>();
    if observed != expected {
        return Err(crate::DatabaseError::invariant(
            path,
            "compare metadata rows",
            format!(
                "metadata is not semantically equivalent for {}",
                contract.locale
            ),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error;

    #[test]
    fn sqlite_reader_failure_preserves_database_context_and_source() {
        let connection = Connection::open_in_memory().unwrap();
        let path = Path::new("broken-system.sqlite3");
        let error = read(&connection, path).unwrap_err();
        assert!(matches!(error, crate::DatabaseError::Sqlite { .. }));
        assert_eq!(error.database(), path);
        assert!(error.source().is_some());
    }
}
