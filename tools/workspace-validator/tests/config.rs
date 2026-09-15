use serde_json::{json, Value};
use std::fs;
use tempfile::TempDir;
use workspace_validator::config;

fn valid_config() -> Value {
    json!({
        "schemaVersion": 1, "workspaceRoot": ".", "defaultSuite": "all", "outputLimitBytes": 4096,
        "tools": [{"id":"rustc", "program":"rustc", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}],
        "checks": [{"id":"check.one", "label":"One", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":10}],
        "suites": [{"id":"all", "label":"All", "checks":["check.one"]}]
    })
}

fn write(temp: &TempDir, value: &Value) -> std::path::PathBuf {
    let path = temp.path().join("config.json");
    fs::write(&path, serde_json::to_vec(value).unwrap()).unwrap();
    path
}

#[test]
fn loads_strict_valid_configuration() {
    let temp = TempDir::new().unwrap();
    let path = write(&temp, &valid_config());
    assert_eq!(
        config::load(Some(&path), temp.path())
            .unwrap()
            .workspace_root,
        temp.path().canonicalize().unwrap()
    );
}

#[test]
fn rejects_unknown_property_and_workspace_escape() {
    let temp = TempDir::new().unwrap();
    let mut unknown = valid_config();
    unknown["unexpected"] = json!(true);
    assert!(config::load(Some(&write(&temp, &unknown)), temp.path()).is_err());
    let mut escaped = valid_config();
    escaped["checks"][0]["workingDirectory"] = json!("..");
    assert!(config::load(Some(&write(&temp, &escaped)), temp.path()).is_err());
}

#[test]
fn rejects_cycles_and_invalid_ids() {
    let temp = TempDir::new().unwrap();
    let mut value = valid_config();
    value["checks"][0]["id"] = json!("Bad");
    value["suites"][0]["checks"] = json!(["Bad"]);
    assert!(config::load(Some(&write(&temp, &value)), temp.path()).is_err());
}
