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
    let coverage = include_str!("coverage/model.rs");
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

    let inventory = [
        include_str!("inventory/mod.rs"),
        include_str!("inventory/entities.rs"),
        include_str!("inventory/helpers.rs"),
        include_str!("inventory/search.rs"),
    ]
    .join("\n");
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

    let contract = [
        include_str!("contract.rs"),
        include_str!("contract/build.rs"),
        include_str!("contract/helpers.rs"),
        include_str!("contract/ownership.rs"),
    ]
    .join("\n");
    assert!(!contract.contains("projection::inventory"));

    let writers = [
        include_str!("execution/writers/mod.rs"),
        include_str!("execution/writers/metadata.rs"),
        include_str!("execution/writers/system.rs"),
        include_str!("execution/writers/system_media.rs"),
    ]
    .join("\n");
    assert!(!writers.contains("ProjectionLedger"));
}
