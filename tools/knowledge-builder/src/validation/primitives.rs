//! Provides reusable validators for collections, simple text, and UUID identities.

use super::*;

pub(super) fn validate_unique_texts(
    entry: &SourceEntry,
    field: &str,
    values: &[String],
    require_nonempty: bool,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if require_nonempty && values.is_empty() {
        diagnostics.push(Diagnostic::entity(entry, field, "array must not be empty"));
    }
    let mut unique = BTreeSet::new();
    for value in values {
        if value.trim() != value || value.is_empty() {
            diagnostics.push(Diagnostic::entity(
                entry,
                field,
                "array values must be non-empty and trimmed",
            ));
        }
        if !unique.insert(value) {
            diagnostics.push(Diagnostic::entity(
                entry,
                field,
                format!("duplicate value {value}"),
            ));
        }
    }
}

pub(super) fn is_simple_text(value: &str) -> bool {
    !value.is_empty()
        && value.trim() == value
        && !value.chars().any(|character| character.is_control())
        && !value.contains('\n')
        && !value.contains("![")
        && !value.contains("](")
        && !value.contains("<script")
}

pub(super) fn is_uuid_v4(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes.iter().enumerate().all(|(index, byte)| {
            [8, 13, 18, 23].contains(&index) || matches!(*byte, b'0'..=b'9' | b'a'..=b'f')
        })
        && bytes[14] == b'4'
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b')
}
