#![cfg(unix)]

use serde_json::json;
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    sync::{atomic::AtomicBool, Arc},
};
use tempfile::TempDir;
use workspace_validator::{
    config,
    model::{OverallResult, Status},
    runner,
};

#[test]
fn continues_independent_checks_and_preserves_failure_precedence() {
    let temp = TempDir::new().unwrap();
    let tool = temp.path().join("fixture-tool");
    fs::write(&tool, "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.2.3; elif [ \"$1\" = fail ]; then exit 7; else echo independent; fi\n").unwrap();
    let mut permissions = fs::metadata(&tool).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&tool, permissions).unwrap();
    let config_path = temp.path().join("config.json");
    let value = json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":4096,
        "tools":[
            {"id":"fixture", "program":tool, "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"},
            {"id":"missing", "program":"definitely-not-a-real-validator-tool", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}
        ],
        "checks":[
            {"id":"first.fail", "label":"Fail", "toolId":"fixture", "args":["fail"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5},
            {"id":"dependent", "label":"Dependent", "toolId":"fixture", "args":["pass"], "workingDirectory":".", "requiresTools":[], "dependsOn":["first.fail"], "timeoutSeconds":5},
            {"id":"independent", "label":"Independent", "toolId":"fixture", "args":["pass"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5},
            {"id":"blocked", "label":"Blocked", "toolId":"missing", "args":[], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5}
        ],
        "suites":[{"id":"all", "label":"All", "checks":["first.fail", "dependent", "independent", "blocked"]}]
    });
    fs::write(&config_path, serde_json::to_vec(&value).unwrap()).unwrap();
    let loaded = config::load(Some(&config_path), temp.path()).unwrap();
    let (_, checks) = runner::suite_checks(&loaded, None).unwrap();
    let outcome = runner::run(
        &loaded,
        "all".into(),
        checks,
        Arc::new(AtomicBool::new(false)),
    );
    let statuses: Vec<_> = outcome
        .report
        .checks
        .iter()
        .map(|check| check.status)
        .collect();
    assert_eq!(
        statuses,
        [Status::Fail, Status::Skipped, Status::Pass, Status::Blocked]
    );
    assert_eq!(outcome.report.summary.result, OverallResult::Fail);
    assert_eq!(outcome.report.summary.exit_code(), 1);
}
