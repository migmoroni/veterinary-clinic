//! Covers deterministic helpers shared by the projection orchestrator.

use super::*;

#[test]
fn cas_set_digest_is_order_independent() {
    assert_eq!(
        set_digest(&BTreeSet::from(["b".to_string(), "a".to_string()])),
        set_digest(&BTreeSet::from(["a".to_string(), "b".to_string()]))
    );
}
