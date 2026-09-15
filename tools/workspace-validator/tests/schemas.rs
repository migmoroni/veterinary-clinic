use schemars::schema_for;
use serde_json::json;
use workspace_validator::model::{Config, ValidationReport};

#[test]
fn checked_in_schemas_match_rust_contracts() {
    let config = serde_json::to_value(schema_for!(Config)).unwrap();
    let report = serde_json::to_value(schema_for!(ValidationReport)).unwrap();
    assert_eq!(
        config,
        serde_json::from_str::<serde_json::Value>(include_str!("../schemas/config.schema.json"))
            .unwrap()
    );
    assert_eq!(
        report,
        serde_json::from_str::<serde_json::Value>(include_str!("../schemas/report.schema.json"))
            .unwrap()
    );
}

#[test]
fn config_schema_exposes_runtime_bounds_and_id_contracts() {
    let schema = serde_json::to_value(schema_for!(Config)).unwrap();
    assert_eq!(
        schema.pointer("/properties/schemaVersion/minimum"),
        Some(&json!(1))
    );
    assert_eq!(
        schema.pointer("/properties/schemaVersion/maximum"),
        Some(&json!(1))
    );
    assert_eq!(
        schema.pointer("/properties/outputLimitBytes/minimum"),
        Some(&json!(4096))
    );
    assert_eq!(
        schema.pointer("/properties/outputLimitBytes/maximum"),
        Some(&json!(16_777_216))
    );
    assert_eq!(
        schema.pointer("/$defs/CheckConfig/properties/timeoutSeconds/minimum"),
        Some(&json!(1))
    );
    assert_eq!(
        schema.pointer("/$defs/CheckConfig/properties/timeoutSeconds/maximum"),
        Some(&json!(86_400))
    );
    assert_eq!(
        schema.pointer("/$defs/SuiteConfig/properties/checks/minItems"),
        Some(&json!(1))
    );
    assert_eq!(
        schema.pointer("/$defs/CheckConfig/properties/id/pattern"),
        Some(&json!(r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$"))
    );
    assert_eq!(
        schema.pointer("/$defs/CheckConfig/properties/label/pattern"),
        Some(&json!(r"\S"))
    );
    assert_eq!(
        schema.pointer("/$defs/CheckConfig/properties/args/items/pattern"),
        Some(&json!(r"^[^\u0000]*$"))
    );
}
