//! SQLite Session changeset creation.
//!
//! The active database is `main`; the capture attaches a baseline database and
//! asks SQLite Session to diff baseline -> main for every user table.

use super::{baseline, schema};
use rusqlite::{params, session::Session, Connection, DatabaseName};
use std::path::Path;

pub(crate) fn create_against_baseline(
    connection: &Connection,
    baseline_path: &Path,
) -> Result<Vec<u8>, String> {
    attach_baseline(connection, baseline_path)?;
    let result = (|| {
        // SQLite session computes the delta from attached baseline -> main.
        let tables = schema::user_tables(connection)?;
        let mut session = Session::new(connection)
            .map_err(|error| format!("replication_session_create_failed:{error}"))?;
        for table in tables {
            session
                .attach(Some(&table))
                .map_err(|error| format!("replication_session_attach_failed:{table}:{error}"))?;
            session
                .diff(DatabaseName::Attached("baseline"), &table)
                .map_err(|error| format!("replication_session_diff_failed:{table}:{error}"))?;
        }
        if session.is_empty() {
            return Ok(Vec::new());
        }
        let mut output = Vec::new();
        session
            .changeset_strm(&mut output)
            .map_err(|error| format!("replication_changeset_create_failed:{error}"))?;
        Ok(output)
    })();
    let detach = connection.execute_batch("DETACH DATABASE baseline");
    match (result, detach) {
        (Ok(value), Ok(())) => Ok(value),
        (Err(error), _) => Err(error),
        (Ok(_), Err(error)) => Err(format!("replication_baseline_detach_failed:{error}")),
    }
}

fn attach_baseline(connection: &Connection, baseline_path: &Path) -> Result<(), String> {
    connection
        .execute(
            "ATTACH DATABASE ?1 AS baseline",
            params![baseline::path_to_string(baseline_path)?],
        )
        .map_err(|error| format!("replication_baseline_attach_failed:{error}"))?;
    Ok(())
}
