//! Covers strict validation primitives that guard canonical identities.

use super::*;

#[test]
fn uuid_v4_validation_is_strict() {
    assert!(is_uuid_v4("42ecd4a0-c4b3-4276-8122-693460cfe6a6"));
    assert!(!is_uuid_v4("42ECD4A0-C4B3-4276-8122-693460CFE6A6"));
    assert!(!is_uuid_v4("42ecd4a0-c4b3-1276-8122-693460cfe6a6"));
}
