//! Offline compiler for the canonical knowledge source.
//!
//! The library owns source validation, localized projection, the public SQLite
//! schemas, system media indexes, CAS materialization and deterministic reports.

mod databases;
mod ledger;
mod markdown;
mod media;
mod normalization;
mod projection;
mod report;
mod schemas;
mod source;
mod validation;

pub mod cli;

pub use report::{BuildContext, BuildResult, ReleaseContext};
pub use source::{KnowledgeLocale, LOCALES};
pub use validation::{Diagnostic, ValidatedSource, ValidationError};

use std::path::{Path, PathBuf};

/// Validates and compiles the logical source model without creating artifacts.
pub fn validate(source: impl AsRef<Path>) -> Result<ValidatedSource, ValidationError> {
    validation::validate_source(source.as_ref())
}

/// Options for one complete six-locale build.
#[derive(Clone, Debug)]
pub struct BuildOptions {
    pub source: PathBuf,
    pub output: PathBuf,
    pub context: PathBuf,
}

/// Builds one complete and atomically finalized knowledge artifact version.
pub fn build(options: &BuildOptions) -> Result<BuildResult, String> {
    let validated = validate(&options.source).map_err(|error| error.to_string())?;
    let context = report::read_context(&options.context)?;
    projection::build_artifacts(&validated, &options.output, &context)
}
