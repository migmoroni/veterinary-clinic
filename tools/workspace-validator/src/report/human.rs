use super::format_duration;
use crate::model::{OverallResult, Status, ValidationReport};
use std::fmt::Write;

pub fn render(report: &ValidationReport) -> String {
    let mut output = String::new();
    let _ = writeln!(output, "Workspace Validator");
    let _ = writeln!(output, "Suite:      {}", report.suite);
    let _ = writeln!(output, "Workspace:  {}", report.workspace_root);
    let _ = writeln!(
        output,
        "Duration:   {}",
        format_duration(report.duration_ms)
    );
    let _ = writeln!(output, "\nTools");
    for tool in &report.tools {
        let _ = writeln!(
            output,
            "  {:<7} {:<16}{}",
            status(tool.status),
            tool.id,
            tool.version
                .as_ref()
                .map(|version| format!(" {version}"))
                .unwrap_or_default()
        );
        if let Some(reason) = &tool.reason {
            let _ = writeln!(output, "          {reason}");
        }
    }
    let _ = writeln!(output, "\nChecks");
    for desired in [Status::Fail, Status::Blocked, Status::Skipped, Status::Pass] {
        for check in report.checks.iter().filter(|check| check.status == desired) {
            let _ = writeln!(
                output,
                "  {:<7} {} [{}] ({})",
                status(check.status),
                check.label,
                check.id,
                format_duration(check.duration_ms)
            );
            if check.status != Status::Pass {
                let _ = writeln!(
                    output,
                    "          Command: {}",
                    shell_free_command(&check.argv)
                );
                if let Some(reason) = &check.reason {
                    let _ = writeln!(output, "          Reason: {reason}");
                }
                excerpt(&mut output, "stdout", &check.stdout, check.stdout_truncated);
                excerpt(&mut output, "stderr", &check.stderr, check.stderr_truncated);
            }
        }
    }
    if let Some(repository) = &report.repository {
        if !(repository.introduced.is_empty()
            && repository.removed.is_empty()
            && repository.changed.is_empty())
        {
            let _ = writeln!(output, "\nRepository changes");
            for entry in &repository.introduced {
                let _ = writeln!(output, "  + {entry}");
            }
            for entry in &repository.removed {
                let _ = writeln!(output, "  - {entry}");
            }
            for entry in &repository.changed {
                let _ = writeln!(output, "  ~ {entry}");
            }
        }
    }
    let summary = &report.summary;
    let _ = writeln!(output, "\nSummary");
    let _ = writeln!(
        output,
        "  PASS {} | FAIL {} | BLOCKED {} | SKIPPED {}",
        summary.pass, summary.fail, summary.blocked, summary.skipped
    );
    let _ = writeln!(output, "  Result: {}", result(summary.result));
    output.pop();
    output
}

fn status(status: Status) -> &'static str {
    match status {
        Status::Pass => "PASS",
        Status::Fail => "FAIL",
        Status::Blocked => "BLOCKED",
        Status::Skipped => "SKIPPED",
    }
}

fn result(result: OverallResult) -> &'static str {
    match result {
        OverallResult::Pass => "PASS",
        OverallResult::Fail => "FAIL",
        OverallResult::Blocked => "BLOCKED",
    }
}

fn shell_free_command(argv: &[String]) -> String {
    argv.iter()
        .map(|arg| format!("{arg:?}"))
        .collect::<Vec<_>>()
        .join(" ")
}

fn excerpt(output: &mut String, name: &str, value: &str, truncated: bool) {
    if value.trim().is_empty() {
        return;
    }
    let value = if value.len() > 4000 {
        let start = value
            .char_indices()
            .map(|(index, _)| index)
            .find(|index| value.len() - index <= 4000)
            .unwrap_or(0);
        &value[start..]
    } else {
        value
    };
    let marker = if truncated { " (tail, truncated)" } else { "" };
    let _ = writeln!(output, "          {name}{marker}:\n{}", value.trim_end());
}
