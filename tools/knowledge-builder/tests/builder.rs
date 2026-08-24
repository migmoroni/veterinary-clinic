use knowledge_builder::{build, validate, BuildContext, BuildOptions, LOCALES};
use rusqlite::Connection;
use sha2::{Digest, Sha256};
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
    Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/contexts/local-context.json")
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
fn minimal_fixture_builds_and_tampered_version_is_not_reused() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let validated = validate(&fixture).expect("minimal fixture must validate");
    assert_eq!(validated.entity_count(), 1);
    let output = TestDirectory::new("minimal-fixture");
    let result = build(&BuildOptions {
        source: fixture.clone(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("minimal fixture must build");
    assert_eq!(result.locales.len(), 6);

    let result_path = output.path().join("versions/1/build-result.json");
    let canonical_result = fs::read(&result_path).unwrap();
    let mut value: serde_json::Value = serde_json::from_slice(&canonical_result).unwrap();
    value["unexpectedField"] = serde_json::Value::Bool(true);
    fs::write(&result_path, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    let error = build(&BuildOptions {
        source: fixture.clone(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("schema violation"));

    fs::write(&result_path, canonical_result).unwrap();
    fs::write(output.path().join("versions/1/unexpected.txt"), b"tampered").unwrap();
    let error = build(&BuildOptions {
        source: fixture,
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("additional files"));
}

#[test]
fn artifact_verifier_recalculates_manifest_report_and_database_facts() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");

    let run_case = |label: &str, mutate: &dyn Fn(&Path, &knowledge_builder::BuildResult)| {
        let output = TestDirectory::new(label);
        let options = BuildOptions {
            source: fixture.clone(),
            output: output.path().to_path_buf(),
            context: context_path(),
        };
        let result = build(&options).unwrap();
        mutate(output.path(), &result);
        build(&options).unwrap_err()
    };

    let error = run_case("tampered-size", &|output, result| {
        update_build_result(output, result, |manifest| {
            manifest["locales"]["pt-BR"]["system"]["sizeBytes"] = serde_json::json!(
                manifest["locales"]["pt-BR"]["system"]["sizeBytes"]
                    .as_u64()
                    .unwrap()
                    + 1
            );
        });
    });
    assert!(error.contains("sizeBytes mismatch"));

    let error = run_case("tampered-checksum", &|output, result| {
        update_build_result(output, result, |manifest| {
            manifest["locales"]["pt-BR"]["system"]["checksumSha256"] =
                serde_json::Value::String("0".repeat(64));
        });
    });
    assert!(error.contains("checksum mismatch"));

    let error = run_case("tampered-locale-cas", &|output, result| {
        update_build_result(output, result, |manifest| {
            manifest["locales"]["pt-BR"]["casSetDigestSha256"] =
                serde_json::Value::String("0".repeat(64));
        });
    });
    assert!(error.contains("locale CAS set digest mismatch"));

    let error = run_case("tampered-global-cas", &|output, result| {
        update_build_result(output, result, |manifest| {
            manifest["cas"]["setDigestSha256"] = serde_json::Value::String("0".repeat(64));
        });
    });
    assert!(error.contains("global CAS set differs"));

    let error = run_case("tampered-report", &|output, result| {
        let report_path = output.join(&result.projection.report_path);
        let mut report: serde_json::Value =
            serde_json::from_slice(&fs::read(&report_path).unwrap()).unwrap();
        report["locales"]["pt-BR"]["expectedObligationCount"] = serde_json::json!(
            report["locales"]["pt-BR"]["expectedObligationCount"]
                .as_u64()
                .unwrap()
                + 1
        );
        fs::write(&report_path, serde_json::to_vec_pretty(&report).unwrap()).unwrap();
        refresh_projection_declarations(output, result);
    });
    assert!(error.contains("projection evidence mismatch"));

    let error = run_case("tampered-metadata", &|output, result| {
        let path = output.join(&result.locales["pt-BR"].system.path);
        let database = Connection::open(&path).unwrap();
        database
            .execute("UPDATE knowledge_build_metadata SET build_version = 99", [])
            .unwrap();
        drop(database);
        refresh_database_declarations(output, result, "pt-BR", "system");
    });
    assert!(error.contains("knowledge_build_metadata mismatch"));

    let error = run_case("tampered-fingerprint", &|output, result| {
        let path = output.join(&result.locales["pt-BR"].system.path);
        let database = Connection::open(&path).unwrap();
        database
            .execute("CREATE INDEX tampered_index ON geo_places(name)", [])
            .unwrap();
        drop(database);
        refresh_database_declarations(output, result, "pt-BR", "system");
    });
    assert!(error.contains("schema fingerprint mismatch"));

    let error = run_case("tampered-report-schema", &|output, result| {
        let report_path = output.join(&result.projection.report_path);
        let mut report: serde_json::Value =
            serde_json::from_slice(&fs::read(&report_path).unwrap()).unwrap();
        report["unexpectedField"] = serde_json::Value::Bool(true);
        fs::write(&report_path, serde_json::to_vec_pretty(&report).unwrap()).unwrap();
        refresh_projection_declarations(output, result);
    });
    assert!(error.contains("schema violation"));

    let error = run_case("missing-locale", &|output, _result| {
        fs::rename(
            output.join("versions/1/locales/fr-FR"),
            output.join("removed-fr-FR"),
        )
        .unwrap();
    });
    assert!(error.contains("missing or additional"));

    let error = run_case("incomplete-checksums", &|output, result| {
        let path = output.join(&result.checksum_file);
        let contents = fs::read_to_string(&path).unwrap();
        fs::write(
            &path,
            contents.lines().skip(1).collect::<Vec<_>>().join("\n") + "\n",
        )
        .unwrap();
    });
    assert!(error.contains("coverage differs"));

    #[cfg(unix)]
    {
        use std::os::unix::fs::symlink;
        let error = run_case("artifact-symlink", &|output, _result| {
            symlink(
                "projection-report.json",
                output.join("versions/1/unexpected-link"),
            )
            .unwrap();
        });
        assert!(error.contains("symlink is forbidden"));
    }
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

    let unicode_copy = TestDirectory::new("decomposed-unicode");
    copy_tree(&source_root(), unicode_copy.path());
    let manifest = find_manifest_containing(unicode_copy.path(), "é")
        .expect("canonical source contains composed accented text");
    let contents = fs::read_to_string(&manifest).unwrap();
    fs::write(&manifest, contents.replacen('é', "e\u{301}", 1)).unwrap();
    let decomposed = validate(unicode_copy.path()).expect("decomposed Unicode must validate");
    assert_eq!(
        original.source_digest_sha256(),
        decomposed.source_digest_sha256()
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
        .contains("schema violation"));

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
        .contains("forbidden Markdown AST node"));
}

#[test]
fn structural_and_markdown_media_share_cas_and_real_jpeg_thumbnail() {
    let source = TestDirectory::new("media-source");
    copy_tree(&source_root(), source.path());
    let manifest = find_manifest_by_type(source.path(), "condition").unwrap();
    let entity_directory = manifest.parent().unwrap();
    let media_directory = entity_directory.join("media");
    fs::create_dir_all(&media_directory).unwrap();
    let pixels = image::ImageBuffer::from_fn(320, 80, |x, _| {
        image::Rgba([20, (x % 255) as u8, 140, if x < 10 { 0 } else { 255 }])
    });
    image::DynamicImage::ImageRgba8(pixels)
        .save(media_directory.join("cover.png"))
        .unwrap();
    fs::copy(
        media_directory.join("cover.png"),
        media_directory.join("lateral.png"),
    )
    .unwrap();

    let mut entity: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    entity["media"] = serde_json::json!({
        "cover": "./media/cover.png",
        "gallery": ["./media/lateral.png"]
    });
    fs::write(&manifest, serde_json::to_vec_pretty(&entity).unwrap()).unwrap();
    let pt_br = entity_directory
        .join(entity["contentPath"].as_str().unwrap())
        .join("pt-BR.md");
    let markdown = fs::read_to_string(&pt_br).unwrap();
    fs::write(
        &pt_br,
        format!("{markdown}\n\n![Capa](../media/cover.png)\n"),
    )
    .unwrap();

    validate(source.path()).expect("structural and localized media must validate");
    let output = TestDirectory::new("media-build");
    let result = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap();
    assert_eq!(result.cas.object_count, 1);
    for locale in LOCALES {
        let artifacts = result.locales.get(locale.as_str()).unwrap();
        let system = Connection::open(output.path().join(&artifacts.system.path)).unwrap();
        let references: i64 = system
            .query_row("SELECT count(*) FROM entity_media_references", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(references, 2);
        let media = Connection::open(output.path().join(&artifacts.system_media.path)).unwrap();
        let thumbnail: (Vec<u8>, String, i64, i64, String) = media
            .query_row(
                "SELECT thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type FROM media_assets ORDER BY media_key LIMIT 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
            )
            .unwrap();
        assert!(thumbnail.0.starts_with(&[0xff, 0xd8, 0xff]));
        assert_eq!(thumbnail.1, "image/jpeg");
        assert_eq!((thumbnail.2, thumbnail.3), (200, 50));
        assert_eq!(thumbnail.4, "image/png");
        let asset_count: i64 = media
            .query_row("SELECT count(*) FROM media_assets", [], |row| row.get(0))
            .unwrap();
        assert_eq!(asset_count, 2);
    }
    let pt_database =
        Connection::open(output.path().join(&result.locales["pt-BR"].system.path)).unwrap();
    let content: String = pt_database
        .query_row(
            "SELECT content_json FROM condition_catalog_items",
            [],
            |row| row.get(0),
        )
        .unwrap();
    assert!(content.contains("knowledge-media://asset/condition/"));
    drop(pt_database);

    let result_path = output.path().join("versions/1/build-result.json");
    let checksum_path = output.path().join(&result.checksum_file);
    let system_path = output.path().join(&result.locales["pt-BR"].system.path);
    let media_path = output
        .path()
        .join(&result.locales["pt-BR"].system_media.path);
    let canonical_result = fs::read(&result_path).unwrap();
    let canonical_checksums = fs::read(&checksum_path).unwrap();
    let canonical_system = fs::read(&system_path).unwrap();
    let canonical_media = fs::read(&media_path).unwrap();

    let media_database = Connection::open(&media_path).unwrap();
    media_database
        .execute("UPDATE media_assets SET thumbnail = x'00'", [])
        .unwrap();
    drop(media_database);
    refresh_database_declarations(output.path(), &result, "pt-BR", "systemMedia");
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("thumbnail"));

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&media_path, &canonical_media).unwrap();
    let media_database = Connection::open(&media_path).unwrap();
    media_database
        .execute(
            "DELETE FROM media_assets WHERE media_key = (SELECT media_key FROM media_assets ORDER BY media_key LIMIT 1)",
            [],
        )
        .unwrap();
    drop(media_database);
    refresh_database_declarations(output.path(), &result, "pt-BR", "systemMedia");
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("row count mismatch"));

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&media_path, &canonical_media).unwrap();
    fs::write(&system_path, &canonical_system).unwrap();
    let system_database = Connection::open(&system_path).unwrap();
    system_database
        .execute(
            "DELETE FROM entity_media_references WHERE rowid = (SELECT rowid FROM entity_media_references LIMIT 1)",
            [],
        )
        .unwrap();
    drop(system_database);
    refresh_database_declarations(output.path(), &result, "pt-BR", "system");
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("row count mismatch"));

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&system_path, &canonical_system).unwrap();

    let checksum_contents = fs::read_to_string(output.path().join(&result.checksum_file)).unwrap();
    let cas_relative = checksum_contents
        .lines()
        .filter_map(|line| line.split_once("  ").map(|(_, path)| path))
        .find(|path| path.starts_with("CAS/system/"))
        .unwrap();
    fs::write(output.path().join(cas_relative), b"tampered CAS object").unwrap();
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("checksum mismatch"));
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

fn update_build_result(
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

fn refresh_projection_declarations(output: &Path, result: &knowledge_builder::BuildResult) {
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

fn refresh_database_declarations(
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

fn replace_checksum_entry(path: &Path, artifact: &str, checksum: &str) {
    let contents = fs::read_to_string(path).unwrap();
    let rewritten = contents
        .lines()
        .map(|line| {
            let (_, relative) = line.split_once("  ").unwrap();
            if relative == artifact {
                format!("{checksum}  {relative}\n")
            } else {
                format!("{line}\n")
            }
        })
        .collect::<String>();
    fs::write(path, rewritten).unwrap();
}

fn sha256(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
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

fn find_manifest_containing(root: &Path, needle: &str) -> Option<PathBuf> {
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
        } else if entry.file_name() == "entity.json"
            && fs::read_to_string(entry.path()).ok()?.contains(needle)
        {
            return Some(entry.path());
        }
    }
    None
}
