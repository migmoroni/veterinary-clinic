//! Covers deterministic helpers shared by the projection orchestrator.

use super::*;

#[test]
fn cas_set_digest_is_order_independent() {
    assert_eq!(
        set_digest(&BTreeSet::from(["b".to_string(), "a".to_string()])),
        set_digest(&BTreeSet::from(["a".to_string(), "b".to_string()]))
    );
}

#[test]
fn coverage_boundaries_follow_the_acyclic_projection_dag() {
    fn rust_sources(path: &std::path::Path) -> String {
        let mut entries = std::fs::read_dir(path)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        entries.sort_by_key(std::fs::DirEntry::file_name);
        entries
            .into_iter()
            .map(|entry| {
                if entry.file_type().unwrap().is_dir() {
                    rust_sources(&entry.path())
                } else if entry.path().extension().is_some_and(|value| value == "rs")
                    && entry.file_name() != "tests.rs"
                {
                    std::fs::read_to_string(entry.path()).unwrap()
                } else {
                    String::new()
                }
            })
            .collect()
    }

    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let projection = root.join("src/projection");
    let coverage = rust_sources(&projection.join("coverage"));
    for forbidden in [
        "projection::inventory",
        "projection::contract",
        "projection::execution",
        "projection::ledger",
    ] {
        assert!(
            !coverage.contains(forbidden),
            "coverage depends on {forbidden}"
        );
    }

    let inventory = rust_sources(&projection.join("inventory"));
    for forbidden in [
        "projection::contract",
        "projection::execution",
        "projection::ledger",
    ] {
        assert!(
            !inventory.contains(forbidden),
            "inventory depends on {forbidden}"
        );
    }

    let contract = format!(
        "{}{}",
        std::fs::read_to_string(projection.join("contract.rs")).unwrap(),
        rust_sources(&projection.join("contract"))
    );
    assert!(!contract.contains("projection::inventory"));

    let execution = rust_sources(&projection.join("execution"));
    assert!(!execution.contains("projection::inventory"));
    assert!(!execution.contains("ProjectionLedger"));

    let ledger = rust_sources(&projection.join("ledger"));
    for forbidden in ["projection::inventory", "execution::writers", "rusqlite"] {
        assert!(!ledger.contains(forbidden), "ledger depends on {forbidden}");
    }

    let component = format!(
        "{}{}",
        std::fs::read_to_string(root.join("tests/component.rs")).unwrap(),
        rust_sources(&root.join("tests/component_cases"))
    );
    assert!(!component.contains("BuildOptions"));
    assert!(!component.contains("knowledge_builder::build"));
}
