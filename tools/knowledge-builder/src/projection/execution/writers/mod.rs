//! Persists prevalidated projection operations through focused SQLite writers.

mod metadata;
mod system;
mod system_media;

#[cfg(test)]
mod tests;

pub(crate) use system::write_system;
pub(crate) use system_media::write_system_media;

#[cfg(test)]
pub(crate) use system::write_system_row;

#[cfg(test)]
use system::{system_insert_statement, SystemInsertStatement};

use crate::{
    databases::DatabaseKind,
    projection::{
        contract::{
            MetadataOperation, MetadataRow, SystemMediaProjectionOperation,
            SystemProjectionOperation, SystemRow, SystemRowCase, SystemRowDescriptor,
        },
        coverage::SystemTable,
        execution::receipts::{ConfirmedReceiptBatch, PendingReceipt, ProjectionEvent},
    },
};
use rusqlite::{params, Connection, Transaction};

fn preserve_deterministic_write_epochs(
    connection: &Connection,
    database: DatabaseKind,
    metadata_operations: usize,
    has_domain_rows: bool,
) -> Result<(), String> {
    // Consolidating metadata and domain rows removes header-only SQLite write
    // epochs. Reapply those epochs without changing data so canonical database
    // bytes and their published checksums remain stable.
    let previous_epochs = metadata_operations + usize::from(has_domain_rows);
    for _ in 1..previous_epochs {
        connection
            .pragma_update(None, "user_version", database.identity().schema_version)
            .map_err(|error| format!("cannot stabilize SQLite write epoch: {error}"))?;
    }
    Ok(())
}
