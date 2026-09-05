//! Coordinates independent, closed SQLite readers for the two artifact databases.

mod metadata;
mod system;
mod system_media;

use crate::{databases::DatabaseKind, projection::contract::ProjectionContract};
use rusqlite::Connection;

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
    contract: &ProjectionContract,
) -> Result<LocaleDatabaseRows, String> {
    let system_metadata = metadata::read(system_connection)?;
    metadata::verify(&system_metadata, contract, DatabaseKind::System)?;
    let media_metadata = metadata::read(media_connection)?;
    metadata::verify(&media_metadata, contract, DatabaseKind::SystemMedia)?;

    let system = system::read(system_connection)?;
    let system_media = system_media::read(media_connection)?;

    Ok(LocaleDatabaseRows {
        system,
        system_media,
    })
}

pub(crate) fn verify_semantic_equivalence(
    rows: &LocaleDatabaseRows,
    contract: &ProjectionContract,
) -> Result<(), String> {
    system::verify(&rows.system, contract)?;
    system_media::verify(&rows.system_media, contract)
}
