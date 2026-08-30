//! End-to-end coverage for deterministic builds, finalized-version reuse,
//! canonical validation, and rejection of physically refreshed tampering.

use knowledge_builder::{build, validate, BuildContext, BuildOptions, LOCALES};
use rusqlite::Connection;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::atomic::{AtomicU64, Ordering},
};
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};

static TEMP_COUNTER: AtomicU64 = AtomicU64::new(0);

fn normalize_search(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());
    let mut pending_space = false;
    for character in value
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .flat_map(char::to_lowercase)
    {
        if character.is_ascii_alphanumeric() {
            if pending_space && !normalized.is_empty() {
                normalized.push(' ');
            }
            normalized.push(character);
            pending_space = false;
        } else {
            pending_space = true;
        }
    }
    normalized
}

struct TestDirectory(PathBuf);

impl TestDirectory {
    fn new(label: &str) -> Self {
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
    let report: serde_json::Value = serde_json::from_slice(
        &fs::read(first_output.path().join(&first.projection.report_path)).unwrap(),
    )
    .unwrap();
    assert_eq!(report["schemaVersion"], 5);
    assert_eq!(first.builder_version, "0.4.0");
    assert_eq!(first.system_schema_version, 4);
    assert_eq!(first.system_media_schema_version, 2);
    let expected_system_tables = [
        "active_ingredient_catalog_items",
        "life_origin_places",
        "life_reference_items",
        "condition_catalog_items",
        "entity_media_references",
        "entity_search_terms",
        "entity_taxonomy_terms",
        "geo_places",
        "manufacturer_catalog_items",
        "product_active_ingredients",
        "product_catalog_items",
        "taxonomy_registry",
        "taxonomy_terms",
        "treatment_protocol_doses",
        "treatment_protocol_items",
        "treatment_protocols",
    ]
    .into_iter()
    .collect::<std::collections::BTreeSet<_>>();
    for locale in LOCALES {
        assert_eq!(
            report["source"]["localizedFragmentsByLocale"][locale.as_str()],
            report["locales"][locale.as_str()]["consumedLocalizedFragments"]
        );
        let reported_system_tables = report["locales"][locale.as_str()]["rowsByDatabase"]["system"]
            .as_object()
            .unwrap()
            .keys()
            .map(String::as_str)
            .collect::<std::collections::BTreeSet<_>>();
        assert_eq!(reported_system_tables, expected_system_tables);
    }

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
        let user_version: u32 = database
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(user_version, 4);
        let table_count: usize = database
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(table_count, 18);
        let taxonomy_count: usize = database
            .query_row("SELECT count(*) FROM taxonomy_registry", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(taxonomy_count, 13);
        let taxonomies_with_terms: usize = database
            .query_row(
                "SELECT count(DISTINCT taxonomy_id) FROM taxonomy_terms",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(taxonomies_with_terms, 13);
        let forbidden_table_count: usize = database
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name IN ('product_target_terms','product_vaccine_profile_terms','product_life_stage_terms','product_therapeutic_scope_terms','product_targets','product_vaccine_profiles','product_life_stages','product_therapeutic_scopes')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(forbidden_table_count, 0);
        for (table, column) in [
            ("manufacturer_catalog_items", "type_term_key"),
            ("active_ingredient_catalog_items", "type_term_key"),
            ("condition_catalog_items", "type_term_key"),
            ("product_catalog_items", "type_term_key"),
            ("entity_taxonomy_terms", "relation_kind"),
        ] {
            let present: usize = database
                .query_row(
                    &format!("SELECT count(*) FROM pragma_table_info('{table}') WHERE name = ?1"),
                    [column],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(present, 0, "{table}.{column} must not exist");
        }
        for (name, expected_sql) in [
            (
                "idx_entity_taxonomy_filter",
                "CREATE INDEX idx_entity_taxonomy_filter ON entity_taxonomy_terms(taxonomy_id, term_key, entity_type, entity_id)",
            ),
            (
                "idx_entity_taxonomy_entity",
                "CREATE INDEX idx_entity_taxonomy_entity ON entity_taxonomy_terms(entity_type, entity_id, taxonomy_id, sort_order)",
            ),
        ] {
            let sql: String = database
                .query_row(
                    "SELECT sql FROM sqlite_schema WHERE type = 'index' AND name = ?1",
                    [name],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(sql, expected_sql);
        }
        let taxonomized_types: usize = database
            .query_row(
                "SELECT count(DISTINCT entity_type) FROM entity_taxonomy_terms",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(taxonomized_types, 4);
        let invalid_required_cardinality: usize = database
            .query_row(
                "WITH taxonomized(entity_type, entity_id, required_purpose) AS (SELECT 'manufacturer', id, 'type' FROM manufacturer_catalog_items UNION ALL SELECT 'active_ingredient', id, 'type' FROM active_ingredient_catalog_items UNION ALL SELECT 'condition', id, 'type' FROM condition_catalog_items UNION ALL SELECT 'product', id, 'type' FROM product_catalog_items) SELECT count(*) FROM taxonomized entity WHERE (SELECT count(*) FROM entity_taxonomy_terms relation JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id WHERE relation.entity_type = entity.entity_type AND relation.entity_id = entity.entity_id AND taxonomy.domain = entity.entity_type AND taxonomy.purpose = entity.required_purpose) <> 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(invalid_required_cardinality, 0);
        let non_contiguous_taxonomy_orders: usize = database
            .query_row(
                "SELECT count(*) FROM (SELECT entity_type, entity_id, taxonomy_id, count(*) AS row_count, min(sort_order) AS first_order, max(sort_order) AS last_order FROM entity_taxonomy_terms GROUP BY entity_type, entity_id, taxonomy_id HAVING first_order <> 0 OR last_order <> row_count - 1)",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(non_contiguous_taxonomy_orders, 0);
        let missing_taxonomy_labels_in_search: usize = database
            .query_row(
                "SELECT count(*) FROM entity_taxonomy_terms relation JOIN taxonomy_terms term ON term.taxonomy_id = relation.taxonomy_id AND term.term_key = relation.term_key WHERE NOT EXISTS (SELECT 1 FROM entity_search_terms search WHERE search.entity_type = relation.entity_type AND search.entity_id = relation.entity_id AND search.normalized_value = term.normalized_label)",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(missing_taxonomy_labels_in_search, 0);
        let taxonomy_aliases = database
            .prepare(
                "SELECT relation.entity_type, relation.entity_id, alias.value FROM entity_taxonomy_terms relation JOIN taxonomy_terms term ON term.taxonomy_id = relation.taxonomy_id AND term.term_key = relation.term_key JOIN json_each(term.aliases_json) alias ORDER BY relation.entity_type, relation.entity_id, relation.taxonomy_id, relation.sort_order, alias.key",
            )
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        for (entity_type, entity_id, alias) in taxonomy_aliases {
            let normalized = normalize_search(&alias);
            let search_matches: usize = database
                .query_row(
                    "SELECT count(*) FROM entity_search_terms WHERE entity_type = ?1 AND entity_id = ?2 AND normalized_value = ?3",
                    [&entity_type, &entity_id, &normalized],
                    |row| row.get(0),
                )
                .unwrap();
            assert!(
                search_matches > 0,
                "taxonomy alias {alias} must be searchable"
            );
        }
        let reference_filter_count: usize = database
            .query_row(
                "SELECT count(*) FROM entity_taxonomy_terms relation JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id WHERE relation.entity_type = (SELECT entity_type FROM entity_taxonomy_terms ORDER BY entity_type, entity_id LIMIT 1) AND taxonomy.domain = relation.entity_type AND taxonomy.purpose = (SELECT taxonomy.purpose FROM entity_taxonomy_terms selected JOIN taxonomy_registry taxonomy ON taxonomy.id = selected.taxonomy_id ORDER BY selected.entity_type, selected.entity_id LIMIT 1) AND relation.term_key = (SELECT term_key FROM entity_taxonomy_terms ORDER BY entity_type, entity_id LIMIT 1)",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(reference_filter_count > 0);
        let complete_entity_taxonomies: usize = database
            .query_row(
                "SELECT count(*) FROM entity_taxonomy_terms relation JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id JOIN taxonomy_terms term ON term.taxonomy_id = relation.taxonomy_id AND term.term_key = relation.term_key WHERE relation.entity_type = (SELECT entity_type FROM entity_taxonomy_terms ORDER BY entity_type, entity_id LIMIT 1) AND relation.entity_id = (SELECT entity_id FROM entity_taxonomy_terms ORDER BY entity_type, entity_id LIMIT 1) ORDER BY taxonomy.domain, taxonomy.purpose, relation.sort_order",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(complete_entity_taxonomies > 0);
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
    assert_eq!(validated.entity_count(), 27);
    let output = TestDirectory::new("minimal-fixture");
    let result = build(&BuildOptions {
        source: fixture.clone(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("minimal fixture must build");
    assert_eq!(result.locales.len(), 6);
    let database =
        Connection::open(output.path().join(&result.locales["pt-BR"].system.path)).unwrap();
    assert_eq!(
        database
            .query_row("SELECT count(*) FROM life_reference_items", [], |row| row
                .get::<_, usize>(
                0
            ))
            .unwrap(),
        10
    );
    let projected_taxonomy = database
        .query_row(
            "SELECT domain_id, kingdom_id, phylum_id, class_id, order_id, family_id, genus_id, species_id, breed_id, variety_id, size_term_key FROM life_reference_items WHERE id = 'poodle-toy'",
            [],
            |row| {
                (0..11)
                    .map(|index| row.get::<_, Option<String>>(index))
                    .collect::<Result<Vec<_>, _>>()
            },
        )
        .unwrap();
    assert_eq!(projected_taxonomy[0].as_deref(), Some("eukaryota"));
    assert_eq!(projected_taxonomy[9].as_deref(), Some("poodle-toy"));
    assert_eq!(projected_taxonomy[10].as_deref(), Some("default"));
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM life_reference_items WHERE breed_id = 'poodle' AND variety_id IS NOT NULL",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        1
    );
    assert_eq!(
        database
            .query_row("SELECT count(*) FROM life_origin_places", [], |row| row
                .get::<_, usize>(
                0
            ))
            .unwrap(),
        2
    );
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM life_reference_items WHERE species_id = 'canis-lupus-familiaris' AND id <> 'canis-lupus-familiaris'",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        2
    );
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM product_catalog_items product JOIN life_reference_items target ON target.id = 'poodle-toy' WHERE EXISTS (SELECT 1 FROM json_each(product.applicable_taxon_ids_json) applicable WHERE applicable.value IN (target.domain_id,target.kingdom_id,target.phylum_id,target.class_id,target.order_id,target.family_id,target.genus_id,target.species_id,target.breed_id,target.variety_id))",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        1
    );
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM treatment_protocols protocol JOIN life_reference_items target ON target.id = 'poodle-toy' WHERE EXISTS (SELECT 1 FROM json_each(protocol.applicable_taxon_ids_json) applicable WHERE applicable.value IN (target.domain_id,target.kingdom_id,target.phylum_id,target.class_id,target.order_id,target.family_id,target.genus_id,target.species_id,target.breed_id,target.variety_id))",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        1
    );

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
fn minimal_fixture_rejects_missing_and_duplicate_taxonomy_owners() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");

    let missing = TestDirectory::new("minimal-missing-taxonomy");
    copy_tree(&fixture, missing.path());
    fs::remove_dir_all(missing.path().join("taxonomies/product-target")).unwrap();
    let error = validate(missing.path()).unwrap_err().to_string();
    assert!(error.contains("missing canonical taxonomy product:target"));

    let duplicate = TestDirectory::new("minimal-duplicate-taxonomy");
    copy_tree(&fixture, duplicate.path());
    let original = duplicate
        .path()
        .join("taxonomies/product-target/entity.json");
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&original).unwrap()).unwrap();
    taxonomy["id"] = serde_json::Value::String("fixture-product-target-duplicate".to_string());
    let duplicate_directory = duplicate.path().join("taxonomies/product-target-duplicate");
    fs::create_dir_all(&duplicate_directory).unwrap();
    fs::write(
        duplicate_directory.join("entity.json"),
        serde_json::to_vec_pretty(&taxonomy).unwrap(),
    )
    .unwrap();
    let error = validate(duplicate.path()).unwrap_err().to_string();
    assert!(error.contains("duplicate taxonomy owner product:target"));
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
    assert!(error.contains("physical schema differs"));

    let error = run_case("tampered-specific-taxonomy-table", &|output, result| {
        let path = output.join(&result.locales["pt-BR"].system.path);
        let database = Connection::open(&path).unwrap();
        database
            .execute(
                "CREATE TABLE product_targets (product_id TEXT NOT NULL, term_key TEXT NOT NULL)",
                [],
            )
            .unwrap();
        drop(database);
        refresh_database_declarations(output, result, "pt-BR", "system");
    });
    assert!(error.contains("physical schema differs"));

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
fn semantically_tampered_database_is_rejected_after_checksums_are_refreshed() {
    let output = TestDirectory::new("semantic-tampering");
    let options = BuildOptions {
        source: source_root(),
        output: output.path().to_path_buf(),
        context: context_path(),
    };
    let result = build(&options).expect("canonical source must build");
    let result_path = output.path().join("versions/1/build-result.json");
    let checksum_path = output.path().join(&result.checksum_file);
    let system_path = output.path().join(&result.locales["pt-BR"].system.path);
    let canonical_result = fs::read(&result_path).unwrap();
    let canonical_checksums = fs::read(&checksum_path).unwrap();
    let canonical_system = fs::read(&system_path).unwrap();

    let mutations = [
        (
            "localized-name",
            "UPDATE product_catalog_items SET name = name || ' adulterado' WHERE rowid = (SELECT rowid FROM product_catalog_items LIMIT 1)",
        ),
        (
            "aliases-json",
            "UPDATE product_catalog_items SET aliases_json = '[\"adulterado\"]' WHERE rowid = (SELECT rowid FROM product_catalog_items LIMIT 1)",
        ),
        (
            "normalized-value",
            "UPDATE product_catalog_items SET normalized_name = normalized_name || '-adulterado' WHERE rowid = (SELECT rowid FROM product_catalog_items LIMIT 1)",
        ),
        (
            "life-taxonomy",
            "UPDATE life_reference_items SET family_id = 'felidae' WHERE id = 'poodle'",
        ),
        (
            "applicable-taxon",
            "UPDATE product_catalog_items SET applicable_taxon_ids_json = '[\"eukaryota\"]' WHERE rowid = (SELECT rowid FROM product_catalog_items LIMIT 1)",
        ),
        (
            "applicable-taxon-order",
            "UPDATE product_catalog_items SET applicable_taxon_ids_json = json_array(json_extract(applicable_taxon_ids_json, '$[1]'), json_extract(applicable_taxon_ids_json, '$[0]')) WHERE rowid = (SELECT rowid FROM product_catalog_items WHERE json_array_length(applicable_taxon_ids_json) = 2 LIMIT 1)",
        ),
        (
            "relation-order",
            "UPDATE product_active_ingredients SET sort_order = sort_order + 10000 WHERE rowid = (SELECT rowid FROM product_active_ingredients LIMIT 1)",
        ),
        (
            "related-identity",
            "UPDATE entity_taxonomy_terms SET term_key = (SELECT candidate.term_key FROM taxonomy_terms AS candidate WHERE candidate.taxonomy_id = entity_taxonomy_terms.taxonomy_id AND candidate.term_key NOT IN (SELECT existing.term_key FROM entity_taxonomy_terms AS existing WHERE existing.entity_type = entity_taxonomy_terms.entity_type AND existing.entity_id = entity_taxonomy_terms.entity_id AND existing.taxonomy_id = entity_taxonomy_terms.taxonomy_id) LIMIT 1) WHERE rowid = (SELECT relation.rowid FROM entity_taxonomy_terms AS relation WHERE EXISTS (SELECT 1 FROM taxonomy_terms AS candidate WHERE candidate.taxonomy_id = relation.taxonomy_id AND candidate.term_key NOT IN (SELECT existing.term_key FROM entity_taxonomy_terms AS existing WHERE existing.entity_type = relation.entity_type AND existing.entity_id = relation.entity_id AND existing.taxonomy_id = relation.taxonomy_id)) LIMIT 1)",
        ),
        (
            "taxonomy-purpose",
            "WITH replacement AS (SELECT relation.rowid AS relation_rowid, candidate_taxonomy.id AS taxonomy_id, candidate_term.term_key AS term_key FROM entity_taxonomy_terms relation JOIN taxonomy_registry current_taxonomy ON current_taxonomy.id = relation.taxonomy_id JOIN taxonomy_registry candidate_taxonomy ON candidate_taxonomy.domain = relation.entity_type AND candidate_taxonomy.id <> relation.taxonomy_id JOIN taxonomy_terms candidate_term ON candidate_term.taxonomy_id = candidate_taxonomy.id WHERE NOT EXISTS (SELECT 1 FROM entity_taxonomy_terms existing WHERE existing.entity_type = relation.entity_type AND existing.entity_id = relation.entity_id AND existing.taxonomy_id = candidate_taxonomy.id) ORDER BY relation.entity_type, relation.entity_id, candidate_taxonomy.id, candidate_term.sort_order LIMIT 1) UPDATE entity_taxonomy_terms SET taxonomy_id = (SELECT taxonomy_id FROM replacement), term_key = (SELECT term_key FROM replacement) WHERE rowid = (SELECT relation_rowid FROM replacement)",
        ),
        (
            "taxonomy-entity-type",
            "UPDATE entity_taxonomy_terms SET entity_type = 'manufacturer' WHERE rowid = (SELECT rowid FROM entity_taxonomy_terms WHERE entity_type = 'product' LIMIT 1)",
        ),
        (
            "taxonomy-sort-order",
            "UPDATE entity_taxonomy_terms SET sort_order = sort_order + 100000 WHERE rowid = (SELECT rowid FROM entity_taxonomy_terms LIMIT 1)",
        ),
        (
            "missing-required-taxonomy",
            "DELETE FROM entity_taxonomy_terms WHERE rowid = (SELECT relation.rowid FROM entity_taxonomy_terms relation JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id WHERE taxonomy.purpose = 'type' ORDER BY relation.entity_type, relation.entity_id LIMIT 1)",
        ),
        (
            "taxonomy-label",
            "UPDATE taxonomy_terms SET label = label || ' adulterado' WHERE rowid = (SELECT rowid FROM taxonomy_terms LIMIT 1)",
        ),
        (
            "search-provenance",
            "UPDATE entity_search_terms SET provenance = provenance || '.adulterado' WHERE rowid = (SELECT rowid FROM entity_search_terms LIMIT 1)",
        ),
        (
            "search-value",
            "UPDATE entity_search_terms SET value = value || ' adulterado' WHERE rowid = (SELECT rowid FROM entity_search_terms LIMIT 1)",
        ),
        (
            "search-normalized-value",
            "UPDATE entity_search_terms SET normalized_value = normalized_value || ' adulterado' WHERE rowid = (SELECT rowid FROM entity_search_terms LIMIT 1)",
        ),
        (
            "search-sort-order",
            "UPDATE entity_search_terms SET sort_order = sort_order + 100000 WHERE rowid = (SELECT rowid FROM entity_search_terms LIMIT 1)",
        ),
        (
            "taxonomy-aliases",
            "UPDATE taxonomy_terms SET aliases_json = '[\"adulterado\"]' WHERE rowid = (SELECT rowid FROM taxonomy_terms LIMIT 1)",
        ),
        (
            "protocol-content",
            "UPDATE treatment_protocols SET observation = coalesce(observation, '') || ' adulterado' WHERE rowid = (SELECT rowid FROM treatment_protocols LIMIT 1)",
        ),
        (
            "protocol-dose",
            "UPDATE treatment_protocol_doses SET label = label || ' adulterado' WHERE rowid = (SELECT rowid FROM treatment_protocol_doses LIMIT 1)",
        ),
        (
            "compiled-content",
            "UPDATE product_catalog_items SET content_json = json_set(content_json, '$.sections[0].compiledMarkdown', json_extract(content_json, '$.sections[0].compiledMarkdown') || ' adulterado') WHERE json_array_length(content_json, '$.sections') > 0",
        ),
    ];

    for (label, sql) in mutations {
        fs::write(&result_path, &canonical_result).unwrap();
        fs::write(&checksum_path, &canonical_checksums).unwrap();
        fs::write(&system_path, &canonical_system).unwrap();
        let database = Connection::open(&system_path).unwrap();
        let affected = database.execute(sql, []).unwrap();
        assert!(affected > 0, "mutation {label} must affect a row");
        drop(database);
        refresh_database_declarations(output.path(), &result, "pt-BR", "system");
        let error = build(&options).unwrap_err();
        let expected_error = if label == "missing-required-taxonomy" {
            "row count mismatch"
        } else {
            "not semantically equivalent"
        };
        assert!(
            error.contains(expected_error),
            "mutation {label} produced an unexpected error: {error}"
        );
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
    let artifacts = TestDirectory::new("cwd-build");
    let output = Command::new(env!("CARGO_BIN_EXE_knowledge-builder"))
        .current_dir(working_directory.path())
        .arg("build")
        .arg("--source")
        .arg(source_root())
        .arg("--output")
        .arg(artifacts.path())
        .arg("--context")
        .arg(context_path())
        .output()
        .expect("build CLI can be executed outside the workspace");
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
    let life_manifest =
        find_manifest_by_type(copy.path(), "life").expect("source contains a life entity");
    let original_life = fs::read(&life_manifest).unwrap();
    let mut life: serde_json::Value = serde_json::from_slice(&original_life).unwrap();

    life["unexpectedField"] = serde_json::Value::Bool(true);
    fs::write(&life_manifest, serde_json::to_vec_pretty(&life).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("schema violation"));

    life = serde_json::from_slice(&original_life).unwrap();
    life["localizedContent"]["name"]
        .as_object_mut()
        .unwrap()
        .remove("fr-FR");
    fs::write(&life_manifest, serde_json::to_vec_pretty(&life).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("schema violation"));

    life = serde_json::from_slice(&original_life).unwrap();
    life["classifications"] = serde_json::json!({ "bodyMetrics": { "size": "unknown-size" } });
    fs::write(&life_manifest, serde_json::to_vec_pretty(&life).unwrap()).unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("unresolved life:size term"));
    fs::write(&life_manifest, &original_life).unwrap();

    let taxonomy_manifest = find_manifest_by_type(copy.path(), "taxonomy").unwrap();
    let original_taxonomy = fs::read(&taxonomy_manifest).unwrap();
    let mut taxonomy: serde_json::Value = serde_json::from_slice(&original_taxonomy).unwrap();
    taxonomy["domain"] = serde_json::Value::String("geo_place".to_string());
    taxonomy["purpose"] = serde_json::Value::String("type".to_string());
    fs::write(
        &taxonomy_manifest,
        serde_json::to_vec_pretty(&taxonomy).unwrap(),
    )
    .unwrap();
    assert!(validate(copy.path())
        .unwrap_err()
        .to_string()
        .contains("unsupported taxonomy domain and purpose"));
    fs::write(&taxonomy_manifest, original_taxonomy).unwrap();

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
fn life_contract_rejects_taxonomy_metrics_and_redundant_applicability() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let cases = [
        (
            "wrong-own-id",
            "poodle",
            serde_json::json!("other-poodle"),
            vec!["taxonomy", "breed"],
        ),
        (
            "missing-ancestor",
            "poodle",
            serde_json::json!("missing-family"),
            vec!["taxonomy", "family"],
        ),
    ];
    for (label, id, replacement, path) in cases {
        let copy = TestDirectory::new(label);
        copy_tree(&fixture, copy.path());
        let manifest = find_manifest_by_id(copy.path(), id).unwrap();
        let mut value: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        value[path[0]][path[1]] = replacement;
        fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
        assert!(validate(copy.path()).is_err(), "{label} must be rejected");
    }

    let periods = TestDirectory::new("invalid-life-periods");
    copy_tree(&fixture, periods.path());
    let manifest = find_manifest_by_id(periods.path(), "poodle-toy").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    value["classifications"]["bodyMetrics"]["stageMetrics"]["male"]["young"]["period"] =
        serde_json::json!([2, 12]);
    fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(periods.path())
        .unwrap_err()
        .to_string()
        .contains("periods must follow"));

    let applicability = TestDirectory::new("redundant-life-applicability");
    copy_tree(&fixture, applicability.path());
    let product = find_manifest_by_type(applicability.path(), "product").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&product).unwrap()).unwrap();
    value["applicableTaxonIds"] = serde_json::json!(["canis-lupus-familiaris", "poodle"]);
    fs::write(&product, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(applicability.path())
        .unwrap_err()
        .to_string()
        .contains("redundant ancestor and descendant"));
}

#[test]
fn active_ingredient_denominations_follow_the_declared_closed_policy() {
    let copy = TestDirectory::new("invalid-denomination-policy");
    copy_tree(&source_root(), copy.path());
    let manifest = find_manifest_containing(copy.path(), "\"denomination_inn\"").unwrap();
    let original = fs::read(&manifest).unwrap();
    let mut entity: serde_json::Value = serde_json::from_slice(&original).unwrap();
    entity["localizedContent"]["denomination_undeclared"] =
        entity["localizedContent"]["name"].clone();
    fs::write(&manifest, serde_json::to_vec_pretty(&entity).unwrap()).unwrap();
    let error = validate(copy.path()).unwrap_err().to_string();
    assert!(error.contains("denomination has no declared nomenclature standard"));

    let mut entity: serde_json::Value = serde_json::from_slice(&original).unwrap();
    let declared = entity["nomenclature"]["denominationStandards"][0]
        .as_str()
        .unwrap()
        .to_string();
    entity["localizedContent"]
        .as_object_mut()
        .unwrap()
        .remove(&format!("denomination_{declared}"));
    fs::write(&manifest, serde_json::to_vec_pretty(&entity).unwrap()).unwrap();
    let error = validate(copy.path()).unwrap_err().to_string();
    assert!(error.contains(&format!("missing denomination_{declared}")));
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
    let lateral_pixels = image::ImageBuffer::from_fn(320, 80, |x, _| {
        image::Rgba([80, (x % 255) as u8, 30, if x < 10 { 0 } else { 255 }])
    });
    image::DynamicImage::ImageRgba8(lateral_pixels)
        .save(media_directory.join("lateral.png"))
        .unwrap();
    assert_eq!(
        fs::metadata(media_directory.join("cover.png"))
            .unwrap()
            .len(),
        fs::metadata(media_directory.join("lateral.png"))
            .unwrap()
            .len(),
        "media fixture requires distinct CAS objects with equal structural size"
    );

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
    assert_eq!(result.cas.object_count, 2);
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

    for (label, sql) in [
        (
            "structural-media-key",
            "UPDATE entity_media_references SET media_key = (SELECT candidate.media_key FROM entity_media_references AS candidate WHERE candidate.media_key <> entity_media_references.media_key LIMIT 1) WHERE rowid = (SELECT rowid FROM entity_media_references ORDER BY role LIMIT 1)",
        ),
        (
            "structural-sort-order",
            "UPDATE entity_media_references SET sort_order = sort_order + 100 WHERE rowid = (SELECT rowid FROM entity_media_references ORDER BY role LIMIT 1)",
        ),
    ] {
        fs::write(&result_path, &canonical_result).unwrap();
        fs::write(&checksum_path, &canonical_checksums).unwrap();
        fs::write(&system_path, &canonical_system).unwrap();
        let database = Connection::open(&system_path).unwrap();
        assert_eq!(database.execute(sql, []).unwrap(), 1);
        drop(database);
        refresh_database_declarations(output.path(), &result, "pt-BR", "system");
        let error = build(&BuildOptions {
            source: source.path().to_path_buf(),
            output: output.path().to_path_buf(),
            context: context_path(),
        })
        .unwrap_err();
        assert!(
            error.contains("not semantically equivalent"),
            "mutation {label} produced an unexpected error: {error}"
        );
    }

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&system_path, &canonical_system).unwrap();
    fs::write(&media_path, &canonical_media).unwrap();
    let media_database = Connection::open(&media_path).unwrap();
    media_database
        .execute_batch("PRAGMA ignore_check_constraints = ON")
        .unwrap();
    assert_eq!(
        media_database
            .execute(
                "UPDATE media_assets SET thumbnail_mime_type = 'image/png' WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
                [],
            )
            .unwrap(),
        1
    );
    drop(media_database);
    refresh_database_declarations(output.path(), &result, "pt-BR", "systemMedia");
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(
        error.contains("integrity")
            || error.contains("thumbnail")
            || error.contains("image/jpeg")
            || error.contains("semantically equivalent"),
        "mutation thumbnail-mime-type produced an unexpected error: {error}"
    );

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&system_path, &canonical_system).unwrap();
    fs::write(&media_path, &canonical_media).unwrap();
    for (label, sql) in [
        (
            "content-hash",
            "UPDATE media_assets SET content_hash = (SELECT candidate.content_hash FROM media_assets AS candidate WHERE candidate.media_key <> media_assets.media_key ORDER BY candidate.media_key LIMIT 1) WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "mime-type",
            "UPDATE media_assets SET mime_type = 'image/gif' WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "size-bytes",
            "UPDATE media_assets SET size_bytes = size_bytes + 1 WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "width",
            "UPDATE media_assets SET width = width + 1 WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "height",
            "UPDATE media_assets SET height = height + 1 WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "thumbnail-width",
            "UPDATE media_assets SET thumbnail_width = thumbnail_width - 1 WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "thumbnail-height",
            "UPDATE media_assets SET thumbnail_height = thumbnail_height - 1 WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
        (
            "thumbnail-jpeg-bytes",
            "UPDATE media_assets SET thumbnail = (SELECT candidate.thumbnail FROM media_assets AS candidate WHERE candidate.media_key <> media_assets.media_key ORDER BY candidate.media_key LIMIT 1) WHERE rowid = (SELECT rowid FROM media_assets ORDER BY media_key LIMIT 1)",
        ),
    ] {
        fs::write(&result_path, &canonical_result).unwrap();
        fs::write(&checksum_path, &canonical_checksums).unwrap();
        fs::write(&media_path, &canonical_media).unwrap();
        let database = Connection::open(&media_path).unwrap();
        assert_eq!(database.execute(sql, []).unwrap(), 1);
        drop(database);
        refresh_database_declarations(output.path(), &result, "pt-BR", "systemMedia");
        let error = build(&BuildOptions {
            source: source.path().to_path_buf(),
            output: output.path().to_path_buf(),
            context: context_path(),
        })
        .unwrap_err();
        assert!(
            error.contains("media")
                || error.contains("thumbnail")
                || error.contains("semantically equivalent"),
            "mutation {label} produced an unexpected error: {error}"
        );
    }

    fs::write(&result_path, &canonical_result).unwrap();
    fs::write(&checksum_path, &canonical_checksums).unwrap();
    fs::write(&system_path, &canonical_system).unwrap();
    fs::write(&media_path, &canonical_media).unwrap();
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
    let tampered_cas = b"tampered CAS object";
    fs::write(output.path().join(cas_relative), tampered_cas).unwrap();
    replace_checksum_entry(
        &output.path().join(&result.checksum_file),
        cas_relative,
        &sha256(tampered_cas),
    );
    let refreshed_checksums =
        fs::read_to_string(output.path().join(&result.checksum_file)).unwrap();
    assert!(refreshed_checksums.contains(&format!(
        "{}  {cas_relative}",
        sha256(&fs::read(output.path().join(cas_relative)).unwrap())
    )));
    let error = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(
        error.contains("CAS object")
            || error.contains("content hash")
            || error.contains("checksum mismatch"),
        "tampered CAS with refreshed checksum produced an unexpected error: {error}"
    );
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

fn find_manifest_by_id(root: &Path, id: &str) -> Option<PathBuf> {
    let mut stack = vec![root.to_path_buf()];
    while let Some(path) = stack.pop() {
        for entry in fs::read_dir(path).ok()?.filter_map(Result::ok) {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.file_name().is_some_and(|name| name == "entity.json") {
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
