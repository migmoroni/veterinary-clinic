#![cfg(unix)]

use serde_json::json;
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread,
    time::Duration,
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

#[test]
fn blocks_checks_for_a_tool_outside_its_version_requirement() {
    let temp = TempDir::new().unwrap();
    let tool = temp.path().join("fixture-tool");
    fs::write(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.2.3; else exit 0; fi\n",
    )
    .unwrap();
    let mut permissions = fs::metadata(&tool).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&tool, permissions).unwrap();
    let config_path = temp.path().join("config.json");
    let value = json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":4096,
        "tools":[{"id":"fixture", "program":tool, "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver", "versionRequirement":">=2.0.0"}],
        "checks":[{"id":"blocked", "label":"Blocked", "toolId":"fixture", "args":["run"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5}],
        "suites":[{"id":"all", "label":"All", "checks":["blocked"]}]
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

    assert_eq!(outcome.report.tools[0].status, Status::Blocked);
    assert_eq!(outcome.report.checks[0].status, Status::Blocked);
    assert_eq!(outcome.report.summary.result, OverallResult::Blocked);
    assert!(outcome.report.tools[0]
        .reason
        .as_deref()
        .is_some_and(|reason| reason.contains("does not satisfy")));
}

#[test]
fn single_check_includes_only_its_transitive_dependencies() {
    let temp = TempDir::new().unwrap();
    let config_path = temp.path().join("config.json");
    let value = json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":4096,
        "tools":[{"id":"rustc", "program":"rustc", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}],
        "checks":[
            {"id":"base", "label":"Base", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5},
            {"id":"target", "label":"Target", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":["base"], "timeoutSeconds":5},
            {"id":"unrelated", "label":"Unrelated", "toolId":"rustc", "args":["--version"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5}
        ],
        "suites":[{"id":"all", "label":"All", "checks":["base", "target", "unrelated"]}]
    });
    fs::write(&config_path, serde_json::to_vec(&value).unwrap()).unwrap();
    let loaded = config::load(Some(&config_path), temp.path()).unwrap();

    assert_eq!(
        runner::single_check(&loaded, "target").unwrap(),
        ("check:target".into(), vec!["base".into(), "target".into()])
    );
}

#[test]
fn interruption_stops_the_active_check_and_marks_the_run() {
    let temp = TempDir::new().unwrap();
    let tool = temp.path().join("slow-tool");
    fs::write(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.2.3; else sleep 5; fi\n",
    )
    .unwrap();
    let mut permissions = fs::metadata(&tool).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&tool, permissions).unwrap();
    let config_path = temp.path().join("config.json");
    let value = json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":4096,
        "tools":[{"id":"fixture", "program":tool, "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}],
        "checks":[{"id":"slow", "label":"Slow", "toolId":"fixture", "args":["run"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":10}],
        "suites":[{"id":"all", "label":"All", "checks":["slow"]}]
    });
    fs::write(&config_path, serde_json::to_vec(&value).unwrap()).unwrap();
    let loaded = config::load(Some(&config_path), temp.path()).unwrap();
    let (_, checks) = runner::suite_checks(&loaded, None).unwrap();
    let cancelled = Arc::new(AtomicBool::new(false));
    let signal = cancelled.clone();
    let trigger = thread::spawn(move || {
        thread::sleep(Duration::from_millis(100));
        signal.store(true, Ordering::SeqCst);
    });

    let outcome = runner::run(&loaded, "all".into(), checks, cancelled);
    trigger.join().unwrap();

    assert!(outcome.interrupted);
    assert_eq!(outcome.report.checks[0].status, Status::Fail);
    assert_eq!(
        outcome.report.checks[0].reason.as_deref(),
        Some("check interrupted")
    );
    assert!(outcome.report.duration_ms < 2_000);
}
