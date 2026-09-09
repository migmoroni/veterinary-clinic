//! Exercises source discovery and validation against isolated filesystem copies.

use crate::support::*;
use knowledge_builder::validate;
use std::{fs, path::Path};

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
        .join("taxonomies/product-target")
        .join(ENTITY_MANIFEST_FILENAME);
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&original).unwrap()).unwrap();
    taxonomy["id"] = serde_json::Value::String("fixture-product-target-duplicate".to_string());
    let duplicate_directory = duplicate.path().join("taxonomies/product-target-duplicate");
    fs::create_dir_all(&duplicate_directory).unwrap();
    fs::write(
        duplicate_directory.join(ENTITY_MANIFEST_FILENAME),
        serde_json::to_vec_pretty(&taxonomy).unwrap(),
    )
    .unwrap();
    let error = validate(duplicate.path()).unwrap_err().to_string();
    assert!(error.contains("duplicate taxonomy owner product:target"));
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
        entity_directory.join(CONTENT_DIRECTORY_NAME),
        entity_directory.join("localized-editorial"),
    )
    .unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    value["contentPath"] = serde_json::Value::String("./localized-editorial".to_string());
    fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    let error = validate(editorial_copy.path()).unwrap_err().to_string();
    assert!(error.contains("contentPath") || error.contains("unrecognized source file"));

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
fn product_direct_attributes_are_closed_ordered_and_semantically_scoped() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let invalid_stages = [
        ("empty", serde_json::json!([])),
        (
            "too-many",
            serde_json::json!(["newborn", "young", "adult", "adult"]),
        ),
        ("duplicate", serde_json::json!(["young", "young"])),
        ("unknown", serde_json::json!(["senior"])),
        ("out-of-order", serde_json::json!(["adult", "newborn"])),
    ];
    for (label, stages) in invalid_stages {
        let copy = TestDirectory::new(&format!("invalid-product-stages-{label}"));
        copy_tree(&fixture, copy.path());
        let manifest =
            find_manifest_by_id(copy.path(), "44444444-4444-4444-8444-444444444444").unwrap();
        let mut product: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        product["applicableLifeStages"] = stages;
        fs::write(&manifest, serde_json::to_vec_pretty(&product).unwrap()).unwrap();
        assert!(validate(copy.path()).is_err(), "{label} must be rejected");
    }

    for (label, spectrum) in [("unknown", "wide"), ("non-medication", "broad")] {
        let copy = TestDirectory::new(&format!("invalid-product-spectrum-{label}"));
        copy_tree(&fixture, copy.path());
        let manifest =
            find_manifest_by_id(copy.path(), "22222222-2222-4222-8222-222222222222").unwrap();
        let mut product: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        product["therapeuticSpectrum"] = serde_json::json!(spectrum);
        fs::write(&manifest, serde_json::to_vec_pretty(&product).unwrap()).unwrap();
        let error = validate(copy.path()).unwrap_err().to_string();
        assert!(
            error.contains("schema violation") || error.contains("incompatible with product type"),
            "unexpected {label} error: {error}"
        );
    }

    let removed_taxonomy = TestDirectory::new("removed-product-taxonomy");
    copy_tree(&fixture, removed_taxonomy.path());
    let taxonomy = find_manifest_by_id(removed_taxonomy.path(), "fixture-product-target").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&taxonomy).unwrap()).unwrap();
    value["purpose"] = serde_json::json!("vaccine_profile");
    fs::write(&taxonomy, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(removed_taxonomy.path())
        .unwrap_err()
        .to_string()
        .contains("unsupported taxonomy domain and purpose"));
}

#[test]
fn product_direct_attributes_participate_in_the_logical_digest() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let original = validate(&fixture).unwrap();

    for (label, field, replacement) in [
        (
            "life-stage-digest",
            "applicableLifeStages",
            serde_json::json!(["newborn", "adult"]),
        ),
        (
            "spectrum-digest",
            "therapeuticSpectrum",
            serde_json::json!("narrow"),
        ),
    ] {
        let copy = TestDirectory::new(label);
        copy_tree(&fixture, copy.path());
        let manifest =
            find_manifest_by_id(copy.path(), "44444444-4444-4444-8444-444444444444").unwrap();
        let mut product: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        product[field] = replacement;
        fs::write(&manifest, serde_json::to_vec_pretty(&product).unwrap()).unwrap();
        let changed = validate(copy.path()).unwrap();
        assert_ne!(
            original.source_digest_sha256(),
            changed.source_digest_sha256()
        );
    }
}
