//! Offline compiler for the canonical knowledge source.
//!
//! The library owns source validation, localized projection, the public SQLite
//! schemas, system media indexes, CAS materialization and deterministic reports.

mod artifact_verifier;
mod databases;
mod ledger;
mod markdown;
mod media;
mod normalization;
mod projection;
mod report;
mod schemas;
mod source;
mod validation;

pub mod cli;

pub use report::{BuildContext, BuildResult, ReleaseContext};
pub use source::{KnowledgeLocale, LOCALES};
pub use validation::{Diagnostic, ValidatedSource, ValidationError};

use std::path::{Path, PathBuf};

/// Validates and compiles the logical source model without creating artifacts.
pub fn validate(source: impl AsRef<Path>) -> Result<ValidatedSource, ValidationError> {
    validation::validate_source(source.as_ref())
}

/// Options for one complete six-locale build.
#[derive(Clone, Debug)]
pub struct BuildOptions {
    pub source: PathBuf,
    pub output: PathBuf,
    pub context: PathBuf,
}

/// Builds one complete and atomically finalized knowledge artifact version.
pub fn build(options: &BuildOptions) -> Result<BuildResult, String> {
    let validated = validate(&options.source).map_err(|error| error.to_string())?;
    let context = report::read_context(&options.context)?;
    projection::build_artifacts(&validated, &options.output, &context)
}

#[cfg(test)]
mod fixture_registry_tests {
    use super::*;
    use serde::Deserialize;
    use std::{collections::BTreeSet, fs};

    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Registry {
        #[serde(rename = "schemaVersion")]
        schema_version: u32,
        cases: Vec<FixtureCase>,
    }

    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct FixtureCase {
        id: String,
        fixture: String,
        expectation: String,
    }

    #[test]
    fn every_fixture_directory_is_registered_and_executed() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures");
        let registry: Registry = serde_json::from_slice(
            &fs::read(root.join("registry.json")).expect("fixture registry is readable"),
        )
        .expect("fixture registry has a closed contract");
        assert_eq!(registry.schema_version, 1);
        let actual = fs::read_dir(&root)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .collect::<BTreeSet<_>>();
        let registered = registry
            .cases
            .iter()
            .map(|case| case.fixture.clone())
            .collect::<BTreeSet<_>>();
        assert_eq!(actual, registered);

        let mut executed = BTreeSet::new();
        for case in registry.cases {
            let fixture = root.join(&case.fixture);
            match case.id.as_str() {
                "contexts" => {
                    assert!(report::read_context(&fixture.join("local-context.json")).is_ok());
                    assert!(report::read_context(&fixture.join("public-context.json")).is_ok());
                }
                "invalid-markdown" => {
                    let declarations = [source::SectionDeclaration {
                        section_key: "about".to_string(),
                        section_number: 1,
                    }];
                    for file in ["raw-html.md", "unsafe-link.md"] {
                        assert!(markdown::compile_document(
                            &fixture.join(file),
                            &fixture,
                            "condition",
                            "37ef9309-c8fd-42ac-99a5-050b195d747f",
                            &declarations,
                        )
                        .is_err());
                    }
                }
                "invalid-media" => {
                    let specification: serde_json::Value = serde_json::from_slice(
                        &fs::read(fixture.join("path-escape.json")).unwrap(),
                    )
                    .unwrap();
                    let relative = specification["cover"].as_str().unwrap();
                    assert!(media::resolve_media(
                        &fixture,
                        "condition",
                        "37ef9309-c8fd-42ac-99a5-050b195d747f",
                        &fixture.join(relative),
                    )
                    .is_err());
                }
                "invalid-schema" => assert!(validation::validate_source(&fixture).is_err()),
                "valid-markdown" => {
                    let declarations = [source::SectionDeclaration {
                        section_key: "about".to_string(),
                        section_number: 1,
                    }];
                    let left = markdown::compile_document(
                        &fixture.join("allowed.md"),
                        &fixture,
                        "condition",
                        "37ef9309-c8fd-42ac-99a5-050b195d747f",
                        &declarations,
                    )
                    .unwrap();
                    let right = markdown::compile_document(
                        &fixture.join("equivalent.md"),
                        &fixture,
                        "condition",
                        "37ef9309-c8fd-42ac-99a5-050b195d747f",
                        &declarations,
                    )
                    .unwrap();
                    assert_eq!(
                        report::canonical_json(&left.document).unwrap(),
                        report::canonical_json(&right.document).unwrap()
                    );
                }
                "valid-media" => {
                    let specification: serde_json::Value = serde_json::from_slice(
                        &fs::read(fixture.join("source-spec.json")).unwrap(),
                    )
                    .unwrap();
                    assert_eq!(specification["thumbnail"]["format"], "jpeg");
                    assert_eq!(specification["thumbnail"]["quality"], 72);
                    assert_eq!(specification["thumbnail"]["maxSide"], 200);
                }
                "valid-minimal" => assert!(validation::validate_source(&fixture).is_ok()),
                unknown => panic!("registered fixture case has no executable assertion: {unknown}"),
            }
            assert!(matches!(case.expectation.as_str(), "success" | "failure"));
            executed.insert(case.id);
        }
        assert_eq!(executed.len(), registered.len());
    }
}
