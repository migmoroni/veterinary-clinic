//! Proves that the binary resolves explicit paths independently of its working directory.

use crate::support::*;
use std::{path::Path, process::Command};

#[test]
fn cli_is_independent_of_current_working_directory() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let working_directory = TestDirectory::new("cwd");
    let output = Command::new(env!("CARGO_BIN_EXE_knowledge-builder"))
        .current_dir(working_directory.path())
        .arg("validate")
        .arg("--source")
        .arg(&fixture)
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
        .arg(fixture)
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
