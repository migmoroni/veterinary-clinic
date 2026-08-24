use crate::{media::sha256_hex, report::BuildContext, source::KnowledgeLocale};
use rusqlite::{params, Connection};
use std::{fs, path::Path};

pub const SYSTEM_SCHEMA_VERSION: u32 = 2;
pub const SYSTEM_MEDIA_SCHEMA_VERSION: u32 = 2;
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

    fn schema_version(self) -> u32 {
        match self {
            Self::System => SYSTEM_SCHEMA_VERSION,
            Self::SystemMedia => SYSTEM_MEDIA_SCHEMA_VERSION,
        }
    }

    fn application_id(self) -> u32 {
        match self {
            Self::System => 0x564b5359,
            Self::SystemMedia => 0x564b534d,
        }
    }
}

pub fn create(path: &Path, kind: DatabaseKind) -> Result<Connection, String> {
    if path.exists() {
        return Err(format!(
            "database staging path already exists: {}",
            path.display()
        ));
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "cannot create database directory {}: {error}",
                parent.display()
            )
        })?;
    }
    let connection = Connection::open(path)
        .map_err(|error| format!("cannot create SQLite database {}: {error}", path.display()))?;
    connection
        .execute_batch(&format!(
            "PRAGMA page_size=4096;\nPRAGMA journal_mode=OFF;\nPRAGMA synchronous=OFF;\nPRAGMA temp_store=MEMORY;\nPRAGMA foreign_keys=ON;\nPRAGMA trusted_schema=OFF;\nPRAGMA application_id={};\nPRAGMA user_version={};\n{}",
            kind.application_id(),
            kind.schema_version(),
            kind.ddl()
        ))
        .map_err(|error| format!("cannot initialize SQLite schema {}: {error}", path.display()))?;
    Ok(connection)
}

pub fn insert_metadata(
    connection: &Connection,
    context: &BuildContext,
    locale: KnowledgeLocale,
    source_digest: &[u8],
) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO knowledge_build_metadata (singleton, build_version, builder_version, build_result_schema_version, source_digest_sha256, locale) VALUES (1, ?1, ?2, 1, ?3, ?4)",
            params![
                i64::try_from(context.build_version).map_err(|_| "buildVersion exceeds SQLite integer range".to_string())?,
                env!("CARGO_PKG_VERSION"),
                source_digest,
                locale.as_str()
            ],
        )
        .map_err(|error| format!("cannot insert build metadata: {error}"))?;
    if let Some(release) = &context.release {
        connection
            .execute(
                "INSERT INTO knowledge_release_metadata (singleton, release_id, generation, revision, locale) VALUES (1, ?1, ?2, ?3, ?4)",
                params![release.release_id, release.generation, release.revision, locale.as_str()],
            )
            .map_err(|error| format!("cannot insert release metadata: {error}"))?;
    }
    Ok(())
}

pub fn finalize(connection: Connection, path: &Path) -> Result<String, String> {
    connection
        .execute_batch("PRAGMA optimize; VACUUM;")
        .map_err(|error| {
            format!(
                "cannot finalize SQLite database {}: {error}",
                path.display()
            )
        })?;
    verify(&connection, path)?;
    schema_fingerprint(&connection)
}

pub fn verify(connection: &Connection, path: &Path) -> Result<(), String> {
    let integrity: String = connection
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|error| format!("cannot run integrity_check on {}: {error}", path.display()))?;
    if integrity != "ok" {
        return Err(format!(
            "integrity_check failed for {}: {integrity}",
            path.display()
        ));
    }
    let foreign_key_failures: i64 = connection
        .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
            row.get(0)
        })
        .map_err(|error| {
            format!(
                "cannot run foreign_key_check on {}: {error}",
                path.display()
            )
        })?;
    if foreign_key_failures != 0 {
        return Err(format!(
            "foreign_key_check failed for {} with {foreign_key_failures} row(s)",
            path.display()
        ));
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
) -> Result<(), String> {
    verify(connection, path)?;
    let application_id: u32 = connection
        .query_row("PRAGMA application_id", [], |row| row.get(0))
        .map_err(|error| {
            format!(
                "cannot read application_id from {}: {error}",
                path.display()
            )
        })?;
    let user_version: u32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("cannot read user_version from {}: {error}", path.display()))?;
    if application_id != kind.application_id() || user_version != kind.schema_version() {
        return Err(format!(
            "SQLite technical identity mismatch for {}",
            path.display()
        ));
    }
    let metadata = connection.query_row(
        "SELECT build_version, builder_version, build_result_schema_version, source_digest_sha256, locale FROM knowledge_build_metadata",
        [],
        |row| Ok((row.get::<_, u64>(0)?, row.get::<_, String>(1)?, row.get::<_, u32>(2)?, row.get::<_, Vec<u8>>(3)?, row.get::<_, String>(4)?)),
    ).map_err(|error| format!("cannot read build metadata from {}: {error}", path.display()))?;
    if metadata.0 != context.build_version
        || metadata.1 != env!("CARGO_PKG_VERSION")
        || metadata.2 != 1
        || metadata.3 != source_digest
        || metadata.4 != locale.as_str()
    {
        return Err(format!(
            "knowledge_build_metadata mismatch for {}",
            path.display()
        ));
    }
    let release_rows: u32 = connection
        .query_row(
            "SELECT count(*) FROM knowledge_release_metadata",
            [],
            |row| row.get(0),
        )
        .map_err(|error| {
            format!(
                "cannot count release metadata in {}: {error}",
                path.display()
            )
        })?;
    match &context.release {
        None if release_rows == 0 => {}
        Some(expected) if release_rows == 1 => {
            let actual = connection.query_row(
                "SELECT release_id, generation, revision, locale FROM knowledge_release_metadata",
                [],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, u64>(1)?, row.get::<_, u64>(2)?, row.get::<_, String>(3)?)),
            ).map_err(|error| format!("cannot read release metadata from {}: {error}", path.display()))?;
            if actual
                != (
                    expected.release_id.clone(),
                    expected.generation,
                    expected.revision,
                    locale.to_string(),
                )
            {
                return Err(format!(
                    "knowledge_release_metadata mismatch for {}",
                    path.display()
                ));
            }
        }
        _ => {
            return Err(format!(
                "release metadata cardinality mismatch for {}",
                path.display()
            ))
        }
    }
    Ok(())
}

pub fn schema_fingerprint(connection: &Connection) -> Result<String, String> {
    let user_version: u32 = connection
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|error| format!("cannot read user_version: {error}"))?;
    let mut statement = connection
        .prepare(
            "SELECT type, name, tbl_name, coalesce(sql, '') FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name",
        )
        .map_err(|error| format!("cannot prepare schema fingerprint: {error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|error| format!("cannot query sqlite_schema: {error}"))?;
    let mut canonical = format!("user_version={user_version}\n");
    let mut table_names = Vec::new();
    for row in rows {
        let (kind, name, table, sql) =
            row.map_err(|error| format!("cannot read sqlite_schema: {error}"))?;
        if kind == "table" {
            table_names.push(name.clone());
        }
        canonical.push_str(&format!(
            "{kind}\0{name}\0{table}\0{}\n",
            sql.split_whitespace().collect::<Vec<_>>().join(" ")
        ));
    }
    for table in table_names {
        append_table_fingerprint(connection, &table, &mut canonical)?;
    }
    Ok(sha256_hex(canonical.as_bytes()))
}

fn append_table_fingerprint(
    connection: &Connection,
    table: &str,
    canonical: &mut String,
) -> Result<(), String> {
    let quoted = table.replace('\'', "''");
    let mut columns = connection
        .prepare(&format!("PRAGMA table_info('{quoted}')"))
        .map_err(|error| format!("cannot inspect columns for {table}: {error}"))?;
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
        .map_err(|error| format!("cannot query columns for {table}: {error}"))?
    {
        canonical.push_str(&format!(
            "column:{table}:{:?}\n",
            row.map_err(|error| error.to_string())?
        ));
    }
    let mut foreign_keys = connection
        .prepare(&format!("PRAGMA foreign_key_list('{quoted}')"))
        .map_err(|error| format!("cannot inspect foreign keys for {table}: {error}"))?;
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
        .map_err(|error| format!("cannot query foreign keys for {table}: {error}"))?
    {
        canonical.push_str(&format!(
            "foreign-key:{table}:{:?}\n",
            row.map_err(|error| error.to_string())?
        ));
    }
    let mut indexes = connection
        .prepare(&format!("PRAGMA index_list('{quoted}')"))
        .map_err(|error| format!("cannot inspect indexes for {table}: {error}"))?;
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
        .map_err(|error| format!("cannot query indexes for {table}: {error}"))?
    {
        canonical.push_str(&format!(
            "index:{table}:{:?}\n",
            row.map_err(|error| error.to_string())?
        ));
    }
    Ok(())
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
        assert_eq!(content_schema["properties"]["schemaVersion"]["const"], 1);
    }
}
