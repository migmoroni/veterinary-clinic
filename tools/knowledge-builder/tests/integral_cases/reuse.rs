//! Proves finalized-version reuse and rejection of divergent build context.

use crate::support::*;
use knowledge_builder::{
    validate, BuildContext, BuildOptions, KnowledgeBuilderError, VerificationError,
};
use rusqlite::Connection;
use std::{fs, path::Path};

const FIXTURE_DOG: &str =
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris";
const FIXTURE_TOY: &str =
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris.poodle.poodleToy";

#[test]
fn minimal_fixture_builds_and_tampered_version_is_not_reused() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let validated = validate(&fixture).expect("minimal fixture must validate");
    assert_eq!(validated.entity_count(), 29);
    assert_eq!(
        validated.life_term_rank(FIXTURE_TOY),
        Some(knowledge_builder::LifeRank::Variety)
    );
    assert_eq!(validated.life_ancestors(FIXTURE_TOY).len(), 9);
    assert!(validated.life_is_ancestor(FIXTURE_DOG, FIXTURE_TOY));
    assert!(validated.life_entity_for_term("structuralOnly").is_none());
    let output = TestDirectory::new("minimal-fixture");
    let result = fresh_build(&BuildOptions {
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
    let projected_life = database
        .query_row(
            &format!("SELECT life.size_term_key, term.label, life.aliases_json FROM life_reference_items life JOIN entity_taxonomy_terms relation ON relation.entity_type = 'life' AND relation.entity_id = life.id AND relation.taxonomy_id = 'life-types' JOIN taxonomy_terms term ON term.taxonomy_id = relation.taxonomy_id AND term.term_key = relation.term_key WHERE relation.term_key = '{FIXTURE_TOY}'"),
            [],
            |row| Ok((row.get::<_, Option<String>>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?)),
        )
        .unwrap();
    assert_eq!(projected_life.0.as_deref(), Some("default"));
    assert_eq!(projected_life.1, "poodle-toy");
    assert_eq!(projected_life.2, "[]");
    let toy_id: String = database
        .query_row(
            &format!("SELECT entity_id FROM entity_taxonomy_terms WHERE entity_type = 'life' AND taxonomy_id = 'life-types' AND term_key = '{FIXTURE_TOY}'"),
            [],
            |row| row.get(0),
        )
        .unwrap();
    let canonical_profile: (String, String, String, usize) = database
        .query_row(
            knowledge_builder::life_queries::ENTITY_WITH_TYPE,
            [&toy_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap();
    assert_eq!(
        canonical_profile,
        (
            toy_id.clone(),
            FIXTURE_TOY.to_string(),
            "poodle-toy".to_string(),
            9
        )
    );
    let query_plan = database
        .prepare(&format!(
            "EXPLAIN QUERY PLAN {}",
            knowledge_builder::life_queries::APPLICABLE_DESCENDANTS
        ))
        .unwrap()
        .query_map([format!("[\"{FIXTURE_DOG}\"]")], |row| {
            row.get::<_, String>(3)
        })
        .unwrap()
        .collect::<Result<Vec<_>, _>>()
        .unwrap()
        .join(" ");
    assert!(
        query_plan.contains("idx_taxonomy_terms_child_order"),
        "unexpected applicability query plan: {query_plan}"
    );
    let en_database =
        Connection::open(output.path().join(&result.locales["en-US"].system.path)).unwrap();
    let life_search: Vec<(String, String)> = en_database
        .prepare(
            "SELECT value, provenance FROM entity_search_terms WHERE entity_type = 'life' AND entity_id = ?1 ORDER BY sort_order",
        )
        .unwrap()
        .query_map([&toy_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap()
        .collect::<Result<_, _>>()
        .unwrap();
    assert_eq!(
        life_search,
        vec![
            ("Toy Poodle".to_string(), "entity.alias".to_string()),
            ("poodle-toy".to_string(), "type.label".to_string()),
        ]
    );
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM taxonomy_terms term LEFT JOIN entity_taxonomy_terms relation ON relation.taxonomy_id = term.taxonomy_id AND relation.term_key = term.term_key AND relation.entity_type = 'life' WHERE term.taxonomy_id = 'life-types' AND relation.entity_id IS NULL",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        1
    );
    for expected_length in [1, 2, 3] {
        assert_eq!(
            database
                .query_row(
                    "SELECT count(*) FROM product_catalog_items WHERE json_array_length(applicable_life_stages_json) = ?1",
                    [expected_length],
                    |row| row.get::<_, usize>(0),
                )
                .unwrap(),
            1
        );
    }
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM product_catalog_items WHERE therapeutic_spectrum IN ('broad','narrow')",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        2
    );
    assert_eq!(
        database
            .query_row(
                "SELECT count(*) FROM product_catalog_items product JOIN json_each(product.aliases_json) alias WHERE product.id = '33333333-3333-4333-8333-333333333331' AND alias.value IN ('V10','polivalente') AND EXISTS (SELECT 1 FROM entity_search_terms search WHERE search.entity_type = 'product' AND search.entity_id = product.id AND search.provenance = 'entity.alias' AND search.normalized_value = lower(alias.value))",
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        2
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
                &format!("WITH RECURSIVE ancestors(term_key, parent_term_key, depth) AS (SELECT term_key, parent_term_key, 0 FROM taxonomy_terms WHERE taxonomy_id = 'life-types' AND term_key = '{FIXTURE_TOY}' UNION ALL SELECT parent.term_key, parent.parent_term_key, child.depth + 1 FROM taxonomy_terms parent JOIN ancestors child ON child.parent_term_key = parent.term_key WHERE parent.taxonomy_id = 'life-types') SELECT count(*) FROM ancestors"),
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        10
    );
    assert_eq!(
        database
            .query_row(
                &format!("WITH RECURSIVE applicable(product_id, term_key) AS (SELECT product.id, authored.value FROM product_catalog_items product JOIN json_each(product.applicable_taxon_term_keys_json) authored UNION SELECT applicable.product_id, child.term_key FROM applicable JOIN taxonomy_terms child ON child.taxonomy_id = 'life-types' AND child.parent_term_key = applicable.term_key) SELECT count(DISTINCT product_id) FROM applicable WHERE term_key = '{FIXTURE_TOY}'"),
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        5
    );
    assert_eq!(
        database
            .query_row(
                &format!("WITH RECURSIVE applicable(protocol_id, term_key) AS (SELECT protocol.id, authored.value FROM treatment_protocols protocol JOIN json_each(protocol.applicable_taxon_term_keys_json) authored UNION SELECT applicable.protocol_id, child.term_key FROM applicable JOIN taxonomy_terms child ON child.taxonomy_id = 'life-types' AND child.parent_term_key = applicable.term_key) SELECT count(DISTINCT protocol_id) FROM applicable WHERE term_key = '{FIXTURE_TOY}'"),
                [],
                |row| row.get::<_, usize>(0),
            )
            .unwrap(),
        1
    );

    let result_path = output.path().join("versions/1/build-result.json");
    let canonical_result = fs::read(&result_path).unwrap();
    fs::write(&result_path, b"{").unwrap();
    let error = verify_reuse(&BuildOptions {
        source: fixture.clone(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(matches!(
        error,
        KnowledgeBuilderError::Verification(VerificationError::Json { .. })
    ));

    fs::write(&result_path, &canonical_result).unwrap();
    let mut value: serde_json::Value = serde_json::from_slice(&canonical_result).unwrap();
    value["unexpectedField"] = serde_json::Value::Bool(true);
    fs::write(&result_path, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    let error = verify_reuse(&BuildOptions {
        source: fixture.clone(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("schema violation"));

    fs::write(&result_path, canonical_result).unwrap();
    fs::write(output.path().join("versions/1/unexpected.txt"), b"tampered").unwrap();
    let error = verify_reuse(&BuildOptions {
        source: fixture,
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap_err();
    assert!(error.contains("additional files"));
}

#[test]
fn divergent_context_cannot_overwrite_finalized_version() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let output = TestDirectory::new("divergent-version");
    fresh_build(&BuildOptions {
        source: fixture.clone(),
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
    let error = verify_reuse(&BuildOptions {
        source: fixture.clone(),
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
    let public = fresh_build(&BuildOptions {
        source: fixture,
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
