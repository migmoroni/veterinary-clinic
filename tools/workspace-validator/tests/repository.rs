#![cfg(unix)]

use serde_json::{json, Value};
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    path::Path,
    process::Command,
    sync::{atomic::AtomicBool, Arc},
};
use tempfile::TempDir;
use workspace_validator::{config, model::Status, runner};

fn initialize_git(path: &Path) {
    assert!(Command::new("git")
        .args(["init", "--quiet"])
        .current_dir(path)
        .status()
        .unwrap()
        .success());
}

fn executable(path: &Path, contents: &str) {
    fs::write(path, contents).unwrap();
    let mut permissions = fs::metadata(path).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).unwrap();
}

fn config_value(tool: &Path, output_limit: usize) -> Value {
    json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":output_limit,
        "repository":{"provider":"git", "toolId":"git", "detectMutations":true},
        "tools":[
            {"id":"git", "program":"git", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"},
            {"id":"fixture", "program":tool, "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}
        ],
        "checks":[{"id":"fixture.check", "label":"Fixture", "toolId":"fixture", "args":["run"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5}],
        "suites":[{"id":"all", "label":"All", "checks":["fixture.check"]}]
    })
}

fn run(temp: &TempDir, value: Value) -> runner::RunOutcome {
    let config_path = temp.path().join("config.json");
    fs::write(&config_path, serde_json::to_vec(&value).unwrap()).unwrap();
    let loaded = config::load(Some(&config_path), temp.path()).unwrap();
    let (_, checks) = runner::suite_checks(&loaded, None).unwrap();
    runner::run(
        &loaded,
        "all".into(),
        checks,
        Arc::new(AtomicBool::new(false)),
    )
}

fn integrity(outcome: &runner::RunOutcome) -> &workspace_validator::model::CheckResult {
    outcome
        .report
        .checks
        .iter()
        .find(|check| check.id == "repository.integrity")
        .unwrap()
}

#[test]
fn accepts_initial_dirt_and_fails_on_new_git_visible_path() {
    let temp = TempDir::new().unwrap();
    initialize_git(temp.path());
    fs::write(temp.path().join("initial-dirt"), "existing").unwrap();
    let tool = temp.path().join("mutator");
    executable(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.0.0; else touch introduced; fi\n",
    );

    let outcome = run(&temp, config_value(&tool, 4096));
    assert_eq!(integrity(&outcome).status, Status::Fail);
    let repository = outcome.report.repository.unwrap();
    assert!(repository
        .before
        .iter()
        .any(|entry| entry.contains("initial-dirt")));
    assert!(repository
        .introduced
        .iter()
        .any(|path| path == "introduced"));
}

#[test]
fn detects_changes_inside_already_dirty_tracked_and_untracked_files() {
    let temp = TempDir::new().unwrap();
    initialize_git(temp.path());
    let tracked = temp.path().join("tracked.txt");
    fs::write(&tracked, "staged\n").unwrap();
    assert!(Command::new("git")
        .args(["add", "tracked.txt"])
        .current_dir(temp.path())
        .status()
        .unwrap()
        .success());
    fs::write(&tracked, "staged\ndirty-before\n").unwrap();
    fs::write(temp.path().join("untracked.txt"), "dirty-before\n").unwrap();
    let tool = temp.path().join("mutator");
    executable(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.0.0; else printf 'changed\\n' >> tracked.txt; printf 'changed\\n' >> untracked.txt; fi\n",
    );

    let outcome = run(&temp, config_value(&tool, 4096));
    assert_eq!(integrity(&outcome).status, Status::Fail);
    let repository = outcome.report.repository.unwrap();
    assert!(repository.changed.iter().any(|path| path == "tracked.txt"));
    assert!(repository
        .changed
        .iter()
        .any(|path| path == "untracked.txt"));
}

#[test]
fn preserves_a_preexisting_rename_as_one_logical_entry() {
    let temp = TempDir::new().unwrap();
    initialize_git(temp.path());
    fs::write(temp.path().join("original.txt"), "content\n").unwrap();
    assert!(Command::new("git")
        .args(["add", "original.txt"])
        .current_dir(temp.path())
        .status()
        .unwrap()
        .success());
    assert!(Command::new("git")
        .args([
            "-c",
            "user.name=Workspace Validator",
            "-c",
            "user.email=validator@example.invalid",
            "commit",
            "--quiet",
            "-m",
            "fixture",
        ])
        .current_dir(temp.path())
        .status()
        .unwrap()
        .success());
    assert!(Command::new("git")
        .args(["mv", "original.txt", "renamed.txt"])
        .current_dir(temp.path())
        .status()
        .unwrap()
        .success());
    let tool = temp.path().join("noop");
    executable(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.0.0; fi\n",
    );

    let outcome = run(&temp, config_value(&tool, 4096));
    assert_eq!(integrity(&outcome).status, Status::Pass);
    let repository = outcome.report.repository.unwrap();
    assert!(repository
        .before
        .iter()
        .any(|entry| entry == "R  original.txt -> renamed.txt"));
    assert!(!repository
        .before
        .iter()
        .any(|entry| entry == "original.txt"));
}

#[test]
fn blocks_repository_integrity_when_status_output_is_truncated() {
    let temp = TempDir::new().unwrap();
    initialize_git(temp.path());
    let tool = temp.path().join("noop");
    executable(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.0.0; fi\n",
    );
    for index in 0..64 {
        let name = format!("{index:03}-{}.txt", "x".repeat(100));
        fs::write(temp.path().join(name), "content").unwrap();
    }

    let outcome = run(&temp, config_value(&tool, 4096));
    let integrity = integrity(&outcome);
    assert_eq!(integrity.status, Status::Blocked);
    assert!(integrity
        .reason
        .as_deref()
        .is_some_and(|reason| reason.contains("exceeds outputLimitBytes")));
    assert!(outcome.report.repository.is_none());
}
