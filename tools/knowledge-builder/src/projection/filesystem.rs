//! Provides deterministic staging cleanup and recursive file discovery.

use std::{
    fs,
    path::{Path, PathBuf},
};

pub(super) fn remove_stale_staging(path: &Path) -> Result<(), crate::PublicationError> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|source| crate::PublicationError::Io {
            path: path.to_path_buf(),
            operation: "remove stale staging directory",
            source,
        })?;
    }
    Ok(())
}

pub(super) fn recursive_files(root: &Path) -> Result<Vec<PathBuf>, crate::CasError> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    fn visit(path: &Path, files: &mut Vec<PathBuf>) -> Result<(), crate::CasError> {
        let mut entries = fs::read_dir(path)
            .map_err(|source| crate::CasError::Io {
                artifact: path.to_path_buf(),
                operation: "read CAS directory",
                source,
            })?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|source| crate::CasError::Io {
                artifact: path.to_path_buf(),
                operation: "read CAS directory entry",
                source,
            })?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            if entry
                .file_type()
                .map_err(|source| crate::CasError::Io {
                    artifact: path.clone(),
                    operation: "inspect CAS file type",
                    source,
                })?
                .is_dir()
            {
                visit(&path, files)?;
            } else {
                files.push(path);
            }
        }
        Ok(())
    }
    let mut files = Vec::new();
    visit(root, &mut files)?;
    files.sort();
    Ok(files)
}
