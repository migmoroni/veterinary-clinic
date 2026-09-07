//! Coordinates independent, closed SQLite readers for the two artifact databases.

mod metadata;
mod system;
mod system_media;

use crate::{databases::DatabaseKind, projection::contract::ProjectionContract};
use rusqlite::Connection;
use std::path::Path;

pub(crate) use system::{StructuralMediaRow, SystemRows};
pub(crate) use system_media::SystemMediaRows;

#[derive(Debug)]
pub(crate) struct LocaleDatabaseRows {
    pub(crate) system: SystemRows,
    pub(crate) system_media: SystemMediaRows,
}

pub(crate) fn read(
    system_connection: &Connection,
    media_connection: &Connection,
    system_path: &Path,
    media_path: &Path,
    contract: &ProjectionContract,
) -> Result<LocaleDatabaseRows, crate::DatabaseError> {
    let system_metadata = metadata::read(system_connection, system_path)?;
    metadata::verify(
        &system_metadata,
        contract,
        DatabaseKind::System,
        system_path,
    )?;
    let media_metadata = metadata::read(media_connection, media_path)?;
    metadata::verify(
        &media_metadata,
        contract,
        DatabaseKind::SystemMedia,
        media_path,
    )?;

    let system = system::read(system_connection, system_path)?;
    let system_media = system_media::read(media_connection, media_path)?;

    Ok(LocaleDatabaseRows {
        system,
        system_media,
    })
}

pub(crate) fn verify_semantic_equivalence(
    rows: &LocaleDatabaseRows,
    contract: &ProjectionContract,
    system_path: &Path,
    media_path: &Path,
) -> Result<(), crate::DatabaseError> {
    system::verify(&rows.system, contract, system_path)?;
    system_media::verify(&rows.system_media, contract, media_path)
}
