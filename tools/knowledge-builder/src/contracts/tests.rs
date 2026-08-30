//! Proves that central Rust contracts match the independently versioned schemas and DDLs.

use super::{
    artifact::{
        locale_artifact, version_artifact, VersionArtifact, CAS_ALGORITHM, CAS_HASH_ENCODING,
        CAS_LAYOUT, CAS_PATH_PATTERN, CAS_ROOT,
    },
    database::{SYSTEM_DATABASE, SYSTEM_MEDIA_DATABASE},
    locale::{KnowledgeLocale, LOCALES},
    taxonomy::{taxonomy_domains, taxonomy_spec, TaxonomyCardinality, CANONICAL_TAXONOMIES},
    version::*,
};
use serde_json::Value;
use std::collections::BTreeSet;

fn schema(source: &str) -> Value {
    serde_json::from_str(source).expect("embedded JSON Schema must be valid")
}

fn required_strings(value: &Value) -> Vec<&str> {
    value
        .as_array()
        .expect("required must be an array")
        .iter()
        .map(|value| value.as_str().expect("required entries must be strings"))
        .collect()
}

fn ddl_locale_sets(ddl: &str) -> Vec<Vec<&str>> {
    ddl.match_indices("CHECK(locale IN (")
        .map(|(index, marker)| {
            let values = &ddl[index + marker.len()..];
            let values = values
                .split_once("))")
                .expect("locale constraint must close")
                .0;
            values
                .split(',')
                .map(|locale| locale.trim().trim_matches('\''))
                .collect()
        })
        .collect()
}

#[test]
fn taxonomy_matrix_is_closed_unique_and_typed() {
    assert_eq!(CANONICAL_TAXONOMIES.len(), 13);
    assert!(CANONICAL_TAXONOMIES
        .iter()
        .all(|spec| !spec.domain.is_empty() && !spec.purpose.is_empty()));
    assert_eq!(
        CANONICAL_TAXONOMIES
            .iter()
            .map(|spec| (spec.domain, spec.purpose))
            .collect::<BTreeSet<_>>()
            .len(),
        CANONICAL_TAXONOMIES.len()
    );
    assert_eq!(taxonomy_domains().count(), 5);
    assert_eq!(
        CANONICAL_TAXONOMIES
            .iter()
            .filter(|spec| spec.cardinality == TaxonomyCardinality::ExactlyOne)
            .count(),
        4
    );
    assert_eq!(
        CANONICAL_TAXONOMIES
            .iter()
            .filter(|spec| spec.cardinality == TaxonomyCardinality::ZeroOrOne)
            .count(),
        1
    );
    assert_eq!(
        CANONICAL_TAXONOMIES
            .iter()
            .filter(|spec| spec.cardinality == TaxonomyCardinality::ZeroOrMore)
            .count(),
        8
    );
    for domain in taxonomy_domains().filter(|domain| *domain != "life") {
        let exactly_one = CANONICAL_TAXONOMIES
            .iter()
            .filter(|spec| {
                spec.domain == domain && spec.cardinality == TaxonomyCardinality::ExactlyOne
            })
            .collect::<Vec<_>>();
        assert_eq!(exactly_one.len(), 1);
        assert!(taxonomy_spec(domain, exactly_one[0].purpose).is_some());
    }
    assert_eq!(
        taxonomy_spec("life", "size").map(|spec| spec.cardinality),
        Some(TaxonomyCardinality::ZeroOrOne)
    );
}

#[test]
fn minimal_fixture_has_exactly_the_canonical_taxonomy_matrix() {
    let fixture = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let source = crate::validation::validate_source(&fixture).expect("minimal fixture is valid");
    let observed = source
        .taxonomies
        .keys()
        .map(|(domain, purpose)| (domain.as_str(), purpose.as_str()))
        .collect::<BTreeSet<_>>();
    let expected = CANONICAL_TAXONOMIES
        .iter()
        .map(|spec| (spec.domain, spec.purpose))
        .collect::<BTreeSet<_>>();
    assert_eq!(observed, expected);
}

#[test]
fn public_schema_versions_match_rust_contracts() {
    for source in [
        include_str!("../../schemas/source/active_ingredient.schema.json"),
        include_str!("../../schemas/source/life.schema.json"),
        include_str!("../../schemas/source/condition.schema.json"),
        include_str!("../../schemas/source/geo_place.schema.json"),
        include_str!("../../schemas/source/manufacturer.schema.json"),
        include_str!("../../schemas/source/product.schema.json"),
        include_str!("../../schemas/source/taxonomy.schema.json"),
        include_str!("../../schemas/source/treatment_protocol.schema.json"),
    ] {
        assert_eq!(
            schema(source)["properties"]["schemaVersion"]["const"],
            SOURCE_ENTITY_SCHEMA_VERSION
        );
    }
    assert_eq!(
        schema(include_str!(
            "../../schemas/system/content-document.schema.json"
        ))["properties"]["schemaVersion"]["const"],
        CONTENT_DOCUMENT_SCHEMA_VERSION
    );
    assert_eq!(
        schema(include_str!("../../schemas/build-result.schema.json"))["properties"]
            ["schemaVersion"]["const"],
        BUILD_RESULT_SCHEMA_VERSION
    );
    assert_eq!(
        schema(include_str!("../../schemas/projection-report.schema.json"))["properties"]
            ["schemaVersion"]["const"],
        PROJECTION_REPORT_SCHEMA_VERSION
    );
}

#[test]
fn locales_match_source_schemas_and_database_constraints() {
    let expected = LOCALES.map(KnowledgeLocale::as_str);
    assert_eq!(expected.into_iter().collect::<BTreeSet<_>>().len(), 6);
    assert_eq!(
        expected,
        ["pt-BR", "pt-PT", "gn-PY", "en-US", "es-ES", "fr-FR"]
    );

    let common = schema(include_str!("../../schemas/source/common.schema.json"));
    assert_eq!(
        required_strings(&common["$defs"]["localizedText"]["required"]),
        expected
    );
    assert_eq!(
        required_strings(&common["$defs"]["localizedList"]["required"]),
        expected
    );
    let build_result = schema(include_str!("../../schemas/build-result.schema.json"));
    assert_eq!(
        required_strings(&build_result["properties"]["locales"]["required"]),
        expected
    );
    let projection_report = schema(include_str!("../../schemas/projection-report.schema.json"));
    assert_eq!(
        required_strings(&projection_report["properties"]["locales"]["required"]),
        expected
    );
    assert_eq!(
        required_strings(&projection_report["$defs"]["localizedCounts"]["required"]),
        expected
    );
    for ddl in [
        include_str!("../../schemas/system/system.sql"),
        include_str!("../../schemas/system_media/system_media.sql"),
    ] {
        let constraints = ddl_locale_sets(ddl);
        assert!(!constraints.is_empty());
        for locales in constraints {
            assert_eq!(locales, expected);
        }
    }
}

#[test]
fn cas_descriptors_match_the_public_build_result_schema() {
    let build_result = schema(include_str!("../../schemas/build-result.schema.json"));
    let cas = &build_result["properties"]["cas"]["properties"];
    assert_eq!(cas["algorithm"]["const"], CAS_ALGORITHM);
    assert_eq!(cas["hashEncoding"]["const"], CAS_HASH_ENCODING);
    assert_eq!(cas["root"]["const"], CAS_ROOT);
    assert_eq!(cas["layout"]["const"], CAS_LAYOUT);
    assert_eq!(cas["pathPattern"]["const"], CAS_PATH_PATTERN);
}

#[test]
fn database_identities_and_artifact_paths_are_canonical() {
    assert_eq!(SYSTEM_DATABASE.schema_version, SYSTEM_SCHEMA_VERSION);
    assert_eq!(SYSTEM_DATABASE.application_id, 0x564b5359);
    assert_eq!(
        SYSTEM_MEDIA_DATABASE.schema_version,
        SYSTEM_MEDIA_SCHEMA_VERSION
    );
    assert_eq!(SYSTEM_MEDIA_DATABASE.application_id, 0x564b534d);
    assert_eq!(
        locale_artifact(7, KnowledgeLocale::EnUs, SYSTEM_DATABASE),
        std::path::Path::new("versions/7/locales/en-US/veterinary_clinic_system.db")
    );
    assert_eq!(
        version_artifact(7, VersionArtifact::Checksums),
        std::path::Path::new("versions/7/checksums.sha256")
    );
    assert!(!locale_artifact(7, KnowledgeLocale::EnUs, SYSTEM_DATABASE).is_absolute());
    for artifact in [
        VersionArtifact::BuildResult,
        VersionArtifact::ProjectionReport,
        VersionArtifact::Checksums,
    ] {
        let path = version_artifact(7, artifact);
        assert!(!path.is_absolute());
        assert!(path
            .components()
            .all(|component| matches!(component, std::path::Component::Normal(_))));
    }
}

#[test]
fn all_central_versions_are_explicitly_covered() {
    assert_eq!(SOURCE_DIGEST_SCHEMA_VERSION, 2);
    assert_eq!(BUILD_CONTEXT_SCHEMA_VERSION, 1);
    assert_eq!(PROJECTION_EVIDENCE_SCHEMA_VERSION, 1);
}

#[test]
fn life_contract_has_no_parallel_breed_or_species_storage() {
    let fingerprint = crate::source::source_schema_fingerprint_input().join("\n");
    let ddl = include_str!("../../schemas/system/system.sql");
    assert!(!fingerprint.contains("\"entityType\": { \"const\": \"breed\" }"));
    assert!(!ddl.contains("breed_reference_items"));
    assert!(!ddl.contains("breed_origin_places"));
    assert!(!ddl.contains("species_json"));
    assert!(ddl.contains("life_reference_items"));
    assert!(ddl.contains("applicable_taxon_ids_json"));
}
