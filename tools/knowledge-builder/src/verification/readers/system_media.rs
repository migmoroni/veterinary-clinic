//! Reads complete media asset rows independently from the projection writers.

use crate::projection::contract::{ProjectionContract, SystemMediaRow};
use rusqlite::Connection;
use std::collections::BTreeMap;
use std::path::Path;

pub(crate) type SystemMediaRows = BTreeMap<String, SystemMediaRow>;

pub(super) fn read(
    connection: &Connection,
    database: &Path,
) -> Result<SystemMediaRows, crate::DatabaseError> {
    let mut statement = connection
        .prepare("SELECT media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height FROM media_assets ORDER BY media_key")
        .map_err(|source| crate::DatabaseError::Sqlite { database: database.to_path_buf(), operation: "prepare media semantic query", source: Box::new(source) })?;
    let rows = statement
        .query_map([], |row| {
            let media_key: String = row.get(0)?;
            Ok(SystemMediaRow {
                media_key,
                content_hash: row.get(1)?,
                thumbnail: row.get(2)?,
                thumbnail_mime_type: row.get(3)?,
                thumbnail_width: row.get(4)?,
                thumbnail_height: row.get(5)?,
                mime_type: row.get(6)?,
                size_bytes: row.get(7)?,
                width: row.get(8)?,
                height: row.get(9)?,
            })
        })
        .map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "run media semantic query",
            source: Box::new(source),
        })?;
    let mut result = BTreeMap::new();
    for row in rows {
        let value = row.map_err(|source| crate::DatabaseError::Sqlite {
            database: database.to_path_buf(),
            operation: "read media semantic row",
            source: Box::new(source),
        })?;
        let key = value.media_key.clone();
        if result.insert(key.clone(), value).is_some() {
            return Err(crate::DatabaseError::invariant(
                database,
                "read media semantic rows",
                format!("duplicate media semantic row identity {key}"),
            ));
        }
    }
    Ok(result)
}

pub(super) fn verify(
    observed: &SystemMediaRows,
    contract: &ProjectionContract,
    database: &Path,
) -> Result<(), crate::DatabaseError> {
    let expected = contract
        .system_media
        .iter()
        .map(|operation| (operation.row.media_key.clone(), operation.row.clone()))
        .collect::<BTreeMap<_, _>>();
    if expected != *observed {
        for (media_key, expected_row) in &expected {
            if let Some(observed_row) = observed.get(media_key) {
                if expected_row.thumbnail != observed_row.thumbnail
                    || expected_row.thumbnail_mime_type != observed_row.thumbnail_mime_type
                    || expected_row.thumbnail_width != observed_row.thumbnail_width
                    || expected_row.thumbnail_height != observed_row.thumbnail_height
                {
                    return Err(crate::DatabaseError::invariant(
                        database,
                        "compare media rows",
                        format!(
                            "thumbnail differs from projection contract for {media_key} for {}",
                            contract.locale
                        ),
                    ));
                }
            }
        }
        return Err(crate::DatabaseError::invariant(
            database,
            "compare media rows",
            format!(
            "system_media database is not semantically equivalent to projection contract for {}",
            contract.locale
        ),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reader_returns_every_media_column() {
        let connection = Connection::open_in_memory().unwrap();
        connection
            .execute_batch(crate::databases::SYSTEM_MEDIA_DDL)
            .unwrap();
        connection.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params!["key", vec![1_u8; 32], vec![2_u8; 4], "image/jpeg", 2, 1, "image/png", 8, 4, 2],
        ).unwrap();

        let rows = read(&connection, Path::new("<memory-system-media>")).unwrap();
        let row = &rows["key"];
        assert_eq!(row.content_hash, vec![1_u8; 32]);
        assert_eq!(row.thumbnail, vec![2_u8; 4]);
        assert_eq!((row.thumbnail_width, row.thumbnail_height), (2, 1));
        assert_eq!((row.width, row.height, row.size_bytes), (4, 2, 8));
    }
}
