//! Verifies independent expected, owned, and observed projection coverage.

mod evidence;
mod model;

#[cfg(test)]
mod tests;

pub(crate) use evidence::evidence_digest;
pub(crate) use model::{CompletedLedger, ProjectionLedger};
