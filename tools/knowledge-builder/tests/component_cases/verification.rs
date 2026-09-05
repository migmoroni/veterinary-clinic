//! Exercises verifier refusal for an isolated finalized artifact.

use crate::support::*;
use knowledge_builder::{build, BuildOptions};
use std::{fs, path::Path};

#[test]
fn finalized_tree_rejects_an_unexpected_file_without_rebuilding() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let output = TestDirectory::new("component-verification");
    let options = BuildOptions {
        source: fixture,
        output: output.path().to_path_buf(),
        context: context_path(),
    };
    build(&options).unwrap();
    fs::write(output.path().join("versions/1/unexpected.txt"), b"tampered").unwrap();
    let error = build(&options).unwrap_err();
    assert!(error.contains("additional files"));
}
