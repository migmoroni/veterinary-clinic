use crate::{config::LoadedConfig, process};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::{atomic::AtomicBool, Arc},
    time::Duration,
};

pub fn snapshot(loaded: &LoadedConfig, cancelled: &Arc<AtomicBool>) -> Result<Vec<String>, String> {
    let repository = loaded
        .config
        .repository
        .as_ref()
        .ok_or("repository is not configured")?;
    let tool = &loaded.tools[&repository.tool_id];
    let args = vec!["status".into(), "--porcelain=v1".into(), "-z".into()];
    let output = process::run(
        &tool.program,
        &args,
        &loaded.workspace_root,
        Duration::from_secs(120),
        loaded.config.output_limit_bytes,
        cancelled,
    );
    if let Some(error) = output.start_error {
        return Err(format!("cannot start repository provider: {error}"));
    }
    if output.interrupted {
        return Err("repository snapshot interrupted".into());
    }
    if output.timed_out {
        return Err("repository snapshot timed out".into());
    }
    if output.exit_code != Some(0) {
        return Err(format!(
            "repository snapshot exited with {:?}: {}",
            output.exit_code,
            output.stderr.trim()
        ));
    }
    let mut entries: Vec<_> = output
        .stdout
        .split('\0')
        .filter(|entry| !entry.is_empty())
        .map(str::to_owned)
        .collect();
    entries.sort();
    Ok(entries)
}

pub fn compare(before: &[String], after: &[String]) -> (Vec<String>, Vec<String>, Vec<String>) {
    let before_by_path = by_path(before);
    let after_by_path = by_path(after);
    let before_paths: BTreeSet<_> = before_by_path.keys().cloned().collect();
    let after_paths: BTreeSet<_> = after_by_path.keys().cloned().collect();
    let introduced = after_paths.difference(&before_paths).cloned().collect();
    let removed = before_paths.difference(&after_paths).cloned().collect();
    let changed = before_paths
        .intersection(&after_paths)
        .filter(|path| before_by_path.get(*path) != after_by_path.get(*path))
        .cloned()
        .collect();
    (introduced, removed, changed)
}

fn by_path(entries: &[String]) -> BTreeMap<String, String> {
    entries
        .iter()
        .map(|entry| {
            let path = entry.get(3..).unwrap_or(entry).to_string();
            (path, entry.clone())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::compare;

    #[test]
    fn distinguishes_repository_changes() {
        let before = vec![" M shared".into(), "?? removed".into()];
        let after = vec!["MM shared".into(), "?? added".into()];
        assert_eq!(
            compare(&before, &after),
            (
                vec!["added".into()],
                vec!["removed".into()],
                vec!["shared".into()]
            )
        );
    }
}
