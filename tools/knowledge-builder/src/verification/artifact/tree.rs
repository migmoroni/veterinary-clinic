//! Verifies the exact, symlink-free version directory tree.

use super::{identity::VerifiedIdentity, VerificationContext};
use crate::{
    contracts::{
        artifact::{locale_directory, VersionArtifact, LOCALES_DIRECTORY},
        locale::LOCALES,
    },
    databases::DatabaseKind,
    report,
};
use std::{collections::BTreeSet, fs, path::Path};

#[derive(Debug)]
pub(super) struct VerifiedTree {
    pub(super) files: BTreeSet<String>,
}

pub(super) fn verify(
    context: &VerificationContext<'_>,
    _identity: &VerifiedIdentity,
) -> Result<VerifiedTree, String> {
    let (files, directories) = inspect(context.version_root)?;
    if files != expected_files() {
        return Err("version contains missing or additional files".to_string());
    }
    let mut expected_directories = BTreeSet::from([LOCALES_DIRECTORY.to_string()]);
    expected_directories.extend(LOCALES.map(|locale| {
        report::normalized_relative_path(&locale_directory(locale))
            .expect("contract locale paths are normalized")
    }));
    if directories != expected_directories {
        return Err("version contains missing or additional directories".to_string());
    }
    Ok(VerifiedTree { files })
}

fn expected_files() -> BTreeSet<String> {
    let mut files = BTreeSet::from([
        VersionArtifact::BuildResult.filename().to_string(),
        VersionArtifact::Checksums.filename().to_string(),
        VersionArtifact::ProjectionReport.filename().to_string(),
    ]);
    for locale in LOCALES {
        for kind in [DatabaseKind::System, DatabaseKind::SystemMedia] {
            files.insert(
                report::normalized_relative_path(
                    &locale_directory(locale).join(kind.identity().artifact_filename),
                )
                .expect("contract artifact paths are normalized"),
            );
        }
    }
    files
}

fn inspect(root: &Path) -> Result<(BTreeSet<String>, BTreeSet<String>), String> {
    fn visit(
        root: &Path,
        directory: &Path,
        files: &mut BTreeSet<String>,
        directories: &mut BTreeSet<String>,
    ) -> Result<(), String> {
        let mut entries = fs::read_dir(directory)
            .map_err(|error| format!("cannot inspect {}: {error}", directory.display()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let file_type = entry.file_type().map_err(|error| error.to_string())?;
            if file_type.is_symlink() {
                return Err(format!("artifact symlink is forbidden: {}", path.display()));
            }
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "artifact path escaped version root".to_string())?;
            let relative = report::normalized_relative_path(relative)?;
            if file_type.is_dir() {
                directories.insert(relative);
                visit(root, &path, files, directories)?;
            } else if file_type.is_file() {
                files.insert(relative);
            } else {
                return Err(format!(
                    "special artifact file is forbidden: {}",
                    path.display()
                ));
            }
        }
        Ok(())
    }
    let mut files = BTreeSet::new();
    let mut directories = BTreeSet::new();
    visit(root, root, &mut files, &mut directories)?;
    Ok((files, directories))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn expected_tree_has_every_locale_database() {
        assert_eq!(expected_files().len(), 3 + LOCALES.len() * 2);
    }
}
