use crate::{build, validate, BuildOptions};
use std::{ffi::OsString, path::PathBuf};

const USAGE: &str = "usage:\n  knowledge-builder validate --source <knowledge-data>\n  knowledge-builder build --source <knowledge-data> --output <artifact-directory> --context <build-context.json>";

pub fn run<I>(arguments: I) -> Result<(), String>
where
    I: IntoIterator<Item = OsString>,
{
    let mut arguments = arguments.into_iter();
    let _binary = arguments.next();
    let command = arguments
        .next()
        .and_then(|value| value.into_string().ok())
        .ok_or_else(|| USAGE.to_string())?;
    let arguments = arguments.collect::<Vec<_>>();

    match command.as_str() {
        "validate" => {
            let source = required_path(&arguments, "--source")?;
            reject_unknown(&arguments, &["--source"])?;
            let result = validate(source).map_err(|error| error.to_string())?;
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
        _ => Err(format!("unknown command {command}\n{USAGE}")),
    }
}

fn required_path(arguments: &[OsString], option: &str) -> Result<PathBuf, String> {
    let mut found = None;
    let mut index = 0;
    while index < arguments.len() {
        if arguments[index] == option {
            if found.is_some() {
                return Err(format!("duplicate option {option}"));
            }
            let value = arguments
                .get(index + 1)
                .ok_or_else(|| format!("missing value for {option}"))?;
            if value.to_string_lossy().starts_with("--") {
                return Err(format!("missing value for {option}"));
            }
            found = Some(PathBuf::from(value));
            index += 2;
        } else {
            index += 1;
        }
    }
    found.ok_or_else(|| format!("missing required option {option}\n{USAGE}"))
}

fn reject_unknown(arguments: &[OsString], allowed: &[&str]) -> Result<(), String> {
    let mut index = 0;
    while index < arguments.len() {
        let option = arguments[index]
            .to_str()
            .ok_or_else(|| "command-line argument is not valid UTF-8".to_string())?;
        if !allowed.contains(&option) {
            return Err(format!("unknown option {option}\n{USAGE}"));
        }
        if index + 1 >= arguments.len() {
            return Err(format!("missing value for {option}"));
        }
        index += 2;
    }
    Ok(())
}
