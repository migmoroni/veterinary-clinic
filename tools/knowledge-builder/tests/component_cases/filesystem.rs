//! Exercises source discovery and validation against isolated filesystem copies.

use crate::support::*;
use knowledge_builder::validate;
use std::{fs, path::Path};

const FIXTURE_DOG: &str =
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris";
const FIXTURE_POODLE: &str =
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris.poodle";
const FIXTURE_TOY: &str =
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris.poodle.poodleToy";
const FIXTURE_STRUCTURAL_ONLY: &str = "structuralOnly";

fn standards_path(root: &Path) -> std::path::PathBuf {
    root.join("_standards/sections.json")
}

fn read_json(path: &Path) -> serde_json::Value {
    serde_json::from_slice(&fs::read(path).unwrap()).unwrap()
}

fn write_json(path: &Path, value: &serde_json::Value) {
    fs::write(path, serde_json::to_vec_pretty(value).unwrap()).unwrap();
}

fn add_editorial_content(manifest: &Path, sections: usize) {
    let directory = manifest.parent().unwrap().join(CONTENT_DIRECTORY_NAME);
    fs::create_dir(&directory).unwrap();
    let markdown = (1..=sections)
        .map(|number| format!("# {number}\n\nSection {number}.\n"))
        .collect::<Vec<_>>()
        .join("\n");
    for locale in knowledge_builder::LOCALES {
        fs::write(directory.join(format!("{locale}.md")), &markdown).unwrap();
    }
}

type InvalidStandardCase = (&'static str, fn(&Path), &'static str);

#[test]
fn section_standards_are_closed_resolved_and_digest_relevant() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let baseline = validate(&fixture).unwrap();
    assert_eq!(baseline.section_standard_count(), 1);
    assert_eq!(
        baseline
            .section_standard("fixture.manufacturer.profile")
            .unwrap()
            .section_keys,
        ["about"]
    );

    let invalid_cases: [InvalidStandardCase; 5] = [
        (
            "unordered-standards",
            |root: &Path| {
                let path = standards_path(root);
                let mut value = read_json(&path);
                let original = value["standards"][0].clone();
                value["standards"].as_array_mut().unwrap().insert(
                    0,
                    serde_json::json!({"key":"z.profile","entityType":"product","sectionKeys":["about"]}),
                );
                value["standards"].as_array_mut().unwrap().push(original);
                write_json(&path, &value);
            },
            "strictly ordered",
        ),
        (
            "duplicate-standard-key",
            |root: &Path| {
                let path = standards_path(root);
                let mut value = read_json(&path);
                let duplicate = value["standards"][0].clone();
                value["standards"].as_array_mut().unwrap().push(duplicate);
                write_json(&path, &value);
            },
            "duplicate section standard key",
        ),
        (
            "unknown-standard-reference",
            |root: &Path| {
                let manifest = find_manifest_by_type(root, "manufacturer").unwrap();
                let mut value = read_json(&manifest);
                value["sectionStandardKey"] = serde_json::json!("missing.profile");
                write_json(&manifest, &value);
            },
            "unknown section standard",
        ),
        (
            "wrong-standard-type",
            |root: &Path| {
                let path = standards_path(root);
                let mut value = read_json(&path);
                value["standards"][0]["entityType"] = serde_json::json!("product");
                write_json(&path, &value);
            },
            "belongs to entityType product",
        ),
        (
            "standard-without-consumer",
            |root: &Path| {
                let path = standards_path(root);
                let mut value = read_json(&path);
                value["standards"].as_array_mut().unwrap().push(
                    serde_json::json!({"key":"unused.profile","entityType":"product","sectionKeys":["about"]}),
                );
                write_json(&path, &value);
            },
            "has no consuming entity",
        ),
    ];
    for (label, mutate, expected) in invalid_cases {
        let copy = TestDirectory::new(label);
        copy_tree(&fixture, copy.path());
        mutate(copy.path());
        let error = validate(copy.path()).unwrap_err().to_string();
        assert!(
            error.contains(expected),
            "unexpected {label} error: {error}"
        );
    }

    let missing = TestDirectory::new("missing-section-standards");
    copy_tree(&fixture, missing.path());
    fs::remove_file(standards_path(missing.path())).unwrap();
    assert!(validate(missing.path())
        .unwrap_err()
        .to_string()
        .contains("registry is required"));

    let malformed = TestDirectory::new("malformed-section-standards");
    copy_tree(&fixture, malformed.path());
    fs::write(standards_path(malformed.path()), b"{").unwrap();
    assert!(validate(malformed.path())
        .unwrap_err()
        .to_string()
        .contains("invalid JSON"));

    let extra = TestDirectory::new("additional-section-standards-file");
    copy_tree(&fixture, extra.path());
    fs::write(extra.path().join("_standards/extra.json"), b"{}").unwrap();
    assert!(validate(extra.path())
        .unwrap_err()
        .to_string()
        .contains("unsupported file inside _standards"));

    let misplaced = TestDirectory::new("misplaced-section-standards");
    copy_tree(&fixture, misplaced.path());
    let owner = find_manifest_by_type(misplaced.path(), "product").unwrap();
    let nested = owner.parent().unwrap().join("_standards");
    fs::create_dir(&nested).unwrap();
    fs::copy(
        standards_path(misplaced.path()),
        nested.join("sections.json"),
    )
    .unwrap();
    assert!(validate(misplaced.path())
        .unwrap_err()
        .to_string()
        .contains("allowed only at the source root"));

    let invalid_documents = [
        serde_json::json!({"schemaVersion":1,"standards":[],"extra":true}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":"fixture.manufacturer.profile","entityType":"manufacturer","sectionKeys":[],"extra":true}]}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":"fixture.manufacturer.profile","entityType":"taxonomy","sectionKeys":["about"]}]}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":"fixture.manufacturer.profile","entityType":"manufacturer","sectionKeys":[]}]}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":"fixture.manufacturer.profile","entityType":"manufacturer","sectionKeys":["about","about"]}]}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":" invalid ","entityType":"manufacturer","sectionKeys":["about"]}]}),
        serde_json::json!({"schemaVersion":1,"standards":[{"key":"fixture.manufacturer.profile","entityType":"manufacturer","sectionKeys":(0..65).map(|number| format!("section{number}")).collect::<Vec<_>>()}]}),
    ];
    for (index, document) in invalid_documents.into_iter().enumerate() {
        let copy = TestDirectory::new(&format!("invalid-standard-schema-{index}"));
        copy_tree(&fixture, copy.path());
        write_json(&standards_path(copy.path()), &document);
        assert!(validate(copy.path())
            .unwrap_err()
            .to_string()
            .contains("schema violation"));
    }

    for (label, field, value) in [
        ("legacy-sections", "sections", serde_json::json!([])),
        (
            "legacy-content-path",
            "contentPath",
            serde_json::json!("./_content"),
        ),
        (
            "legacy-section-number",
            "sectionNumber",
            serde_json::json!(1),
        ),
    ] {
        let copy = TestDirectory::new(label);
        copy_tree(&fixture, copy.path());
        let manifest = find_manifest_by_type(copy.path(), "manufacturer").unwrap();
        let mut entity = read_json(&manifest);
        entity[field] = value;
        write_json(&manifest, &entity);
        assert!(validate(copy.path())
            .unwrap_err()
            .to_string()
            .contains("schema violation"));
    }

    let missing_content = TestDirectory::new("standard-reference-without-content");
    copy_tree(&fixture, missing_content.path());
    let manifest = find_manifest_by_type(missing_content.path(), "manufacturer").unwrap();
    fs::remove_dir_all(manifest.parent().unwrap().join(CONTENT_DIRECTORY_NAME)).unwrap();
    assert!(validate(missing_content.path())
        .unwrap_err()
        .to_string()
        .contains("cannot resolve _content"));

    let orphan_content = TestDirectory::new("content-without-standard-reference");
    copy_tree(&fixture, orphan_content.path());
    let manifest = find_manifest_by_type(orphan_content.path(), "manufacturer").unwrap();
    let mut entity = read_json(&manifest);
    entity.as_object_mut().unwrap().remove("sectionStandardKey");
    write_json(&manifest, &entity);
    let error = validate(orphan_content.path()).unwrap_err().to_string();
    assert!(error.contains("_content requires a sectionStandardKey"));

    let changed = TestDirectory::new("changed-section-standard");
    copy_tree(&fixture, changed.path());
    let registry = standards_path(changed.path());
    let mut standards = read_json(&registry);
    standards["standards"][0]["key"] = serde_json::json!("fixture.manufacturer.summary");
    write_json(&registry, &standards);
    let manifest = find_manifest_by_type(changed.path(), "manufacturer").unwrap();
    let mut entity = read_json(&manifest);
    entity["sectionStandardKey"] = serde_json::json!("fixture.manufacturer.summary");
    write_json(&manifest, &entity);
    assert_ne!(
        baseline.source_digest_sha256(),
        validate(changed.path()).unwrap().source_digest_sha256()
    );

    let composition = TestDirectory::new("changed-section-standard-composition");
    copy_tree(&fixture, composition.path());
    let registry = standards_path(composition.path());
    let mut standards = read_json(&registry);
    standards["standards"][0]["sectionKeys"] = serde_json::json!(["about", "references"]);
    write_json(&registry, &standards);
    let manifest = find_manifest_by_type(composition.path(), "manufacturer").unwrap();
    let content = manifest.parent().unwrap().join(CONTENT_DIRECTORY_NAME);
    for locale in knowledge_builder::LOCALES {
        let document = content.join(format!("{locale}.md"));
        let markdown = fs::read_to_string(&document).unwrap();
        fs::write(&document, format!("{markdown}\n# 2\n\nReferences.\n")).unwrap();
    }
    let composition_digest = validate(composition.path())
        .unwrap()
        .source_digest_sha256()
        .to_string();
    assert_ne!(baseline.source_digest_sha256(), composition_digest);

    let reordered = TestDirectory::new("changed-section-standard-order");
    copy_tree(composition.path(), reordered.path());
    let registry = standards_path(reordered.path());
    let mut standards = read_json(&registry);
    standards["standards"][0]["sectionKeys"] = serde_json::json!(["references", "about"]);
    write_json(&registry, &standards);
    assert_ne!(
        composition_digest,
        validate(reordered.path()).unwrap().source_digest_sha256()
    );

    let multiple = TestDirectory::new("shared-and-distinct-section-standards");
    copy_tree(&fixture, multiple.path());
    let registry = standards_path(multiple.path());
    let mut standards = read_json(&registry);
    standards["standards"].as_array_mut().unwrap().extend([
        serde_json::json!({"key":"fixture.product.a","entityType":"product","sectionKeys":["about"]}),
        serde_json::json!({"key":"fixture.product.b","entityType":"product","sectionKeys":["about","references"]}),
    ]);
    write_json(&registry, &standards);
    for (id, key, sections) in [
        (
            "22222222-2222-4222-8222-222222222222",
            "fixture.product.a",
            1,
        ),
        (
            "33333333-3333-4333-8333-333333333331",
            "fixture.product.a",
            1,
        ),
        (
            "33333333-3333-4333-8333-333333333332",
            "fixture.product.b",
            2,
        ),
    ] {
        let manifest = find_manifest_by_id(multiple.path(), id).unwrap();
        let mut entity = read_json(&manifest);
        entity["sectionStandardKey"] = serde_json::json!(key);
        write_json(&manifest, &entity);
        add_editorial_content(&manifest, sections);
    }
    let validated = validate(multiple.path()).unwrap();
    assert_eq!(validated.section_standard_count(), 3);
}

#[test]
fn minimal_fixture_rejects_missing_and_duplicate_taxonomy_owners() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");

    let missing = TestDirectory::new("minimal-missing-taxonomy");
    copy_tree(&fixture, missing.path());
    fs::remove_dir_all(missing.path().join("catalog/products/taxonomies/target")).unwrap();
    let error = validate(missing.path()).unwrap_err().to_string();
    assert!(error.contains("missing canonical taxonomy product:target"));

    let duplicate = TestDirectory::new("minimal-duplicate-taxonomy");
    copy_tree(&fixture, duplicate.path());
    let original = duplicate
        .path()
        .join("catalog/products/taxonomies/target")
        .join(ENTITY_MANIFEST_FILENAME);
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&original).unwrap()).unwrap();
    taxonomy["id"] = serde_json::Value::String("fixture-product-target-duplicate".to_string());
    let duplicate_directory = duplicate
        .path()
        .join("catalog/products/taxonomies/target-duplicate");
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
fn hierarchical_taxonomies_use_structure_without_interpreting_keys() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let baseline = validate(&fixture).unwrap();
    let valid = TestDirectory::new("opaque-hierarchical-taxonomy");
    copy_tree(&fixture, valid.path());
    let manifest = find_manifest_by_id(valid.path(), "fixture-product-classification").unwrap();
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    let localized = taxonomy["terms"][0]["localizedContent"].clone();
    taxonomy["terms"]
        .as_array_mut()
        .unwrap()
        .push(serde_json::json!({
            "key": "administrationRoute.epidural",
            "localizedContent": localized.clone(),
            "children": [{
                "key": "opaqueChildWithoutParentPrefix",
                "localizedContent": localized
            }]
        }));
    fs::write(&manifest, serde_json::to_vec_pretty(&taxonomy).unwrap()).unwrap();
    let validated = validate(valid.path()).expect("compound roots and opaque child keys are valid");
    assert_eq!(validated.relation_count(), baseline.relation_count() + 1);

    let reordered = TestDirectory::new("reordered-taxonomy-siblings");
    copy_tree(&fixture, reordered.path());
    let manifest = find_manifest_by_id(reordered.path(), "fixture-product-type").unwrap();
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    taxonomy["terms"].as_array_mut().unwrap().swap(0, 1);
    fs::write(&manifest, serde_json::to_vec_pretty(&taxonomy).unwrap()).unwrap();
    assert_ne!(
        validate(reordered.path()).unwrap().source_digest_sha256(),
        baseline.source_digest_sha256()
    );

    let moved = TestDirectory::new("moved-taxonomy-identity");
    copy_tree(&fixture, moved.path());
    let manifest = find_manifest_by_id(moved.path(), "fixture-product-type").unwrap();
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    let child = taxonomy["terms"][1]["children"]
        .as_array_mut()
        .unwrap()
        .remove(0);
    taxonomy["terms"][1]
        .as_object_mut()
        .unwrap()
        .remove("children");
    taxonomy["terms"][0]["children"] = serde_json::json!([child]);
    fs::write(&manifest, serde_json::to_vec_pretty(&taxonomy).unwrap()).unwrap();
    let moved_source = validate(moved.path()).expect("moving a key does not rename it");
    assert_ne!(
        moved_source.source_digest_sha256(),
        baseline.source_digest_sha256()
    );
}

#[test]
fn hierarchical_taxonomy_schema_and_deep_diagnostics_are_strict() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    for (label, mutate) in [
        ("empty-children", "empty"),
        ("deep-parent-key", "parentKey"),
        ("deep-order", "order"),
    ] {
        let copy = TestDirectory::new(&format!("invalid-taxonomy-{label}"));
        copy_tree(&fixture, copy.path());
        let manifest = find_manifest_by_id(copy.path(), "fixture-product-type").unwrap();
        let mut taxonomy: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        match mutate {
            "empty" => taxonomy["terms"][1]["children"] = serde_json::json!([]),
            "parentKey" => {
                taxonomy["terms"][1]["children"][0]["parentKey"] = serde_json::json!("medication")
            }
            "order" => taxonomy["terms"][1]["children"][0]["order"] = serde_json::json!(0),
            _ => unreachable!(),
        }
        fs::write(&manifest, serde_json::to_vec_pretty(&taxonomy).unwrap()).unwrap();
        assert!(
            validate(copy.path())
                .unwrap_err()
                .to_string()
                .contains("schema violation"),
            "{label} must be rejected"
        );
    }

    let duplicate = TestDirectory::new("duplicate-deep-taxonomy-key");
    copy_tree(&fixture, duplicate.path());
    let manifest = find_manifest_by_id(duplicate.path(), "fixture-product-type").unwrap();
    let mut taxonomy: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    let term = taxonomy["terms"][0].clone();
    taxonomy["terms"][1]["children"]
        .as_array_mut()
        .unwrap()
        .push(term);
    fs::write(&manifest, serde_json::to_vec_pretty(&taxonomy).unwrap()).unwrap();
    let error = validate(duplicate.path()).unwrap_err().to_string();
    assert!(
        error.contains("terms.1.children.1.key"),
        "unexpected error: {error}"
    );
    assert!(error.contains("duplicate term key default"));
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
    let error = validate(editorial_copy.path()).unwrap_err().to_string();
    assert!(error.contains("_content") || error.contains("unrecognized source file"));

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
    life["localizedContent"]["aliases"]
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
    let document = editorial_manifest
        .parent()
        .unwrap()
        .join(CONTENT_DIRECTORY_NAME)
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
    for (label, replacement) in [
        ("missing-life-type", serde_json::json!("missing-type")),
        ("cross-rank-life-type", serde_json::json!("default")),
    ] {
        let copy = TestDirectory::new(label);
        copy_tree(&fixture, copy.path());
        let manifest = find_manifest_containing(
            copy.path(),
            &format!("\"typeTermKey\": \"{FIXTURE_POODLE}\""),
        )
        .unwrap();
        let mut value: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        value["typeTermKey"] = replacement;
        fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
        assert!(validate(copy.path()).is_err(), "{label} must be rejected");
    }

    let forbidden_name = TestDirectory::new("life-name-is-forbidden");
    copy_tree(&fixture, forbidden_name.path());
    let manifest = find_manifest_by_type(forbidden_name.path(), "life").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    value["localizedContent"]["name"] = serde_json::json!({
        "pt-BR": "Nome", "pt-PT": "Nome", "gn-PY": "Téra", "en-US": "Name",
        "es-ES": "Nombre", "fr-FR": "Nom"
    });
    fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(forbidden_name.path())
        .unwrap_err()
        .to_string()
        .contains("schema violation"));

    let periods = TestDirectory::new("invalid-life-periods");
    copy_tree(&fixture, periods.path());
    let manifest = find_manifest_containing(
        periods.path(),
        &format!("\"typeTermKey\": \"{FIXTURE_TOY}\""),
    )
    .unwrap();
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
    value["applicableTaxonTermKeys"] = serde_json::json!([FIXTURE_DOG, FIXTURE_POODLE]);
    fs::write(&product, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(applicability.path())
        .unwrap_err()
        .to_string()
        .contains("redundant ancestor and descendant"));
}

#[test]
fn life_type_owns_hierarchy_labels_and_optional_entity_associations() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let source = validate(&fixture).expect("hierarchical life fixture must validate");
    assert_eq!(
        source.life_term_rank("eukaryota"),
        Some(knowledge_builder::LifeRank::Domain)
    );
    assert_eq!(
        source.life_term_rank(FIXTURE_TOY),
        Some(knowledge_builder::LifeRank::Variety)
    );
    assert_eq!(source.life_children(FIXTURE_POODLE), vec![FIXTURE_TOY]);
    assert_eq!(
        source.life_ancestors(FIXTURE_TOY).first(),
        Some(&"eukaryota")
    );
    assert_eq!(
        source.life_descendants(FIXTURE_DOG),
        vec![FIXTURE_POODLE, FIXTURE_TOY]
    );
    for term_key in source.life_ancestors(FIXTURE_TOY) {
        assert!(
            source.life_entity_for_term(term_key).is_some(),
            "the fixture must preserve the existing profile for {term_key}"
        );
    }
    assert!(source
        .life_entity_for_term(FIXTURE_STRUCTURAL_ONLY)
        .is_none());
    let toy = source.life_entity_for_term(FIXTURE_TOY).unwrap();
    assert_ne!(toy.id, toy.type_term_key);
    assert_eq!(
        source.life_taxon_label(FIXTURE_TOY, knowledge_builder::KnowledgeLocale::EnUs),
        Some("poodle-toy")
    );
    assert_eq!(
        source.life_entity_aliases(&toy.id, knowledge_builder::KnowledgeLocale::EnUs),
        Some(&["Toy Poodle".to_string()][..])
    );

    let duplicate = TestDirectory::new("duplicate-life-profile");
    copy_tree(&fixture, duplicate.path());
    let poodle = find_manifest_containing(
        duplicate.path(),
        &format!("\"typeTermKey\": \"{FIXTURE_POODLE}\""),
    )
    .unwrap();
    let mut value: serde_json::Value = serde_json::from_slice(&fs::read(&poodle).unwrap()).unwrap();
    value["typeTermKey"] = serde_json::json!(FIXTURE_TOY);
    fs::write(&poodle, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(duplicate.path())
        .unwrap_err()
        .to_string()
        .contains("already associated"));

    let term_alias = TestDirectory::new("life-type-term-alias");
    copy_tree(&fixture, term_alias.path());
    let taxonomy = find_manifest_containing(term_alias.path(), "\"id\": \"life-types\"").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&taxonomy).unwrap()).unwrap();
    value["terms"][0]["localizedContent"]["aliases"] = serde_json::json!({
        "pt-BR": [], "pt-PT": [], "gn-PY": [], "en-US": ["Alias"], "es-ES": [], "fr-FR": []
    });
    fs::write(&taxonomy, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(term_alias.path())
        .unwrap_err()
        .to_string()
        .contains("unsupported localized field"));

    let too_deep = TestDirectory::new("life-type-too-deep");
    copy_tree(&fixture, too_deep.path());
    let taxonomy = find_manifest_containing(too_deep.path(), "\"id\": \"life-types\"").unwrap();
    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&taxonomy).unwrap()).unwrap();
    let localized_content = value["terms"][0]["localizedContent"].clone();
    let mut term = &mut value["terms"][0];
    for _ in 0..9 {
        term = &mut term["children"][0];
    }
    term["children"] = serde_json::json!([{
        "key": "eleventh-rank",
        "localizedContent": localized_content
    }]);
    fs::write(&taxonomy, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert!(validate(too_deep.path())
        .unwrap_err()
        .to_string()
        .contains("depth must not exceed variety (9)"));

    let baseline_digest = source.source_digest_sha256().to_string();
    for (label, mutate_alias) in [
        ("life-type-reference-digest", false),
        ("life-alias-digest", true),
    ] {
        let changed = TestDirectory::new(label);
        copy_tree(&fixture, changed.path());
        let manifest = find_manifest_containing(
            changed.path(),
            &format!("\"typeTermKey\": \"{FIXTURE_TOY}\""),
        )
        .unwrap();
        let mut value: serde_json::Value =
            serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
        if mutate_alias {
            value["localizedContent"]["aliases"]["en-US"] = serde_json::json!(["Miniature Poodle"]);
        } else {
            value["typeTermKey"] = serde_json::json!(FIXTURE_STRUCTURAL_ONLY);
        }
        fs::write(&manifest, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
        assert_ne!(
            validate(changed.path()).unwrap().source_digest_sha256(),
            baseline_digest
        );
    }
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
