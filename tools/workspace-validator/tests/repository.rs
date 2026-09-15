#![cfg(unix)]

use serde_json::json;
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    process::Command,
    sync::{atomic::AtomicBool, Arc},
};
use tempfile::TempDir;
use workspace_validator::{config, model::Status, runner};

#[test]
fn accepts_initial_dirt_and_fails_on_new_git_visible_mutation() {
    let temp = TempDir::new().unwrap();
    assert!(Command::new("git")
        .args(["init", "--quiet"])
        .current_dir(temp.path())
        .status()
        .unwrap()
        .success());
    fs::write(temp.path().join("initial-dirt"), "existing").unwrap();
    let tool = temp.path().join("mutator");
    fs::write(
        &tool,
        "#!/bin/sh\nif [ \"$1\" = --version ]; then echo 1.0.0; else touch introduced; fi\n",
    )
    .unwrap();
    let mut permissions = fs::metadata(&tool).unwrap().permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(&tool, permissions).unwrap();
    let config_path = temp.path().join("config.json");
    let value = json!({
        "schemaVersion":1, "workspaceRoot":".", "defaultSuite":"all", "outputLimitBytes":4096,
        "repository":{"provider":"git", "toolId":"git", "detectMutations":true},
        "tools":[
            {"id":"git", "program":"git", "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"},
            {"id":"mutator", "program":tool, "requiresTools":[], "versionArgs":["--version"], "versionParser":"firstSemver"}
        ],
        "checks":[{"id":"mutate", "label":"Mutate", "toolId":"mutator", "args":["run"], "workingDirectory":".", "requiresTools":[], "dependsOn":[], "timeoutSeconds":5}],
        "suites":[{"id":"all", "label":"All", "checks":["mutate"]}]
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
    let integrity = outcome
        .report
        .checks
        .iter()
        .find(|check| check.id == "repository.integrity")
        .unwrap();
    assert_eq!(integrity.status, Status::Fail);
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
