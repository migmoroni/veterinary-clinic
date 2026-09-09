//! Proves deterministic six-locale projection and canonical database invariants.

use crate::support::*;
use knowledge_builder::{validate, BuildOptions, LOCALES};
use rusqlite::Connection;
use std::fs;
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};

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

#[test]
fn validates_and_builds_all_locales_deterministically() {
    let validated = validate(source_root()).expect("canonical source must validate");
    assert!(validated.entity_count() > 0);
    assert!(validated.relation_count() > 0);

    let first_output = TestDirectory::new("first-build");
    let first = fresh_build(&BuildOptions {
        source: source_root(),
        output: first_output.path().to_path_buf(),
        context: context_path(),
    })
    .expect("first build must succeed");
    assert_eq!(first.locales.len(), LOCALES.len());
    assert_eq!(first.source_digest_sha256, validated.source_digest_sha256());

    let second_output = TestDirectory::new("second-build");
    let second = fresh_build(&BuildOptions {
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
    assert_eq!(first.builder_version, "0.5.0");
    assert_eq!(first.system_schema_version, 5);
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

    let reused = verify_reuse(&BuildOptions {
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
        assert_eq!(user_version, 5);
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
        assert_eq!(taxonomy_count, 10);
        let taxonomies_with_terms: usize = database
            .query_row(
                "SELECT count(DISTINCT taxonomy_id) FROM taxonomy_terms",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(taxonomies_with_terms, 10);
        let removed_taxonomy_purposes: usize = database
            .query_row(
                "SELECT count(*) FROM taxonomy_registry WHERE purpose IN ('vaccine_profile','life_stage','therapeutic_scope')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(removed_taxonomy_purposes, 0);
        let forbidden_table_count: usize = database
            .query_row(
                "SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name IN ('product_target_terms','product_vaccine_profile_terms','product_life_stage_terms','product_therapeutic_scope_terms','product_targets','product_vaccine_profiles','product_life_stages','product_therapeutic_scopes')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(forbidden_table_count, 0);
        let direct_attribute_columns: usize = database
            .query_row(
                "SELECT count(*) FROM pragma_table_info('product_catalog_items') WHERE name IN ('applicable_life_stages_json','therapeutic_spectrum')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(direct_attribute_columns, 2);
        let invalid_direct_attributes: usize = database
            .query_row(
                "SELECT count(*) FROM product_catalog_items WHERE json_type(applicable_life_stages_json) <> 'array' OR therapeutic_spectrum NOT IN ('broad','narrow')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(invalid_direct_attributes, 0);
        let direct_attribute_rows: (usize, usize) = database
            .query_row(
                "SELECT sum(json_array_length(applicable_life_stages_json) > 0), sum(therapeutic_spectrum IS NOT NULL) FROM product_catalog_items",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(direct_attribute_rows, (1, 9));
        let vaccine_aliases_are_searchable: usize = database
            .query_row(
                "SELECT count(*) FROM product_catalog_items product JOIN json_each(product.aliases_json) alias WHERE alias.value = 'V10' AND EXISTS (SELECT 1 FROM entity_search_terms search WHERE search.entity_type = 'product' AND search.entity_id = product.id AND search.provenance = 'entity.alias' AND search.normalized_value = 'v10')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(vaccine_aliases_are_searchable > 0);
        let removed_search_provenance: usize = database
            .query_row(
                "SELECT count(*) FROM entity_search_terms WHERE provenance IN ('vaccineProfile.label','vaccineProfile.alias','lifeStage.label','lifeStage.alias','therapeuticScope.label','therapeuticScope.alias')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(removed_search_provenance, 0);
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
