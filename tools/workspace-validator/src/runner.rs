use crate::{
    config::{resolve_working_directory, LoadedConfig},
    graph::dependency_order,
    model::{
        CheckResult, RepositoryReport, Status, Summary, ValidationReport, REPORT_SCHEMA_VERSION,
    },
    prerequisites, process, repository,
};
use std::{
    collections::BTreeMap,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

pub struct RunOutcome {
    pub report: ValidationReport,
    pub interrupted: bool,
}

pub fn suite_checks(
    loaded: &LoadedConfig,
    suite: Option<&str>,
) -> Result<(String, Vec<String>), String> {
    let id = suite.unwrap_or(&loaded.config.default_suite);
    loaded
        .suites
        .get(id)
        .map(|suite| (id.to_string(), suite.checks.clone()))
        .ok_or_else(|| format!("suite {id} does not exist"))
}

pub fn single_check(loaded: &LoadedConfig, id: &str) -> Result<(String, Vec<String>), String> {
    if !loaded.checks.contains_key(id) {
        return Err(format!("check {id} does not exist"));
    }
    let graph = loaded
        .checks
        .iter()
        .map(|(id, check)| (id.clone(), check.depends_on.clone()))
        .collect();
    Ok((format!("check:{id}"), dependency_order(id, &graph)))
}

pub fn run(
    loaded: &LoadedConfig,
    suite: String,
    check_ids: Vec<String>,
    cancelled: Arc<AtomicBool>,
) -> RunOutcome {
    let started = Instant::now();
    let started_at_unix_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    let tools = prerequisites::check_tools(loaded, &check_ids, &cancelled);
    let tool_status: BTreeMap<_, _> = tools
        .iter()
        .map(|tool| (tool.id.clone(), tool.status))
        .collect();
    let repository_tool_ready = loaded
        .config
        .repository
        .as_ref()
        .is_some_and(|repository| tool_status.get(&repository.tool_id) == Some(&Status::Pass));
    let before = if loaded.config.repository.is_some() && repository_tool_ready {
        repository::snapshot(loaded, &cancelled)
    } else {
        Err("repository tool is unavailable".into())
    };
    let mut statuses = BTreeMap::new();
    let mut checks = Vec::new();
    for id in &check_ids {
        let check = &loaded.checks[id];
        let cwd = resolve_working_directory(loaded, check);
        let argv = std::iter::once(loaded.tools[&check.tool_id].program.clone())
            .chain(check.args.clone())
            .collect();
        let dependency = check
            .depends_on
            .iter()
            .find(|dependency| statuses.get(*dependency) != Some(&Status::Pass));
        let unavailable_tool = std::iter::once(&check.tool_id)
            .chain(&check.requires_tools)
            .find(|tool| tool_status.get(*tool) != Some(&Status::Pass));
        let result = if let Some(dependency) = dependency {
            blocked_result(
                check,
                argv,
                &cwd,
                Status::Skipped,
                format!("dependency {dependency} did not pass"),
            )
        } else if let Some(tool) = unavailable_tool {
            blocked_result(
                check,
                argv,
                &cwd,
                Status::Blocked,
                format!("required tool {tool} is unavailable"),
            )
        } else if cancelled.load(Ordering::SeqCst) {
            blocked_result(
                check,
                argv,
                &cwd,
                Status::Skipped,
                "execution interrupted".into(),
            )
        } else {
            let output = process::run(
                &loaded.tools[&check.tool_id].program,
                &check.args,
                &cwd,
                Duration::from_secs(check.timeout_seconds),
                loaded.config.output_limit_bytes,
                &cancelled,
            );
            let reason = output
                .start_error
                .clone()
                .or_else(|| output.timed_out.then(|| "check timed out".into()))
                .or_else(|| output.interrupted.then(|| "check interrupted".into()));
            let status = if output.exit_code == Some(0) && reason.is_none() {
                Status::Pass
            } else {
                Status::Fail
            };
            CheckResult {
                id: id.clone(),
                label: check.label.clone(),
                argv,
                working_directory: cwd.display().to_string(),
                status,
                exit_code: output.exit_code,
                duration_ms: output.duration_ms,
                timeout_seconds: check.timeout_seconds,
                timed_out: output.timed_out,
                stdout_truncated: output.stdout_truncated,
                stderr_truncated: output.stderr_truncated,
                stdout: output.stdout,
                stderr: output.stderr,
                reason,
            }
        };
        statuses.insert(id.clone(), result.status);
        checks.push(result);
    }
    let mut repository_report = None;
    if loaded.config.repository.is_some() {
        let after = if repository_tool_ready {
            repository::snapshot(loaded, &cancelled)
        } else {
            Err("repository tool is unavailable".into())
        };
        let (status, reason) = match (&before, &after) {
            (Ok(before), Ok(after)) => {
                let (introduced, removed, changed) = repository::compare(before, after);
                let mutated = loaded
                    .config
                    .repository
                    .as_ref()
                    .is_some_and(|repo| repo.detect_mutations)
                    && !(introduced.is_empty() && removed.is_empty() && changed.is_empty());
                repository_report = Some(RepositoryReport {
                    before: before.clone(),
                    after: after.clone(),
                    introduced,
                    removed,
                    changed,
                });
                if mutated {
                    (
                        Status::Fail,
                        Some("validation changed Git-visible workspace state".into()),
                    )
                } else {
                    (Status::Pass, None)
                }
            }
            (Err(reason), _) | (_, Err(reason)) => (Status::Blocked, Some(reason.clone())),
        };
        checks.push(CheckResult {
            id: "repository.integrity".into(),
            label: "Integridade do repositório".into(),
            argv: vec![
                loaded
                    .config
                    .repository
                    .as_ref()
                    .map(|repo| loaded.tools[&repo.tool_id].program.clone())
                    .unwrap_or_default(),
                "status".into(),
                "--porcelain=v1".into(),
                "-z".into(),
            ],
            working_directory: loaded.workspace_root.display().to_string(),
            status,
            exit_code: None,
            duration_ms: 0,
            timeout_seconds: 120,
            timed_out: false,
            stdout_truncated: false,
            stderr_truncated: false,
            stdout: String::new(),
            stderr: String::new(),
            reason,
        });
    }
    let summary = Summary::from_checks(&checks);
    RunOutcome {
        interrupted: cancelled.load(Ordering::SeqCst),
        report: ValidationReport {
            schema_version: REPORT_SCHEMA_VERSION,
            suite,
            workspace_root: loaded.workspace_root.display().to_string(),
            started_at_unix_ms,
            duration_ms: started.elapsed().as_millis() as u64,
            tools,
            checks,
            repository: repository_report,
            summary,
        },
    }
}

fn blocked_result(
    check: &crate::model::CheckConfig,
    argv: Vec<String>,
    cwd: &std::path::Path,
    status: Status,
    reason: String,
) -> CheckResult {
    CheckResult {
        id: check.id.clone(),
        label: check.label.clone(),
        argv,
        working_directory: cwd.display().to_string(),
        status,
        exit_code: None,
        duration_ms: 0,
        timeout_seconds: check.timeout_seconds,
        timed_out: false,
        stdout_truncated: false,
        stderr_truncated: false,
        stdout: String::new(),
        stderr: String::new(),
        reason: Some(reason),
    }
}
