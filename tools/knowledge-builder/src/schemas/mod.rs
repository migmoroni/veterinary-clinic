use jsonschema::{Draft, Validator};
use serde::Serialize;
use serde_json::Value;
use std::path::Path;

const COMMON: &str = include_str!("../../schemas/source/common.schema.json");

fn source_schema(entity_type: &str) -> Option<&'static str> {
    match entity_type {
        "active_ingredient" => Some(include_str!(
            "../../schemas/source/active_ingredient.schema.json"
        )),
        "breed" => Some(include_str!("../../schemas/source/breed.schema.json")),
        "condition" => Some(include_str!("../../schemas/source/condition.schema.json")),
        "geo_place" => Some(include_str!("../../schemas/source/geo_place.schema.json")),
        "manufacturer" => Some(include_str!(
            "../../schemas/source/manufacturer.schema.json"
        )),
        "product" => Some(include_str!("../../schemas/source/product.schema.json")),
        "taxonomy" => Some(include_str!("../../schemas/source/taxonomy.schema.json")),
        "treatment_protocol" => Some(include_str!(
            "../../schemas/source/treatment_protocol.schema.json"
        )),
        _ => None,
    }
}

fn parse_schema(name: &str, source: &str) -> Result<Value, String> {
    serde_json::from_str(source).map_err(|error| format!("invalid embedded schema {name}: {error}"))
}

fn compile(name: &str, schema: &Value) -> Result<Validator, String> {
    jsonschema::options()
        .with_draft(Draft::Draft202012)
        .should_validate_formats(true)
        .build(schema)
        .map_err(|error| format!("cannot compile embedded schema {name}: {error}"))
}

fn inline_common(mut schema: Value) -> Result<Value, String> {
    let common = parse_schema("common.schema.json", COMMON)?;
    let definitions = common
        .get("$defs")
        .cloned()
        .ok_or_else(|| "common.schema.json has no $defs".to_string())?;
    schema
        .as_object_mut()
        .ok_or_else(|| "source schema root must be an object".to_string())?
        .insert("$defs".to_string(), definitions);
    rewrite_local_references(&mut schema);
    Ok(schema)
}

fn rewrite_local_references(value: &mut Value) {
    match value {
        Value::String(text) if text.starts_with("common.schema.json#/$defs/") => {
            *text = text.replacen("common.schema.json#", "#", 1);
        }
        Value::Array(values) => values.iter_mut().for_each(rewrite_local_references),
        Value::Object(values) => values.values_mut().for_each(rewrite_local_references),
        _ => {}
    }
}

fn validate_value(name: &str, schema: Value, instance: &Value) -> Result<(), String> {
    let validator = compile(name, &schema)?;
    let errors = validator
        .iter_errors(instance)
        .map(|error| format!("{}: {}", error.instance_path, error))
        .collect::<Vec<_>>();
    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!("{name} schema violation: {}", errors.join("; ")))
    }
}

pub(crate) fn validate_source_value(path: &Path, value: &Value) -> Result<(), String> {
    let entity_type = value
        .get("entityType")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{}: entityType is required", path.display()))?;
    let source = source_schema(entity_type)
        .ok_or_else(|| format!("{}: unsupported entityType {entity_type}", path.display()))?;
    let schema = inline_common(parse_schema(entity_type, source)?)?;
    validate_value(entity_type, schema, value)
        .map_err(|error| format!("{}: {error}", path.display()))
}

pub(crate) fn validate_content<T: Serialize>(value: &T) -> Result<(), String> {
    validate_serialized(
        "content-document.schema.json",
        include_str!("../../schemas/system/content-document.schema.json"),
        value,
    )
}

pub(crate) fn validate_projection_report<T: Serialize>(value: &T) -> Result<(), String> {
    validate_serialized(
        "projection-report.schema.json",
        include_str!("../../schemas/projection-report.schema.json"),
        value,
    )
}

pub(crate) fn validate_build_result<T: Serialize>(value: &T) -> Result<(), String> {
    validate_serialized(
        "build-result.schema.json",
        include_str!("../../schemas/build-result.schema.json"),
        value,
    )
}

fn validate_serialized<T: Serialize>(name: &str, schema: &str, value: &T) -> Result<(), String> {
    let instance = serde_json::to_value(value)
        .map_err(|error| format!("cannot serialize value for {name}: {error}"))?;
    validate_value(name, parse_schema(name, schema)?, &instance)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_embedded_schemas_compile_without_retrieval() {
        compile("common", &parse_schema("common", COMMON).unwrap()).unwrap();
        for entity_type in [
            "active_ingredient",
            "breed",
            "condition",
            "geo_place",
            "manufacturer",
            "product",
            "taxonomy",
            "treatment_protocol",
        ] {
            let schema = parse_schema(entity_type, source_schema(entity_type).unwrap()).unwrap();
            compile(entity_type, &inline_common(schema).unwrap()).unwrap();
        }
        compile(
            "content",
            &parse_schema(
                "content",
                include_str!("../../schemas/system/content-document.schema.json"),
            )
            .unwrap(),
        )
        .unwrap();
        compile(
            "report",
            &parse_schema(
                "report",
                include_str!("../../schemas/projection-report.schema.json"),
            )
            .unwrap(),
        )
        .unwrap();
        compile(
            "result",
            &parse_schema(
                "result",
                include_str!("../../schemas/build-result.schema.json"),
            )
            .unwrap(),
        )
        .unwrap();
    }
}
