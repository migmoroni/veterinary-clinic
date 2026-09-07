//! Owns the canonical SQLite schemas, technical database identities, staging
//! creation, integrity checks, and deterministic schema fingerprints.

use crate::{
    contracts::{
        database::{DatabaseIdentity, SYSTEM_DATABASE, SYSTEM_MEDIA_DATABASE},
        locale::KnowledgeLocale,
        version::BUILD_RESULT_SCHEMA_VERSION,
    },
    media::sha256_hex,
    report::BuildContext,
    DatabaseError,
};
use rusqlite::Connection;
use std::{fs, path::Path};

pub const SYSTEM_DDL: &str = include_str!("../../schemas/system/system.sql");
pub const SYSTEM_MEDIA_DDL: &str = include_str!("../../schemas/system_media/system_media.sql");

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum DatabaseKind {
    System,
    SystemMedia,
}

impl DatabaseKind {
    fn ddl(self) -> &'static str {
        match self {
            Self::System => SYSTEM_DDL,
            Self::SystemMedia => SYSTEM_MEDIA_DDL,
        }
    }

    pub(crate) const fn identity(self) -> &'static DatabaseIdentity {
        match self {
            Self::System => &SYSTEM_DATABASE,
            Self::SystemMedia => &SYSTEM_MEDIA_DATABASE,
        }
    }
}

pub fn create(path: &Path, kind: DatabaseKind) -> Result<Connection, DatabaseError> {
    if path.exists() {
        return Err(DatabaseError::invariant(
            path,
            "create staging database",
            "staging path already exists",
        ));
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|source| DatabaseError::Io {
            path: parent.to_path_buf(),
            operation: "create database directory",
            source,
        })?;
    }
    let connection = Connection::open(path).map_err(|source| DatabaseError::Sqlite {
        database: path.to_path_buf(),
        operation: "create database",
        source: Box::new(source),
    })?;
    connection
        .execute_batch(&format!(
            "PRAGMA page_size=4096;\nPRAGMA journal_mode=OFF;\nPRAGMA synchronous=OFF;\nPRAGMA temp_store=MEMORY;\nPRAGMA foreign_keys=ON;\nPRAGMA trusted_schema=OFF;\nPRAGMA application_id={};\nPRAGMA user_version={};\n{}",
            kind.identity().application_id,
            kind.identity().schema_version,
            kind.ddl()
        ))
        .map_err(|source| DatabaseError::Sqlite {
            database: path.to_path_buf(),
            operation: "initialize schema and PRAGMAs",
            source: Box::new(source),
        })?;
    Ok(connection)
}

pub fn finalize(connection: Connection, path: &Path) -> Result<String, DatabaseError> {
    connection
        .execute_batch("PRAGMA optimize; VACUUM;")
        .map_err(|source| DatabaseError::Sqlite {
            database: path.to_path_buf(),
            operation: "optimize and vacuum",
            source: Box::new(source),
        })?;
    verify(&connection, path)?;
    schema_fingerprint_at(&connection, path)
}

pub fn verify(connection: &Connection, path: &Path) -> Result<(), DatabaseError> {
    verify_inner(connection, path)
}

fn verify_inner(connection: &Connection, path: &Path) -> Result<(), DatabaseError> {
    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|source| sqlite(path, "run integrity_check", source))?;
    if integrity != "ok" {
        return Err((format!("integrity_check failed for {}: {integrity}", path.display())).into());
    }
    let foreign_key_failures: i64 = connection
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .map_err(|source| sqlite(path, "run foreign_key_check", source))?;
    if foreign_key_failures != 0 {
        return Err((format!(
            "foreign_key_check failed for {} with {foreign_key_failures} row(s)",
            path.display()
        ))
        .into());
    }
    Ok(())
}

pub fn verify_contract(
    connection: &Connection,
    path: &Path,
    kind: DatabaseKind,
    context: &BuildContext,
    locale: KnowledgeLocale,
    source_digest: &[u8],
) -> Result<(), DatabaseError> {
    verify_contract_inner(connection, path, kind, context, locale, source_digest)
}

fn verify_contract_inner(
    connection: &Connection,
    path: &Path,
    kind: DatabaseKind,
    context: &BuildContext,
    locale: KnowledgeLocale,
    source_digest: &[u8],
) -> Result<(), DatabaseError> {
    verify_inner(connection, path)?;
    let application_id: u32 = connection
        .query_row("PRAGMA application_id", [], |row| row.get(0))
        .map_err(|source| sqlite(path, "read application_id", source))?;
    let user_version: u32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|source| sqlite(path, "read user_version", source))?;
    if application_id != kind.identity().application_id
        || user_version != kind.identity().schema_version
    {
        return Err((format!("SQLite technical identity mismatch for {}", path.display())).into());
    }
    let actual_fingerprint = schema_fingerprint_inner(connection, path)?;
    let expected_fingerprint = canonical_schema_fingerprint(kind)?;
    if actual_fingerprint != expected_fingerprint {
        return Err((format!(
            "SQLite physical schema differs from the canonical {} contract for {}",
            match kind {
                DatabaseKind::System => "system",
                DatabaseKind::SystemMedia => "system_media",
            },
            path.display()
        ))
        .into());
    }
    let metadata = connection.query_row(
        "SELECT build_version, builder_version, build_result_schema_version, source_digest_sha256, locale FROM knowledge_build_metadata",
        [],
        |row| Ok((row.get::<_, u64>(0)?, row.get::<_, String>(1)?, row.get::<_, u32>(2)?, row.get::<_, Vec<u8>>(3)?, row.get::<_, String>(4)?)),
    ).map_err(|source| sqlite(path, "read build metadata", source))?;
    if metadata.0 != context.build_version
        || metadata.1 != env!("CARGO_PKG_VERSION")
        || metadata.2 != BUILD_RESULT_SCHEMA_VERSION
        || metadata.3 != source_digest
        || metadata.4 != locale.as_str()
    {
        return Err((format!("knowledge_build_metadata mismatch for {}", path.display())).into());
    }
    let release_rows: u32 = connection
        .query_row(
            "SELECT count(*) FROM knowledge_release_metadata",
            [],
            |row| row.get(0),
        )
        .map_err(|source| sqlite(path, "count release metadata", source))?;
    match &context.release {
        None if release_rows == 0 => {}
        Some(expected) if release_rows == 1 => {
            let actual = connection.query_row(
                "SELECT release_id, generation, revision, locale FROM knowledge_release_metadata",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, u64>(1)?, row.get::<_, u64>(2)?, row.get::<_, String>(3)?)),
            ).map_err(|source| sqlite(path, "read release metadata", source))?;
            if actual
                != (
                    expected.release_id.clone(),
                    expected.generation,
                    expected.revision,
                    locale.to_string(),
                )
            {
                return Err((format!(
                    "knowledge_release_metadata mismatch for {}",
                    path.display()
                ))
                .into());
            }
        }
        _ => {
            return Err((format!(
                "release metadata cardinality mismatch for {}",
                path.display()
            ))
            .into())
        }
    }
    Ok(())
}

fn canonical_schema_fingerprint(kind: DatabaseKind) -> Result<String, DatabaseError> {
    let canonical_path = Path::new("<canonical schema>");
    let connection = Connection::open_in_memory()
        .map_err(|source| sqlite(canonical_path, "open canonical schema database", source))?;
    connection
        .execute_batch(&format!(
            "PRAGMA foreign_keys=ON;\nPRAGMA user_version={};\n{}",
            kind.identity().schema_version,
            kind.ddl()
        ))
        .map_err(|source| sqlite(canonical_path, "initialize canonical schema", source))?;
    schema_fingerprint_inner(&connection, canonical_path)
}

pub fn schema_fingerprint(connection: &Connection) -> Result<String, DatabaseError> {
    schema_fingerprint_at(connection, Path::new("<open SQLite connection>"))
}

fn schema_fingerprint_at(connection: &Connection, _path: &Path) -> Result<String, DatabaseError> {
    schema_fingerprint_inner(connection, _path)
}

fn schema_fingerprint_inner(connection: &Connection, path: &Path) -> Result<String, DatabaseError> {
    let user_version: u32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|source| sqlite(path, "read schema user_version", source))?;
    let mut statement = connection
        .prepare(
            "SELECT type, name, tbl_name, coalesce(sql, '') FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
        )
        .map_err(|source| sqlite(path, "prepare schema fingerprint", source))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|source| sqlite(path, "query sqlite_schema", source))?;
    let mut canonical = format!("user_version={user_version}\n");
    let mut table_names = Vec::new();
    for row in rows {
        let (kind, name, table, sql) =
            row.map_err(|source| sqlite(path, "read sqlite_schema", source))?;
        if kind == "table" {
            table_names.push(name.clone());
        }
        canonical.push_str(&format!(
            "{kind}\0{name}\0{table}\0{}\n",
            sql.split_whitespace().collect::<Vec<_>>().join(" ")
        ));
    }
    for table in table_names {
        append_table_fingerprint(connection, path, &table, &mut canonical)?;
    }
    Ok(sha256_hex(canonical.as_bytes()))
}

fn append_table_fingerprint(
    connection: &Connection,
    path: &Path,
    table: &str,
    canonical: &mut String,
) -> Result<(), DatabaseError> {
    let quoted = table.replace('\'', "''");
    let mut columns = connection
        .prepare(&format!("PRAGMA table_info('{quoted}')"))
        .map_err(|source| sqlite_table(path, table, "inspect columns", source))?;
    for row in columns
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, i64>(5)?,
            ))
        })
        .map_err(|source| sqlite_table(path, table, "query columns", source))?
    {
        canonical.push_str(&format!(
            "column:{table}:{:?}\n",
            row.map_err(|source| sqlite_table(path, table, "read columns", source))?
        ));
    }
    let mut foreign_keys = connection
        .prepare(&format!("PRAGMA foreign_key_list('{quoted}')"))
        .map_err(|source| sqlite_table(path, table, "inspect foreign keys", source))?;
    for row in foreign_keys
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, Option<String>>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, String>(7)?,
            ))
        })
        .map_err(|source| sqlite_table(path, table, "query foreign keys", source))?
    {
        canonical.push_str(&format!(
            "foreign-key:{table}:{:?}\n",
            row.map_err(|source| sqlite_table(path, table, "read foreign keys", source))?
        ));
    }
    let mut indexes = connection
        .prepare(&format!("PRAGMA index_list('{quoted}')"))
        .map_err(|source| sqlite_table(path, table, "inspect indexes", source))?;
    for row in indexes
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .map_err(|source| sqlite_table(path, table, "query indexes", source))?
    {
        canonical.push_str(&format!(
            "index:{table}:{:?}\n",
            row.map_err(|source| sqlite_table(path, table, "read indexes", source))?
        ));
    }
    Ok(())
}

fn sqlite(path: &Path, operation: &'static str, source: rusqlite::Error) -> DatabaseError {
    DatabaseError::Sqlite {
        database: path.to_path_buf(),
        operation,
        source: Box::new(source),
    }
}

fn sqlite_table(
    path: &Path,
    table: &str,
    operation: &'static str,
    source: rusqlite::Error,
) -> DatabaseError {
    DatabaseError::Table {
        database: path.to_path_buf(),
        table: table.to_string(),
        operation,
        source: Box::new(source),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn public_schemas_do_not_contain_generic_search_concepts() {
        assert!(!SYSTEM_DDL.contains("searchConcept"));
        assert!(!SYSTEM_MEDIA_DDL.contains("searchConcept"));
        let content_schema: serde_json::Value = serde_json::from_str(include_str!(
            "../../schemas/system/content-document.schema.json"
        ))
        .unwrap();
        assert_eq!(
            content_schema["properties"]["schemaVersion"]["const"],
            crate::contracts::version::CONTENT_DOCUMENT_SCHEMA_VERSION
        );
    }
}
