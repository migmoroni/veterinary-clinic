//! Provides reusable validators for collections, species, ranges, simple text, and UUIDs.

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

pub(super) fn validate_species(
    entry: &SourceEntry,
    species: &[String],
    diagnostics: &mut Vec<Diagnostic>,
) {
    for value in species {
        if !matches!(value.as_str(), "canine" | "feline") {
            diagnostics.push(Diagnostic::entity(
                entry,
                "species",
                format!("unsupported species {value}"),
            ));
        }
    }
}

pub(super) fn validate_range(
    entry: &SourceEntry,
    field: &str,
    range: [f64; 2],
    diagnostics: &mut Vec<Diagnostic>,
) {
    if !range[0].is_finite() || !range[1].is_finite() || range[0] <= 0.0 || range[0] > range[1] {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            "measurement range must be finite, positive and ordered",
        ));
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
