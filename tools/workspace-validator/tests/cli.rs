use serde_json::{json, Value};
use std::{fs, process::Command};
use tempfile::TempDir;

#[test]
fn runs_portably_and_discovers_configuration_from_a_child_directory() {
    let temp = TempDir::new().unwrap();
    let validation = temp.path().join(".validation");
    let child = temp.path().join("nested/child");
    fs::create_dir_all(&validation).unwrap();
    fs::create_dir_all(&child).unwrap();
    let config = json!({
        "schemaVersion":1, "workspaceRoot":"..", "defaultSuite":"all", "outputLimitBytes":4096,
        "tools":[{"id":"rustc", "program":"rustc", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}],
        "checks":[{"id":"portable.check", "label":"Portable", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":10}],
        "suites":[{"id":"all", "label":"All", "checks":["portable.check"]}]
    });
    fs::write(
        validation.join("config.json"),
        serde_json::to_vec(&config).unwrap(),
    )
    .unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_workspace-validator"))
        .args(["validate", "--format", "json"])
        .current_dir(child)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(report["summary"]["result"], "pass");
    assert_eq!(report["checks"][0]["id"], "portable.check");
}

#[test]
fn invalid_usage_returns_three() {
    let status = Command::new(env!("CARGO_BIN_EXE_workspace-validator"))
        .arg("unknown")
        .status()
        .unwrap();
    assert_eq!(status.code(), Some(3));
}
