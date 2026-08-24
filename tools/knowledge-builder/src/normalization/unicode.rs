//! Applies Unicode NFC normalization to authored text and every string in a JSON
//! value before typed deserialization.

use serde_json::Value;
use unicode_normalization::UnicodeNormalization;

/// Returns the canonical NFC representation used by the semantic model.
pub(crate) fn normalize_text(value: &str) -> String {
    value.nfc().collect()
}

/// Normalizes every authored JSON string before typed deserialization.
pub(crate) fn normalize_json_strings(value: &mut Value) {
    match value {
        Value::String(text) => *text = normalize_text(text),
        Value::Array(values) => values.iter_mut().for_each(normalize_json_strings),
        Value::Object(values) => values.values_mut().for_each(normalize_json_strings),
        Value::Null | Value::Bool(_) | Value::Number(_) => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn composes_unicode_beyond_a_manual_latin_table() {
        assert_eq!(normalize_text("Cafe\u{301}"), "Café");
        assert_eq!(normalize_text("A\u{30a}"), "Å");
        assert_eq!(normalize_text("Ω\u{301}"), "Ώ");
    }
}
