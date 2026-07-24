use super::SqlExecuteResponse;
use rusqlite::{
    params_from_iter,
    types::{Value as SqlValue, ValueRef},
    Connection,
};
use serde_json::{Map as JsonMap, Number as JsonNumber, Value as JsonValue};

pub(crate) fn select_rows(
    connection: &Connection,
    query: &str,
    values: Vec<JsonValue>,
) -> Result<Vec<JsonValue>, String> {
    let sql = normalize_sql_placeholders(query);
    let params = json_values_to_sql(values)?;
    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("database_select_prepare_failed:{error}"))?;
    let column_names = statement
        .column_names()
        .iter()
        .map(|name| (*name).to_string())
        .collect::<Vec<_>>();
    let mut rows = statement
        .query(params_from_iter(params))
        .map_err(|error| format!("database_select_failed:{error}"))?;
    let mut output = Vec::new();

    while let Some(row) = rows
        .next()
        .map_err(|error| format!("database_select_row_failed:{error}"))?
    {
        let mut object = JsonMap::with_capacity(column_names.len());
        for (index, name) in column_names.iter().enumerate() {
            let value = row
                .get_ref(index)
                .map_err(|error| format!("database_select_value_failed:{error}"))?;
            object.insert(name.clone(), sqlite_value_to_json(value));
        }
        output.push(JsonValue::Object(object));
    }

    Ok(output)
}

pub(crate) fn execute_statement(
    connection: &Connection,
    query: &str,
    values: Vec<JsonValue>,
) -> Result<SqlExecuteResponse, String> {
    let sql = normalize_sql_placeholders(query);
    let params = json_values_to_sql(values)?;
    let rows_affected = if params.is_empty() {
        connection
            .execute_batch(&sql)
            .map_err(|error| format!("database_execute_failed:{error}"))?;
        0
    } else {
        let mut statement = connection
            .prepare(&sql)
            .map_err(|error| format!("database_execute_prepare_failed:{error}"))?;
        statement
            .execute(params_from_iter(params))
            .map_err(|error| format!("database_execute_failed:{error}"))?
    };

    Ok(SqlExecuteResponse {
        rows_affected,
        last_insert_id: connection.last_insert_rowid(),
    })
}

fn normalize_sql_placeholders(query: &str) -> String {
    let mut output = String::with_capacity(query.len());
    let mut chars = query.chars().peekable();
    let mut in_single_quote = false;

    while let Some(character) = chars.next() {
        if character == '\'' {
            output.push(character);
            if in_single_quote && chars.peek() == Some(&'\'') {
                if let Some(escaped) = chars.next() {
                    output.push(escaped);
                }
            } else {
                in_single_quote = !in_single_quote;
            }
            continue;
        }

        if !in_single_quote && character == '$' && chars.peek().is_some_and(char::is_ascii_digit) {
            output.push('?');
            while let Some(next) = chars.peek() {
                if next.is_ascii_digit() {
                    output.push(*next);
                    chars.next();
                } else {
                    break;
                }
            }
            continue;
        }

        output.push(character);
    }

    output
}

fn json_values_to_sql(values: Vec<JsonValue>) -> Result<Vec<SqlValue>, String> {
    values.into_iter().map(json_value_to_sql).collect()
}

fn json_value_to_sql(value: JsonValue) -> Result<SqlValue, String> {
    match value {
        JsonValue::Null => Ok(SqlValue::Null),
        JsonValue::Bool(value) => Ok(SqlValue::Integer(i64::from(value))),
        JsonValue::Number(value) => {
            if let Some(integer) = value.as_i64() {
                Ok(SqlValue::Integer(integer))
            } else if let Some(unsigned) = value.as_u64() {
                i64::try_from(unsigned)
                    .map(SqlValue::Integer)
                    .map_err(|_| "database_integer_out_of_range".to_string())
            } else if let Some(real) = value.as_f64() {
                Ok(SqlValue::Real(real))
            } else {
                Err("database_number_invalid".to_string())
            }
        }
        JsonValue::String(value) => Ok(SqlValue::Text(value)),
        JsonValue::Array(values) => json_array_to_blob(values).map(SqlValue::Blob),
        JsonValue::Object(mut object) => {
            if let Some(data) = object.remove("data") {
                if let JsonValue::Array(values) = data {
                    return json_array_to_blob(values).map(SqlValue::Blob);
                }
            }
            Ok(SqlValue::Text(JsonValue::Object(object).to_string()))
        }
    }
}

fn json_array_to_blob(values: Vec<JsonValue>) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::with_capacity(values.len());
    for value in values {
        let byte = value
            .as_u64()
            .ok_or_else(|| "database_blob_byte_invalid".to_string())?;
        if byte > 255 {
            return Err("database_blob_byte_invalid".to_string());
        }
        bytes.push(byte as u8);
    }
    Ok(bytes)
}

fn sqlite_value_to_json(value: ValueRef<'_>) -> JsonValue {
    match value {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(value) => JsonValue::Number(JsonNumber::from(value)),
        ValueRef::Real(value) => JsonNumber::from_f64(value)
            .map(JsonValue::Number)
            .unwrap_or(JsonValue::Null),
        ValueRef::Text(value) => JsonValue::String(String::from_utf8_lossy(value).to_string()),
        ValueRef::Blob(value) => JsonValue::Array(
            value
                .iter()
                .map(|byte| JsonValue::Number(JsonNumber::from(*byte)))
                .collect(),
        ),
    }
}
