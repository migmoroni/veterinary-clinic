//! CSV package reader/writer.
//!
//! CSV export is meant for inspection and manual portability. It preserves
//! SQLite BLOB references as lowercase hex strings while package CAS files keep
//! the original media bytes on disk.

use super::{csv_tables::CsvTable, files::path_to_string, sqlite::quote_identifier};
use crate::storage::bytes_to_hex;
use rusqlite::{
    types::{Value as SqlValue, ValueRef},
    Connection, OptionalExtension,
};
use std::{fs, path::Path};

#[derive(Clone)]
struct TableColumnInfo {
    name: String,
    column_type: String,
    notnull: bool,
    pk: bool,
}

pub(crate) fn export_csv_table(
    connection: &Connection,
    table: &CsvTable,
    root: &Path,
) -> Result<(), String> {
    let folder = root.join(table.folder);
    fs::create_dir_all(&folder).map_err(|error| format!("csv_dir_create_failed:{error}"))?;
    let path = folder.join(format!("{}.csv", table.name));
    let mut output = String::new();
    output.push('\u{feff}');
    output.push_str(&table.columns.join(","));
    output.push('\n');

    let query = format!(
        "SELECT {} FROM {} ORDER BY {}",
        table
            .columns
            .iter()
            .map(|column| quote_identifier(column))
            .collect::<Vec<_>>()
            .join(", "),
        quote_identifier(table.name),
        table.order_by
    );
    let mut statement = connection
        .prepare(&query)
        .map_err(|error| format!("csv_export_prepare_failed:{}:{error}", table.name))?;
    let mut rows = statement
        .query([])
        .map_err(|error| format!("csv_export_query_failed:{}:{error}", table.name))?;

    while let Some(row) = rows
        .next()
        .map_err(|error| format!("csv_export_row_failed:{}:{error}", table.name))?
    {
        let mut values = Vec::with_capacity(table.columns.len());
        for index in 0..table.columns.len() {
            let value = row
                .get_ref(index)
                .map_err(|error| format!("csv_export_value_failed:{}:{error}", table.name))?;
            values.push(csv_escape(&sqlite_value_to_csv(value)));
        }
        output.push_str(&values.join(","));
        output.push('\n');
    }

    fs::write(path, output).map_err(|error| format!("csv_write_failed:{}:{error}", table.name))
}

pub(crate) fn import_csv_tables(
    connection: &Connection,
    tables: &[CsvTable],
    root: &Path,
) -> Result<(), String> {
    connection
        .execute_batch("PRAGMA foreign_keys = OFF; BEGIN IMMEDIATE;")
        .map_err(|error| format!("csv_import_begin_failed:{error}"))?;
    let result = (|| {
        for table in tables {
            import_csv_table(connection, table, root)?;
        }

        let violation = connection
            .query_row("PRAGMA foreign_key_check", [], |row| {
                let table: String = row.get(0)?;
                let rowid: i64 = row.get(1)?;
                let parent: String = row.get(2)?;
                Ok(format!("{table}.{rowid}->{parent}"))
            })
            .optional()
            .map_err(|error| format!("csv_foreign_key_check_failed:{error}"))?;
        if let Some(violation) = violation {
            return Err(format!("csv_foreign_key_violation:{violation}"));
        }
        Ok(())
    })();

    if result.is_ok() {
        connection
            .execute_batch("COMMIT; PRAGMA foreign_keys = ON;")
            .map_err(|error| format!("csv_import_commit_failed:{error}"))?;
    } else {
        let _ = connection.execute_batch("ROLLBACK; PRAGMA foreign_keys = ON;");
    }
    result
}

fn import_csv_table(connection: &Connection, table: &CsvTable, root: &Path) -> Result<(), String> {
    let path = root.join(table.folder).join(format!("{}.csv", table.name));
    let bytes =
        fs::read(&path).map_err(|error| format!("csv_read_failed:{}:{error}", table.name))?;
    let rows = parse_csv(&bytes, &path_to_string(&path)?)?;
    if rows.is_empty() {
        return Err(format!("csv_missing_header:{}", table.name));
    }

    let header = &rows[0];
    if header.len() != table.columns.len()
        || !header
            .iter()
            .zip(table.columns.iter())
            .all(|(actual, expected)| actual == expected)
    {
        return Err(format!("csv_header_mismatch:{}", table.name));
    }

    let column_info = table_column_info(connection, table.name)?;
    let insert_sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        quote_identifier(table.name),
        table
            .columns
            .iter()
            .map(|column| quote_identifier(column))
            .collect::<Vec<_>>()
            .join(", "),
        (1..=table.columns.len())
            .map(|index| format!("?{index}"))
            .collect::<Vec<_>>()
            .join(", ")
    );
    let mut statement = connection
        .prepare(&insert_sql)
        .map_err(|error| format!("csv_import_prepare_failed:{}:{error}", table.name))?;

    // Media references stay as 32-byte hashes in SQLite and are rendered as
    // lowercase hex only while inside the CSV package.
    for row in rows.iter().skip(1) {
        if row.len() != table.columns.len() {
            return Err(format!("csv_row_column_count:{}", table.name));
        }
        let mut values = Vec::with_capacity(row.len());
        for (index, raw_value) in row.iter().enumerate() {
            let column = table.columns[index];
            let info = column_info
                .iter()
                .find(|item| item.name == column)
                .ok_or_else(|| format!("csv_column_missing:{}.{}", table.name, column))?;
            values.push(csv_cell_to_sql(
                raw_value,
                info,
                table.blob_columns.contains(&column),
            )?);
        }
        statement
            .execute(rusqlite::params_from_iter(values))
            .map_err(|error| format!("csv_import_insert_failed:{}:{error}", table.name))?;
    }
    Ok(())
}

fn table_column_info(
    connection: &Connection,
    table_name: &str,
) -> Result<Vec<TableColumnInfo>, String> {
    let mut statement = connection
        .prepare(&format!(
            "PRAGMA table_info({})",
            quote_identifier(table_name)
        ))
        .map_err(|error| format!("csv_column_info_prepare_failed:{table_name}:{error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok(TableColumnInfo {
                name: row.get(1)?,
                column_type: row.get::<_, String>(2)?,
                notnull: row.get::<_, i64>(3)? != 0,
                pk: row.get::<_, i64>(5)? != 0,
            })
        })
        .map_err(|error| format!("csv_column_info_query_failed:{table_name}:{error}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("csv_column_info_failed:{table_name}:{error}"))
}

fn csv_cell_to_sql(value: &str, info: &TableColumnInfo, is_blob: bool) -> Result<SqlValue, String> {
    if is_blob {
        return if value.is_empty() {
            Ok(SqlValue::Null)
        } else {
            decode_hex(value).map(SqlValue::Blob)
        };
    }

    let is_nullable = !info.notnull && !info.pk;
    if value.is_empty() && is_nullable {
        return Ok(SqlValue::Null);
    }

    if info.column_type.to_ascii_uppercase().contains("INT") {
        return value
            .parse::<i64>()
            .map(SqlValue::Integer)
            .map_err(|_| "csv_invalid_integer".to_string());
    }

    Ok(SqlValue::Text(value.to_string()))
}

fn sqlite_value_to_csv(value: ValueRef<'_>) -> String {
    match value {
        ValueRef::Null => String::new(),
        ValueRef::Integer(value) => value.to_string(),
        ValueRef::Real(value) => value.to_string(),
        ValueRef::Text(value) => String::from_utf8_lossy(value).to_string(),
        ValueRef::Blob(value) => bytes_to_hex(value),
    }
}

fn csv_escape(value: &str) -> String {
    if value.contains('"') || value.contains('\n') || value.contains('\r') || value.contains(',') {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn parse_csv(bytes: &[u8], path: &str) -> Result<Vec<Vec<String>>, String> {
    let text = String::from_utf8_lossy(bytes)
        .trim_start_matches('\u{feff}')
        .to_string();
    let mut rows = Vec::new();
    let mut row = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    let mut chars = text.chars().peekable();

    while let Some(character) = chars.next() {
        if in_quotes {
            if character == '"' {
                if chars.peek() == Some(&'"') {
                    field.push('"');
                    chars.next();
                } else {
                    in_quotes = false;
                }
            } else {
                field.push(character);
            }
            continue;
        }

        match character {
            '"' => {
                if !field.is_empty() {
                    return Err(format!("csv_invalid_quote:{path}"));
                }
                in_quotes = true;
            }
            ',' => {
                row.push(std::mem::take(&mut field));
            }
            '\n' => {
                row.push(std::mem::take(&mut field));
                rows.push(std::mem::take(&mut row));
            }
            '\r' => {}
            _ => field.push(character),
        }
    }

    if in_quotes {
        return Err(format!("csv_unclosed_quote:{path}"));
    }
    if !field.is_empty() || !row.is_empty() {
        row.push(field);
        rows.push(row);
    }
    Ok(rows
        .into_iter()
        .filter(|row| !(row.len() == 1 && row[0].is_empty()))
        .collect())
}

fn decode_hex(value: &str) -> Result<Vec<u8>, String> {
    let normalized = value.trim();
    if normalized.len() % 2 != 0
        || !normalized
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err("hex_invalid".to_string());
    }

    let mut bytes = Vec::with_capacity(normalized.len() / 2);
    for pair in normalized.as_bytes().chunks_exact(2) {
        bytes.push((hex_nibble(pair[0])? << 4) | hex_nibble(pair[1])?);
    }
    Ok(bytes)
}

fn hex_nibble(value: u8) -> Result<u8, String> {
    match value {
        b'0'..=b'9' => Ok(value - b'0'),
        b'a'..=b'f' => Ok(value - b'a' + 10),
        b'A'..=b'F' => Ok(value - b'A' + 10),
        _ => Err("hex_invalid".to_string()),
    }
}
