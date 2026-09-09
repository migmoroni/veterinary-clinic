//! Proves that refreshed declarations cannot legitimize artifact tampering.

use crate::support::*;
use knowledge_builder::{
    validate, BuildOptions, KnowledgeBuilderError, VerificationError, LOCALES,
};
use rusqlite::Connection;
use std::{fs, path::Path};

#[test]
fn artifact_verifier_recalculates_manifest_report_and_database_facts() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let canonical = TestDirectory::new("canonical-verifier-artifact");
    let canonical_options = BuildOptions {
        source: fixture.clone(),
        output: canonical.path().to_path_buf(),
        context: context_path(),
    };
    let result = fresh_build(&canonical_options).unwrap();

    let run_case = |label: &str, mutate: &dyn Fn(&Path, &knowledge_builder::BuildResult)| {
        let output = TestDirectory::new(label);
        copy_tree(canonical.path(), output.path());
        let options = BuildOptions {
            source: fixture.clone(),
            output: output.path().to_path_buf(),
            context: context_path(),
        };
        mutate(output.path(), &result);
        verify_reuse(&options).unwrap_err()
    };

    let error = run_case("invalid-report-json", &|output, result| {
        fs::write(output.join(&result.projection.report_path), b"{").unwrap();
        refresh_projection_declarations(output, result);
    });
    assert!(matches!(
        error,
        KnowledgeBuilderError::Verification(VerificationError::Json { .. })
    ));

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

    let error = run_case("tampered-evidence-digest", &|output, result| {
        let report_path = output.join(&result.projection.report_path);
        let mut report: serde_json::Value =
            serde_json::from_slice(&fs::read(&report_path).unwrap()).unwrap();
        report["locales"]["pt-BR"]["evidenceDigestSha256"] =
            serde_json::Value::String("0".repeat(64));
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
    assert!(matches!(
        error,
        KnowledgeBuilderError::Verification(VerificationError::Database {
            stage: "verify database contract",
            ..
        })
    ));

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

    let error = run_case("tampered-application-id", &|output, result| {
        let path = output.join(&result.locales["pt-BR"].system.path);
        let database = Connection::open(&path).unwrap();
        database.execute_batch("PRAGMA application_id = 1").unwrap();
        drop(database);
        refresh_database_declarations(output, result, "pt-BR", "system");
    });
    assert!(
        error.contains("technical identity mismatch"),
        "unexpected application_id error: {error}"
    );

    let error = run_case("tampered-user-version", &|output, result| {
        let path = output.join(&result.locales["pt-BR"].system.path);
        let database = Connection::open(&path).unwrap();
        database.execute_batch("PRAGMA user_version = 1").unwrap();
        drop(database);
        refresh_database_declarations(output, result, "pt-BR", "system");
    });
    assert!(
        error.contains("technical identity mismatch"),
        "unexpected user_version error: {error}"
    );

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
    let result = fresh_build(&options).expect("canonical source must build");
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
            "applicable-life-stages",
            "UPDATE product_catalog_items SET applicable_life_stages_json = '[\"adult\"]' WHERE json_array_length(applicable_life_stages_json) > 0",
        ),
        (
            "therapeutic-spectrum",
            "UPDATE product_catalog_items SET therapeutic_spectrum = 'narrow' WHERE therapeutic_spectrum = 'broad'",
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
        let error = verify_reuse(&options).unwrap_err();
        if label == "missing-required-taxonomy" {
            assert!(matches!(
                error,
                KnowledgeBuilderError::Verification(VerificationError::Invalid { .. })
            ));
        } else {
            assert!(matches!(
                error,
                KnowledgeBuilderError::Verification(VerificationError::Database {
                    stage: "compare semantic rows",
                    ..
                })
            ));
        }
    }
}

#[test]
fn structural_and_markdown_media_share_cas_and_real_jpeg_thumbnail() {
    let source = TestDirectory::new("media-source");
    copy_tree(&source_root(), source.path());
    let manifest = find_manifest_by_type(source.path(), "condition").unwrap();
    let entity_directory = manifest.parent().unwrap();
    let media_directory = entity_directory.join(MEDIA_DIRECTORY_NAME);
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
        "cover": "./_media/cover.png",
        "gallery": ["./_media/lateral.png"]
    });
    fs::write(&manifest, serde_json::to_vec_pretty(&entity).unwrap()).unwrap();
    let pt_br = entity_directory
        .join(entity["contentPath"].as_str().unwrap())
        .join("pt-BR.md");
    let markdown = fs::read_to_string(&pt_br).unwrap();
    fs::write(
        &pt_br,
        format!("{markdown}\n\n![Capa](../_media/cover.png)\n"),
    )
    .unwrap();

    validate(source.path()).expect("structural and localized media must validate");
    let output = TestDirectory::new("media-build");
    let result = fresh_build(&BuildOptions {
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
        let error = verify_reuse(&BuildOptions {
            source: source.path().to_path_buf(),
            output: output.path().to_path_buf(),
            context: context_path(),
        })
        .unwrap_err();
        assert!(
            matches!(
                error,
                KnowledgeBuilderError::Verification(VerificationError::Invalid { .. })
            ),
            "mutation {label} did not fail media verification"
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
    let error = verify_reuse(&BuildOptions {
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
        let error = verify_reuse(&BuildOptions {
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
    let error = verify_reuse(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(matches!(
        error,
        KnowledgeBuilderError::Verification(VerificationError::Image { .. })
    ));

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
    let error = verify_reuse(&BuildOptions {
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
    let error = verify_reuse(&BuildOptions {
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
    let canonical_cas = fs::read(output.path().join(cas_relative)).unwrap();
    fs::remove_file(output.path().join(cas_relative)).unwrap();
    let error = verify_reuse(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(matches!(
        error,
        KnowledgeBuilderError::Verification(VerificationError::Io { .. })
    ));
    fs::write(output.path().join(cas_relative), canonical_cas).unwrap();

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
    let error = verify_reuse(&BuildOptions {
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
