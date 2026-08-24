//! Persists prevalidated projection operations through focused SQLite writers.

mod metadata;
mod system;
mod system_media;

#[cfg(test)]
mod tests;

pub(crate) use metadata::write_metadata;
pub(crate) use system::write_system;
pub(crate) use system_media::write_system_media;

#[cfg(test)]
use system::{system_insert_statement, SystemInsertCase, SystemInsertStatement};

use super::contract::{
    MetadataOperation, MetadataRow, SystemMediaProjectionOperation, SystemProjectionOperation,
    SystemRow,
};
use crate::{
    databases::DatabaseKind,
    ledger::{ProjectionLedger, SystemTable},
};
use rusqlite::{params, Connection, Transaction};
