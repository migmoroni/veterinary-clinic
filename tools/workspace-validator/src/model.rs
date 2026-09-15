use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf};

pub const CONFIG_SCHEMA_VERSION: u32 = 1;
pub const REPORT_SCHEMA_VERSION: u32 = 1;
const ID_PATTERN: &str = r"^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$";

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
    #[serde(rename = "$schema", default)]
    pub schema: Option<String>,
    #[schemars(range(min = 1, max = 1))]
    pub schema_version: u32,
    pub workspace_root: PathBuf,
    #[schemars(regex(pattern = ID_PATTERN))]
    pub default_suite: String,
    #[schemars(range(min = 4096, max = 16_777_216))]
    pub output_limit_bytes: usize,
    #[serde(default)]
    pub repository: Option<RepositoryConfig>,
    pub tools: Vec<ToolConfig>,
    pub checks: Vec<CheckConfig>,
    pub suites: Vec<SuiteConfig>,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RepositoryConfig {
    pub provider: RepositoryProvider,
    #[schemars(regex(pattern = ID_PATTERN))]
    pub tool_id: String,
    pub detect_mutations: bool,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum RepositoryProvider {
    Git,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ToolConfig {
    #[schemars(length(min = 1, max = 96), regex(pattern = ID_PATTERN))]
    pub id: String,
    #[schemars(length(min = 1), regex(pattern = r"^[^\u0000]*$"))]
    pub program: String,
    #[schemars(inner(regex(pattern = ID_PATTERN)))]
    pub requires_tools: Vec<String>,
    #[schemars(inner(regex(pattern = r"^[^\u0000]*$")))]
    pub version_args: Vec<String>,
    pub version_parser: VersionParser,
    #[serde(default)]
    pub version_requirement: Option<String>,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum VersionParser {
    FirstSemver,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CheckConfig {
    #[schemars(length(min = 1, max = 96), regex(pattern = ID_PATTERN))]
    pub id: String,
    #[schemars(regex(pattern = r"\S"))]
    pub label: String,
    #[schemars(regex(pattern = ID_PATTERN))]
    pub tool_id: String,
    #[schemars(inner(regex(pattern = r"^[^\u0000]*$")))]
    pub args: Vec<String>,
    pub working_directory: PathBuf,
    #[schemars(inner(regex(pattern = ID_PATTERN)))]
    pub requires_tools: Vec<String>,
    #[schemars(inner(regex(pattern = ID_PATTERN)))]
    pub depends_on: Vec<String>,
    #[schemars(range(min = 1, max = 86_400))]
    pub timeout_seconds: u64,
}

#[derive(Clone, Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SuiteConfig {
    #[schemars(length(min = 1, max = 96), regex(pattern = ID_PATTERN))]
    pub id: String,
    #[schemars(regex(pattern = r"\S"))]
    pub label: String,
    #[schemars(length(min = 1), inner(regex(pattern = ID_PATTERN)))]
    pub checks: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Serialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Pass,
    Fail,
    Blocked,
    Skipped,
}

#[derive(Clone, Debug, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ToolResult {
    pub id: String,
    pub program: String,
    pub argv: Vec<String>,
    pub status: Status,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
    pub id: String,
    pub label: String,
    pub argv: Vec<String>,
    pub working_directory: String,
    pub status: Status,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub timeout_seconds: u64,
    pub timed_out: bool,
    pub stdout_truncated: bool,
    pub stderr_truncated: bool,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub stdout: String,
    #[serde(skip_serializing_if = "String::is_empty")]
    pub stderr: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Default, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryReport {
    pub before: Vec<String>,
    pub after: Vec<String>,
    pub introduced: Vec<String>,
    pub removed: Vec<String>,
    pub changed: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum OverallResult {
    Pass,
    Fail,
    Blocked,
}

#[derive(Clone, Debug, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub pass: usize,
    pub fail: usize,
    pub blocked: usize,
    pub skipped: usize,
    pub result: OverallResult,
}

#[derive(Clone, Debug, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ValidationReport {
    pub schema_version: u32,
    pub suite: String,
    pub workspace_root: String,
    pub started_at_unix_ms: u64,
    pub duration_ms: u64,
    pub tools: Vec<ToolResult>,
    pub checks: Vec<CheckResult>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repository: Option<RepositoryReport>,
    pub summary: Summary,
}

impl Summary {
    pub fn from_checks(checks: &[CheckResult]) -> Self {
        let mut counts = BTreeMap::from([
            (Status::Pass, 0),
            (Status::Fail, 0),
            (Status::Blocked, 0),
            (Status::Skipped, 0),
        ]);
        for check in checks {
            *counts.get_mut(&check.status).expect("all statuses exist") += 1;
        }
        let fail = counts[&Status::Fail];
        let blocked = counts[&Status::Blocked];
        let skipped = counts[&Status::Skipped];
        Self {
            pass: counts[&Status::Pass],
            fail,
            blocked,
            skipped,
            result: if fail > 0 {
                OverallResult::Fail
            } else if blocked > 0 || skipped > 0 {
                OverallResult::Blocked
            } else {
                OverallResult::Pass
            },
        }
    }

    pub fn exit_code(&self) -> i32 {
        match self.result {
            OverallResult::Pass => 0,
            OverallResult::Fail => 1,
            OverallResult::Blocked => 2,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn result(status: Status) -> CheckResult {
        CheckResult {
            id: "check".into(),
            label: "Check".into(),
            argv: vec![],
            working_directory: "/tmp".into(),
            status,
            exit_code: None,
            duration_ms: 0,
            timeout_seconds: 1,
            timed_out: false,
            stdout_truncated: false,
            stderr_truncated: false,
            stdout: String::new(),
            stderr: String::new(),
            reason: None,
        }
    }

    #[test]
    fn failure_has_precedence_over_blocked() {
        let summary = Summary::from_checks(&[result(Status::Blocked), result(Status::Fail)]);
        assert_eq!(summary.result, OverallResult::Fail);
        assert_eq!(summary.exit_code(), 1);
    }
}
