//! Implements the closed command-line interface for source validation and
//! six-locale artifact builds.

use crate::{build, validate, BuildOptions, KnowledgeBuilderError};
use std::{ffi::OsString, path::PathBuf};
use thiserror::Error;

const USAGE: &str = "usage:\n  knowledge-builder validate --source <knowledge-data>\n  knowledge-builder build --source <knowledge-data> --output <artifact-directory> --context <build-context.json>";

/// Failure produced by the public command-line boundary.
#[derive(Debug, Error)]
pub enum CliError {
    #[error(transparent)]
    Arguments(#[from] CliArgumentError),
    #[error(transparent)]
    Builder(#[from] KnowledgeBuilderError),
}

/// Closed argument parsing and usage failures.
#[derive(Debug, Error, Eq, PartialEq)]
#[non_exhaustive]
pub enum CliArgumentError {
    #[error("{USAGE}")]
    Usage,
    #[error("unknown command {command}\n{USAGE}")]
    UnknownCommand { command: String },
    #[error("missing required option {option}\n{USAGE}")]
    MissingRequired { option: String },
    #[error("missing value for {option}")]
    MissingValue { option: String },
    #[error("duplicate option {option}")]
    Duplicate { option: String },
    #[error("unknown option {option}\n{USAGE}")]
    UnknownOption { option: String },
    #[error("command-line argument is not valid UTF-8")]
    InvalidUtf8,
}

pub fn run<I>(arguments: I) -> Result<(), CliError>
where
    I: IntoIterator<Item = OsString>,
{
    let mut arguments = arguments.into_iter();
    let _binary = arguments.next();
    let command = arguments
        .next()
        .and_then(|value| value.into_string().ok())
        .ok_or(CliArgumentError::Usage)?;
    let arguments = arguments.collect::<Vec<_>>();

    match command.as_str() {
        "validate" => {
            let source = required_path(&arguments, "--source")?;
            reject_unknown(&arguments, &["--source"])?;
            let result = validate(source).map_err(KnowledgeBuilderError::Validation)?;
            eprintln!(
                "validated {} entities, {} relations and {} localized fragments; source digest {}",
                result.entity_count(),
                result.relation_count(),
                result.localized_fragment_count(),
                result.source_digest_sha256()
            );
            Ok(())
        }
        "build" => {
            let options = BuildOptions {
                source: required_path(&arguments, "--source")?,
                output: required_path(&arguments, "--output")?,
                context: required_path(&arguments, "--context")?,
            };
            reject_unknown(&arguments, &["--source", "--output", "--context"])?;
            let result = build(&options)?;
            eprintln!(
                "built version {} for {} locales; source digest {}",
                result.build_version,
                result.locales.len(),
                result.source_digest_sha256
            );
            Ok(())
        }
        _ => Err(CliArgumentError::UnknownCommand { command }.into()),
    }
}

fn required_path(arguments: &[OsString], option: &str) -> Result<PathBuf, CliArgumentError> {
    let mut found = None;
    let mut index = 0;
    while index < arguments.len() {
        if arguments[index] == option {
            if found.is_some() {
                return Err(CliArgumentError::Duplicate {
                    option: option.to_string(),
                });
            }
            let value = arguments
                .get(index + 1)
                .ok_or_else(|| CliArgumentError::MissingValue {
                    option: option.to_string(),
                })?;
            if value.to_string_lossy().starts_with("--") {
                return Err(CliArgumentError::MissingValue {
                    option: option.to_string(),
                });
            }
            found = Some(PathBuf::from(value));
            index += 2;
        } else {
            index += 1;
        }
    }
    found.ok_or_else(|| CliArgumentError::MissingRequired {
        option: option.to_string(),
    })
}

fn reject_unknown(arguments: &[OsString], allowed: &[&str]) -> Result<(), CliArgumentError> {
    let mut index = 0;
    while index < arguments.len() {
        let option = arguments[index]
            .to_str()
            .ok_or(CliArgumentError::InvalidUtf8)?;
        if !allowed.contains(&option) {
            return Err(CliArgumentError::UnknownOption {
                option: option.to_string(),
            });
        }
        if index + 1 >= arguments.len() {
            return Err(CliArgumentError::MissingValue {
                option: option.to_string(),
            });
        }
        index += 2;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn argument_and_builder_failures_keep_public_variants() {
        let arguments = [
            OsString::from("knowledge-builder"),
            OsString::from("unknown"),
        ];
        assert!(matches!(
            run(arguments),
            Err(CliError::Arguments(CliArgumentError::UnknownCommand { .. }))
        ));

        let arguments = [
            OsString::from("knowledge-builder"),
            OsString::from("validate"),
            OsString::from("--source"),
            OsString::from("a-path-that-does-not-exist"),
        ];
        assert!(matches!(
            run(arguments),
            Err(CliError::Builder(KnowledgeBuilderError::Validation(_)))
        ));
    }

    #[test]
    fn usage_is_owned_by_argument_errors() {
        assert_eq!(CliArgumentError::Usage.to_string(), USAGE);
        assert!(CliArgumentError::MissingRequired {
            option: "--source".to_string()
        }
        .to_string()
        .contains(USAGE));
    }
}
