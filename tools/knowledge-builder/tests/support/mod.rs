//! Shared infrastructure for isolated knowledge-builder integration tests.

#![allow(dead_code)]

use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

pub fn fresh_build(
    options: &knowledge_builder::BuildOptions,
) -> Result<knowledge_builder::BuildResult, knowledge_builder::KnowledgeBuilderError> {
    let context: knowledge_builder::BuildContext =
        serde_json::from_slice(&fs::read(&options.context).expect("build context is readable"))
            .expect("build context is valid");
    assert!(
        !options
            .output
            .join(format!("versions/{}", context.build_version))
            .exists(),
        "fresh_build requires an unpublished version"
    );
    knowledge_builder::build(options)
}

pub fn verify_reuse(
    options: &knowledge_builder::BuildOptions,
) -> Result<knowledge_builder::BuildResult, knowledge_builder::KnowledgeBuilderError> {
    let context: knowledge_builder::BuildContext =
        serde_json::from_slice(&fs::read(&options.context).expect("build context is readable"))
            .expect("build context is valid");
    assert!(
        options
            .output
            .join(format!("versions/{}", context.build_version))
            .exists(),
        "verify_reuse requires a finalized version"
    );
    knowledge_builder::build(options)
}

pub trait DisplayContains {
    fn contains(&self, pattern: &str) -> bool;
}

impl<T: std::fmt::Display> DisplayContains for T {
    fn contains(&self, pattern: &str) -> bool {
        self.to_string().as_str().contains(pattern)
    }
}

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);
pub const ENTITY_MANIFEST_FILENAME: &str = "_entity.json";
pub const CONTENT_DIRECTORY_NAME: &str = "_content";
pub const MEDIA_DIRECTORY_NAME: &str = "_media";

pub struct TestDirectory(PathBuf);

impl TestDirectory {
    pub fn new(label: &str) -> Self {
        let counter = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("test clock is after Unix epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "knowledge-builder-{label}-{}-{counter}-{nonce}",
            std::process::id(),
        ));
        if path.exists() {
            fs::remove_dir_all(&path).expect("stale test directory can be removed");
        }
        fs::create_dir_all(&path).expect("test directory can be created");
        Self(path)
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

pub fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("crate is under tools/knowledge-builder")
        .to_path_buf()
}

pub fn source_root() -> PathBuf {
    workspace_root().join("data/knowledge")
}

pub fn context_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/contexts/local-context.json")
}

pub fn update_build_result(
    output: &Path,
    result: &knowledge_builder::BuildResult,
    update: impl FnOnce(&mut serde_json::Value),
) {
    let path = output.join("versions/1/build-result.json");
    let mut manifest: serde_json::Value =
        serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    update(&mut manifest);
    let mut bytes = serde_json::to_vec_pretty(&manifest).unwrap();
    bytes.push(b'\n');
    fs::write(path, bytes).unwrap();
    assert_eq!(result.build_version, 1);
}

pub fn refresh_projection_declarations(output: &Path, result: &knowledge_builder::BuildResult) {
    let report_path = output.join(&result.projection.report_path);
    let checksum = sha256(&fs::read(&report_path).unwrap());
    update_build_result(output, result, |manifest| {
        manifest["projection"]["checksumSha256"] = serde_json::Value::String(checksum.clone());
    });
    replace_checksum_entry(
        &output.join(&result.checksum_file),
        &result.projection.report_path,
        &checksum,
    );
}

pub fn refresh_database_declarations(
    output: &Path,
    result: &knowledge_builder::BuildResult,
    locale: &str,
    database: &str,
) {
    let artifact = if database == "system" {
        &result.locales[locale].system
    } else {
        &result.locales[locale].system_media
    };
    let bytes = fs::read(output.join(&artifact.path)).unwrap();
    let checksum = sha256(&bytes);
    update_build_result(output, result, |manifest| {
        manifest["locales"][locale][database]["sizeBytes"] = serde_json::json!(bytes.len());
        manifest["locales"][locale][database]["checksumSha256"] =
            serde_json::Value::String(checksum.clone());
    });
    replace_checksum_entry(
        &output.join(&result.checksum_file),
        &artifact.path,
        &checksum,
    );
}

pub fn replace_checksum_entry(path: &Path, artifact: &str, checksum: &str) {
    let contents = fs::read_to_string(path).unwrap();
    let mut replaced = false;
    let rewritten = contents
        .lines()
        .map(|line| {
            let (_, relative) = line.split_once("  ").unwrap();
            if relative == artifact {
                replaced = true;
                format!("{checksum}  {relative}\n")
            } else {
                format!("{line}\n")
            }
        })
        .collect::<String>();
    assert!(replaced, "checksum entry not found for {artifact}");
    fs::write(path, rewritten).unwrap();
}

pub fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

pub fn copy_tree(source: &Path, destination: &Path) {
    fs::create_dir_all(destination).unwrap();
    let mut entries = fs::read_dir(source)
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap();
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        let target = destination.join(entry.file_name());
        if entry.file_type().unwrap().is_dir() {
            copy_tree(&entry.path(), &target);
        } else {
            fs::copy(entry.path(), target).unwrap();
        }
    }
}

pub fn find_first_manifest(root: &Path) -> Option<PathBuf> {
    let mut entries = fs::read_dir(root)
        .ok()?
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        if entry.file_type().ok()?.is_dir() {
            if let Some(path) = find_first_manifest(&entry.path()) {
                return Some(path);
            }
        } else if entry.file_name() == ENTITY_MANIFEST_FILENAME {
            return Some(entry.path());
        }
    }
    None
}

pub fn find_manifest_with_content(root: &Path) -> Option<PathBuf> {
    let mut entries = fs::read_dir(root)
        .ok()?
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        if entry.file_type().ok()?.is_dir() {
            if let Some(path) = find_manifest_with_content(&entry.path()) {
                return Some(path);
            }
        } else if entry.file_name() == ENTITY_MANIFEST_FILENAME {
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(entry.path()).ok()?).ok()?;
            if value.get("sectionStandardKey").is_some() {
                return Some(entry.path());
            }
        }
    }
    None
}

pub fn find_manifest_by_type(root: &Path, entity_type: &str) -> Option<PathBuf> {
    let mut entries = fs::read_dir(root)
        .ok()?
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        if entry.file_type().ok()?.is_dir() {
            if let Some(path) = find_manifest_by_type(&entry.path(), entity_type) {
                return Some(path);
            }
        } else if entry.file_name() == ENTITY_MANIFEST_FILENAME {
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(entry.path()).ok()?).ok()?;
            if value.get("entityType").and_then(serde_json::Value::as_str) == Some(entity_type) {
                return Some(entry.path());
            }
        }
    }
    None
}

pub fn find_manifest_by_id(root: &Path, id: &str) -> Option<PathBuf> {
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path).ok()?.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path
                .file_name()
                .is_some_and(|name| name == ENTITY_MANIFEST_FILENAME)
            {
                let value: serde_json::Value =
                    serde_json::from_slice(&fs::read(&path).ok()?).ok()?;
                if value.get("id").and_then(serde_json::Value::as_str) == Some(id) {
                    return Some(path);
                }
            }
        }
    }
    None
}

pub fn find_manifest_containing(root: &Path, needle: &str) -> Option<PathBuf> {
    let mut entries = fs::read_dir(root)
        .ok()?
        .collect::<Result<Vec<_>, _>>()
        .ok()?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        if entry.file_type().ok()?.is_dir() {
            if let Some(path) = find_manifest_containing(&entry.path(), needle) {
                return Some(path);
            }
        } else if entry.file_name() == ENTITY_MANIFEST_FILENAME
            && fs::read_to_string(entry.path()).ok()?.contains(needle)
        {
            return Some(entry.path());
        }
    }
    None
}
