use knowledge_builder::{build, validate, BuildContext, BuildOptions, LOCALES};
use rusqlite::Connection;
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new(label: &str) -> Self {
        let counter = TEMP_COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "knowledge-builder-{label}-{}-{counter}",
            std::process::id()
        ));
        if path.exists() {
            fs::remove_dir_all(&path).expect("stale test directory can be removed");
        }
        fs::create_dir_all(&path).expect("test directory can be created");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn workspace_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(Path::parent)
        .expect("crate is under tools/knowledge-builder")
        .to_path_buf()
}

fn source_root() -> PathBuf {
    workspace_root().join("data/knowledge")
}

fn context_path() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/local-context.json")
}

#[test]
fn validates_and_builds_all_locales_deterministically() {
    let validated = validate(source_root()).expect("canonical source must validate");
    assert!(validated.entity_count() > 0);
    assert!(validated.relation_count() > 0);

    let first_output = TestDirectory::new("first-build");
    let first = build(&BuildOptions {
        source: source_root(),
        output: first_output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("first build must succeed");
    assert_eq!(first.locales.len(), LOCALES.len());
    assert_eq!(first.source_digest_sha256, validated.source_digest_sha256());

    let second_output = TestDirectory::new("second-build");
    let second = build(&BuildOptions {
        source: source_root(),
        output: second_output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("second build must succeed");
    assert_eq!(first.source_digest_sha256, second.source_digest_sha256);
    assert_eq!(
        fs::read(first_output.path().join(&first.checksum_file)).unwrap(),
        fs::read(second_output.path().join(&second.checksum_file)).unwrap()
    );

    let reused = build(&BuildOptions {
        source: source_root(),
        output: first_output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("identical finalized version must be reusable");
    assert_eq!(reused.source_digest_sha256, first.source_digest_sha256);

    let mut system_fingerprints = std::collections::BTreeSet::new();
    let mut media_fingerprints = std::collections::BTreeSet::new();
    let mut structural_ids = None;
    for locale in LOCALES {
        let artifacts = first.locales.get(locale.as_str()).unwrap();
        system_fingerprints.insert(&artifacts.system.schema_fingerprint_sha256);
        media_fingerprints.insert(&artifacts.system_media.schema_fingerprint_sha256);
        let database = Connection::open(first_output.path().join(&artifacts.system.path)).unwrap();
        let integrity: String = database
            .query_row("PRAGMA integrity_check", [], |row| row.get(0))
            .unwrap();
        assert_eq!(integrity, "ok");
        let foreign_keys: i64 = database
            .query_row("SELECT count(*) FROM pragma_foreign_key_check", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(foreign_keys, 0);
        let locale_in_database: String = database
            .query_row("SELECT locale FROM knowledge_build_metadata", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(locale_in_database, locale.as_str());
        let local_release_rows: i64 = database
            .query_row(
                "SELECT count(*) FROM knowledge_release_metadata",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(local_release_rows, 0);
        let ids = database
            .prepare("SELECT id FROM product_catalog_items ORDER BY id")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        if let Some(expected) = &structural_ids {
            assert_eq!(&ids, expected);
        } else {
            structural_ids = Some(ids);
        }
        let compiled_content: String = database
            .query_row(
                "SELECT content_json FROM product_catalog_items WHERE json_array_length(content_json, '$.sections') > 0 LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(!compiled_content.contains("sectionNumber"));
        assert!(!compiled_content.contains("contentPath"));
        assert!(!compiled_content.contains("searchConcept"));
    }
    assert_eq!(system_fingerprints.len(), 1);
    assert_eq!(media_fingerprints.len(), 1);
}

#[test]
fn logical_digest_is_independent_of_editorial_directory() {
    let original = validate(source_root()).expect("canonical source must validate");
    let moved_copy = TestDirectory::new("moved-source");
    copy_tree(&source_root(), moved_copy.path());
    let manifest =
        find_first_manifest(moved_copy.path()).expect("copied source contains a manifest");
    let entity_directory = manifest.parent().unwrap();
    let relocated_root = moved_copy.path().join("relocated");
    fs::create_dir_all(&relocated_root).unwrap();
    let relocated = relocated_root.join("entity");
    fs::rename(entity_directory, &relocated).unwrap();
    let moved = validate(moved_copy.path()).expect("moved canonical entity must validate");
    assert_eq!(
        original.source_digest_sha256(),
        moved.source_digest_sha256()
    );

    let editorial_copy = TestDirectory::new("renamed-editorial");
    copy_tree(&source_root(), editorial_copy.path());
    let manifest = find_manifest_with_content(editorial_copy.path())
        .expect("copied source contains editorial content");
    let entity_directory = manifest.parent().unwrap();
    fs::rename(
        entity_directory.join("content"),
        entity_directory.join("localized-editorial"),
    )
    .unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    value["contentPath"] = serde_json::Value::String("./localized-editorial".to_string());
    fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    let renamed =
        validate(editorial_copy.path()).expect("renamed editorial directory must validate");
    assert_eq!(
        original.source_digest_sha256(),
        renamed.source_digest_sha256()
    );
}

#[test]
fn cli_is_independent_of_current_working_directory() {
    let working_directory = TestDirectory::new("cwd");
    let output = Command::new(env!("CARGO_BIN_EXE_knowledge-builder"))
        .current_dir(working_directory.path())
        .arg("validate")
        .arg("--source")
        .arg(source_root())
        .output()
        .expect("CLI can be executed");
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}

#[test]
fn validation_rejects_schema_reference_locale_and_markdown_violations() {
    let copy = TestDirectory::new("invalid-source");
    copy_tree(&source_root(), copy.path());
    let breed_manifest =
        find_manifest_by_type(copy.path(), "breed").expect("source contains a breed");
    let original_breed = fs::read(&breed_manifest).unwrap();
    let mut breed: serde_json::Value = serde_json::from_slice(&original_breed).unwrap();

    breed["unexpectedField"] = serde_json::Value::Bool(true);
    fs::write(&breed_manifest, serde_json::to_vec_pretty(&breed).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("unexpected field"));

    breed = serde_json::from_slice(&original_breed).unwrap();
    breed["localizedContent"]["name"]
        .as_object_mut()
        .unwrap()
        .remove("fr-FR");
    fs::write(&breed_manifest, serde_json::to_vec_pretty(&breed).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("schema violation"));

    breed = serde_json::from_slice(&original_breed).unwrap();
    breed["sizeTermKey"] = serde_json::Value::String("unknown-size".to_string());
    fs::write(&breed_manifest, serde_json::to_vec_pretty(&breed).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("unresolved or cross-domain taxonomy term"));
    fs::write(&breed_manifest, &original_breed).unwrap();

    let editorial_manifest = find_manifest_with_content(copy.path()).unwrap();
    let editorial: serde_json::Value =
        serde_json::from_slice(&fs::read(&editorial_manifest).unwrap()).unwrap();
    let content_path = editorial["contentPath"].as_str().unwrap();
    let document = editorial_manifest
        .parent()
        .unwrap()
        .join(content_path)
        .join("pt-BR.md");
    let original_document = fs::read_to_string(&document).unwrap();
    fs::write(
        &document,
        format!("{original_document}\n<script>alert(1)</script>\n"),
    )
    .unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("raw HTML is forbidden"));
}

#[test]
fn divergent_context_cannot_overwrite_finalized_version() {
    let output = TestDirectory::new("divergent-version");
    build(&BuildOptions {
        source: source_root(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap();
    let divergent_context = output.path().join("public-context.json");
    let context = BuildContext {
        schema_version: 1,
        build_version: 1,
        release: Some(knowledge_builder::ReleaseContext {
            release_id: "37ef9309-c8fd-42ac-99a5-050b195d747f".to_string(),
            generation: 1,
            revision: 1,
        }),
    };
    fs::write(&divergent_context, serde_json::to_vec(&context).unwrap()).unwrap();
    let error = build(&BuildOptions {
        source: source_root(),
        output: output.path().to_path_buf(),
        context: divergent_context.clone(),
    })
    .unwrap_err();
    assert!(error.contains("divergent"));

    let public_context = BuildContext {
        schema_version: 1,
        build_version: 2,
        release: context.release.clone(),
    };
    fs::write(
        &divergent_context,
        serde_json::to_vec(&public_context).unwrap(),
    )
    .unwrap();
    let public = build(&BuildOptions {
        source: source_root(),
        output: output.path().to_path_buf(),
        context: divergent_context,
    })
    .unwrap();
    for artifacts in public.locales.values() {
        for database_path in [&artifacts.system.path, &artifacts.system_media.path] {
            let database = Connection::open(output.path().join(database_path)).unwrap();
            let row: (String, i64, i64) = database
                .query_row(
                    "SELECT release_id, generation, revision FROM knowledge_release_metadata",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .unwrap();
            assert_eq!(
                row,
                ("37ef9309-c8fd-42ac-99a5-050b195d747f".to_string(), 1, 1)
            );
        }
    }
}

fn copy_tree(source: &Path, destination: &Path) {
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

fn find_first_manifest(root: &Path) -> Option<PathBuf> {
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
        } else if entry.file_name() == "entity.json" {
            return Some(entry.path());
        }
    }
    None
}

fn find_manifest_with_content(root: &Path) -> Option<PathBuf> {
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
        } else if entry.file_name() == "entity.json" {
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(entry.path()).ok()?).ok()?;
            if value.get("contentPath").is_some() {
                return Some(entry.path());
            }
        }
    }
    None
}

fn find_manifest_by_type(root: &Path, entity_type: &str) -> Option<PathBuf> {
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
        } else if entry.file_name() == "entity.json" {
            let value: serde_json::Value =
                serde_json::from_slice(&fs::read(entry.path()).ok()?).ok()?;
            if value.get("entityType").and_then(serde_json::Value::as_str) == Some(entity_type) {
                return Some(entry.path());
            }
        }
    }
    None
}
