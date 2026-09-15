use crate::{
    error::ValidatorError,
    graph::validate_graph,
    model::{CheckConfig, Config, SuiteConfig, ToolConfig, CONFIG_SCHEMA_VERSION},
};
use semver::VersionReq;
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

#[derive(Debug)]
pub struct LoadedConfig {
    pub config: Config,
    pub path: PathBuf,
    pub workspace_root: PathBuf,
    pub tools: BTreeMap<String, ToolConfig>,
    pub checks: BTreeMap<String, CheckConfig>,
    pub suites: BTreeMap<String, SuiteConfig>,
}

pub fn discover(start: &Path) -> Result<PathBuf, ValidatorError> {
    let start = start
        .canonicalize()
        .map_err(|error| ValidatorError::Internal(error.to_string()))?;
    for directory in start.ancestors() {
        let candidate = directory.join(".validation/config.json");
        if candidate.exists() {
            return require_regular_file(&candidate);
        }
    }
    Err(ValidatorError::ConfigNotFound(start))
}

pub fn load(explicit: Option<&Path>, current: &Path) -> Result<LoadedConfig, ValidatorError> {
    let path = match explicit {
        Some(path) => require_regular_file(path)?,
        None => discover(current)?,
    };
    let contents = fs::read_to_string(&path).map_err(|source| ValidatorError::ConfigRead {
        path: path.clone(),
        source,
    })?;
    let config: Config = serde_json::from_str(&contents)
        .map_err(|error| ValidatorError::invalid(&path, error.to_string()))?;
    validate(config, path)
}

fn require_regular_file(path: &Path) -> Result<PathBuf, ValidatorError> {
    let metadata = fs::symlink_metadata(path).map_err(|source| ValidatorError::ConfigRead {
        path: path.to_path_buf(),
        source,
    })?;
    if !metadata.file_type().is_file() {
        return Err(ValidatorError::invalid(
            path,
            "configuration must be a regular file",
        ));
    }
    path.canonicalize()
        .map_err(|source| ValidatorError::ConfigRead {
            path: path.to_path_buf(),
            source,
        })
}

fn validate(config: Config, path: PathBuf) -> Result<LoadedConfig, ValidatorError> {
    let invalid = |detail: String| ValidatorError::invalid(&path, detail);
    if config.schema_version != CONFIG_SCHEMA_VERSION {
        return Err(invalid(format!(
            "unsupported schemaVersion {}",
            config.schema_version
        )));
    }
    if !(4096..=16_777_216).contains(&config.output_limit_bytes) {
        return Err(invalid(
            "outputLimitBytes must be between 4096 and 16777216".into(),
        ));
    }
    let config_directory = path
        .parent()
        .ok_or_else(|| invalid("configuration has no parent".into()))?;
    let workspace_root = config_directory
        .join(&config.workspace_root)
        .canonicalize()
        .map_err(|error| invalid(format!("invalid workspaceRoot: {error}")))?;
    if !workspace_root.is_dir() {
        return Err(invalid("workspaceRoot is not a directory".into()));
    }

    let tools = collect_unique(config.tools.clone(), |item| &item.id, "tool", &path)?;
    let checks = collect_unique(config.checks.clone(), |item| &item.id, "check", &path)?;
    let suites = collect_unique(config.suites.clone(), |item| &item.id, "suite", &path)?;

    if !suites.contains_key(&config.default_suite) {
        return Err(invalid(format!(
            "default suite {} does not exist",
            config.default_suite
        )));
    }
    for tool in tools.values() {
        validate_id(&tool.id).map_err(&invalid)?;
        if tool.program.is_empty()
            || has_nul(&tool.program)
            || tool.version_args.iter().any(|a| has_nul(a))
        {
            return Err(invalid(format!(
                "tool {} has an empty program or NUL argument",
                tool.id
            )));
        }
        if let Some(requirement) = &tool.version_requirement {
            VersionReq::parse(requirement).map_err(|error| {
                invalid(format!(
                    "tool {} has invalid version requirement: {error}",
                    tool.id
                ))
            })?;
        }
    }
    for check in checks.values() {
        validate_id(&check.id).map_err(&invalid)?;
        if check.id == "repository.integrity" {
            return Err(invalid("repository.integrity is reserved".into()));
        }
        if check.label.trim().is_empty() || check.args.iter().any(|a| has_nul(a)) {
            return Err(invalid(format!(
                "check {} has an empty label or NUL argument",
                check.id
            )));
        }
        if !(1..=86_400).contains(&check.timeout_seconds) {
            return Err(invalid(format!(
                "check {} has an invalid timeout",
                check.id
            )));
        }
        if !tools.contains_key(&check.tool_id) {
            return Err(invalid(format!(
                "check {} references missing tool {}",
                check.id, check.tool_id
            )));
        }
        for tool in &check.requires_tools {
            if !tools.contains_key(tool) {
                return Err(invalid(format!(
                    "check {} references missing tool {tool}",
                    check.id
                )));
            }
        }
        resolve_directory(&workspace_root, &check.working_directory, &workspace_root)
            .map_err(|detail| invalid(format!("check {}: {detail}", check.id)))?;
    }
    if let Some(repository) = &config.repository {
        if !tools.contains_key(&repository.tool_id) {
            return Err(invalid(format!(
                "repository references missing tool {}",
                repository.tool_id
            )));
        }
    }

    let tool_ids = tools.keys().cloned().collect();
    let tool_graph = tools
        .iter()
        .map(|(id, tool)| (id.clone(), tool.requires_tools.clone()))
        .collect();
    validate_graph(&tool_ids, &tool_graph, "tool").map_err(&invalid)?;
    let check_ids = checks.keys().cloned().collect();
    let check_graph = checks
        .iter()
        .map(|(id, check)| (id.clone(), check.depends_on.clone()))
        .collect();
    validate_graph(&check_ids, &check_graph, "check").map_err(&invalid)?;

    for suite in suites.values() {
        validate_id(&suite.id).map_err(&invalid)?;
        if suite.label.trim().is_empty() || suite.checks.is_empty() {
            return Err(invalid(format!(
                "suite {} must have a label and checks",
                suite.id
            )));
        }
        let mut positions = BTreeMap::new();
        for (index, check) in suite.checks.iter().enumerate() {
            if !checks.contains_key(check) {
                return Err(invalid(format!(
                    "suite {} references missing check {check}",
                    suite.id
                )));
            }
            if positions.insert(check, index).is_some() {
                return Err(invalid(format!("suite {} repeats check {check}", suite.id)));
            }
        }
        for (check, index) in &positions {
            for dependency in &checks[*check].depends_on {
                match positions.get(dependency) {
                    Some(dependency_index) if dependency_index < index => {}
                    _ => {
                        return Err(invalid(format!(
                            "suite {} must include dependency {dependency} before {check}",
                            suite.id
                        )))
                    }
                }
            }
        }
    }
    Ok(LoadedConfig {
        config,
        path,
        workspace_root,
        tools,
        checks,
        suites,
    })
}

fn collect_unique<T: Clone>(
    values: Vec<T>,
    id: impl Fn(&T) -> &str,
    kind: &str,
    path: &Path,
) -> Result<BTreeMap<String, T>, ValidatorError> {
    let mut result = BTreeMap::new();
    for value in values {
        let key = id(&value).to_string();
        if result.insert(key.clone(), value).is_some() {
            return Err(ValidatorError::invalid(
                path,
                format!("duplicate {kind} id {key}"),
            ));
        }
    }
    Ok(result)
}

pub fn resolve_working_directory(loaded: &LoadedConfig, check: &CheckConfig) -> PathBuf {
    loaded
        .workspace_root
        .join(&check.working_directory)
        .canonicalize()
        .expect("validated path")
}

fn resolve_directory(base: &Path, path: &Path, boundary: &Path) -> Result<PathBuf, String> {
    let resolved = base
        .join(path)
        .canonicalize()
        .map_err(|error| format!("invalid directory {}: {error}", path.display()))?;
    let boundary = boundary
        .canonicalize()
        .map_err(|error| format!("invalid workspace directory: {error}"))?;
    if !resolved.is_dir() || !resolved.starts_with(&boundary) {
        return Err(format!(
            "directory {} is outside the workspace or is not a directory",
            resolved.display()
        ));
    }
    Ok(resolved)
}

fn has_nul(value: &str) -> bool {
    value.as_bytes().contains(&0)
}

fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > 96 {
        return Err(format!("invalid id {id:?}"));
    }
    let mut previous_separator = false;
    for (index, byte) in id.bytes().enumerate() {
        let separator = matches!(byte, b'.' | b'_' | b'-');
        let valid = byte.is_ascii_lowercase() || byte.is_ascii_digit() || separator;
        if !valid || index == 0 && !byte.is_ascii_lowercase() || separator && previous_separator {
            return Err(format!("invalid id {id:?}"));
        }
        previous_separator = separator;
    }
    if previous_separator {
        return Err(format!("invalid id {id:?}"));
    }
    Ok(())
}
