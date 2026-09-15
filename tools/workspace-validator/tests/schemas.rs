use schemars::schema_for;
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
