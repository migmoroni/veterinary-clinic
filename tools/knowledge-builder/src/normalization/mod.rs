mod search;
mod unicode;

pub(crate) use search::{normalize_identity_key, normalize_search_text};
pub(crate) use unicode::{normalize_json_strings, normalize_text};
