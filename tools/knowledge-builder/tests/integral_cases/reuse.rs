//! Proves finalized-version reuse and rejection of divergent build context.

use crate::support::*;
use knowledge_builder::{build, validate, BuildContext, BuildOptions};
use rusqlite::Connection;
use std::{fs, path::Path};

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
fn divergent_context_cannot_overwrite_finalized_version() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let output = TestDirectory::new("divergent-version");
    build(&BuildOptions {
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
    let error = build(&BuildOptions {
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
    let public = build(&BuildOptions {
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
