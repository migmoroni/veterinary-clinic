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
fn rejects_invalid_ids() {
    let temp = TempDir::new().unwrap();
    let mut value = valid_config();
    value["checks"][0]["id"] = json!("Bad");
    value["suites"][0]["checks"] = json!(["Bad"]);
    assert!(config::load(Some(&write(&temp, &value)), temp.path()).is_err());
}

#[test]
fn rejects_check_and_tool_cycles() {
    let temp = TempDir::new().unwrap();
    let mut checks = valid_config();
    checks["checks"] = json!([
        {"id":"check.one", "label":"One", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":["check.two"], "timeoutSeconds":10},
        {"id":"check.two", "label":"Two", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":["check.one"], "timeoutSeconds":10}
    ]);
    checks["suites"][0]["checks"] = json!(["check.one", "check.two"]);
    assert!(config::load(Some(&write(&temp, &checks)), temp.path()).is_err());

    let mut tools = valid_config();
    tools["tools"] = json!([
        {"id":"rustc", "program":"rustc", "requiresTools":["cargo"], "versionArgs":["--version"], "versionParser":"firstSemver"},
        {"id":"cargo", "program":"cargo", "requiresTools":["rustc"], "versionArgs":["--version"], "versionParser":"firstSemver"}
    ]);
    assert!(config::load(Some(&write(&temp, &tools)), temp.path()).is_err());
}

#[test]
fn rejects_numeric_bounds_and_duplicate_ids() {
    let temp = TempDir::new().unwrap();
    let mut output_limit = valid_config();
    output_limit["outputLimitBytes"] = json!(0);
    assert!(config::load(Some(&write(&temp, &output_limit)), temp.path()).is_err());

    let mut timeout = valid_config();
    timeout["checks"][0]["timeoutSeconds"] = json!(0);
    assert!(config::load(Some(&write(&temp, &timeout)), temp.path()).is_err());

    let mut duplicate = valid_config();
    duplicate["checks"] = json!([
        duplicate["checks"][0].clone(),
        duplicate["checks"][0].clone()
    ]);
    assert!(config::load(Some(&write(&temp, &duplicate)), temp.path()).is_err());
}
