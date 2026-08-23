use rusqlite::Connection;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum SchemaVersionStatus {
    Current,
    MigrationRequired { from: i64, to: i64 },
    FromFuture { found: i64, supported: i64 },
}

pub(crate) fn read_schema_version(connection: &Connection) -> Result<i64, String> {
    connection
        .query_row("PRAGMA user_version", [], |row| row.get::<_, i64>(0))
        .map_err(|error| format!("database_user_version_failed:{error}"))
}

pub(crate) fn set_schema_version(connection: &Connection, version: i64) -> Result<(), String> {
    if version < 0 {
        return Err(format!("database_schema_invalid_version:{version}"));
    }
    connection
        .execute_batch(&format!("PRAGMA user_version = {version};"))
        .map_err(|error| format!("database_user_version_set_failed:{error}"))
}

pub(crate) fn classify_schema_version(
    current_version: i64,
    target_version: i64,
) -> SchemaVersionStatus {
    if current_version > target_version {
        return SchemaVersionStatus::FromFuture {
            found: current_version,
            supported: target_version,
        };
    }
    if current_version == target_version {
        return SchemaVersionStatus::Current;
    }
    SchemaVersionStatus::MigrationRequired {
        from: current_version,
        to: target_version,
    }
}

pub(crate) fn classify_connection_schema_version(
    connection: &Connection,
    target_version: i64,
) -> Result<SchemaVersionStatus, String> {
    Ok(classify_schema_version(
        read_schema_version(connection)?,
        target_version,
    ))
}

pub(crate) fn ensure_not_from_future(
    status: SchemaVersionStatus,
) -> Result<SchemaVersionStatus, String> {
    match status {
        SchemaVersionStatus::FromFuture { found, .. } => {
            Err(format!("database_schema_from_future:{found}"))
        }
        _ => Ok(status),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_zero_as_migration_required() {
        assert_eq!(
            classify_schema_version(0, 1),
            SchemaVersionStatus::MigrationRequired { from: 0, to: 1 }
        );
    }

    #[test]
    fn classifies_current_version() {
        assert_eq!(classify_schema_version(1, 1), SchemaVersionStatus::Current);
    }

    #[test]
    fn classifies_future_version() {
        assert_eq!(
            classify_schema_version(2, 1),
            SchemaVersionStatus::FromFuture {
                found: 2,
                supported: 1
            }
        );
    }
}
