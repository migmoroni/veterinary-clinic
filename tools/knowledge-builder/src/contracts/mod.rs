//! Owns the immutable cross-subsystem contracts accepted and emitted by the builder.

pub(crate) mod artifact;
pub(crate) mod database;
pub(crate) mod locale;
pub(crate) mod taxonomy;
pub(crate) mod version;

#[cfg(test)]
mod tests;
