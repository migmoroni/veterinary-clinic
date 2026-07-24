use super::{time::timestamp_for_file, SQLITE_SIDECARS};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

pub(crate) struct TempDirectory {
    pub(crate) path: PathBuf,
}

impl TempDirectory {
    pub(crate) fn new(prefix: &str) -> Result<Self, String> {
        let path = std::env::temp_dir().join(format!("{prefix}-{}", timestamp_for_file()));
        fs::create_dir_all(&path)
            .map_err(|error| format!("temporary_dir_create_failed:{error}"))?;
        Ok(Self { path })
    }
}

impl Drop for TempDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

pub(crate) fn copy_dir_recursive_if_exists(
    source: &Path,
    destination: &Path,
) -> Result<(), String> {
    if !source.is_dir() {
        return Ok(());
    }

    fs::create_dir_all(destination)
        .map_err(|error| format!("directory_copy_create_failed:{error}"))?;
    for entry in
        fs::read_dir(source).map_err(|error| format!("directory_copy_read_failed:{error}"))?
    {
        let entry = entry.map_err(|error| format!("directory_copy_entry_failed:{error}"))?;
        let source_path = entry.path();
        let destination_path = destination.join(entry.file_name());
        if source_path.is_dir() {
            copy_dir_recursive_if_exists(&source_path, &destination_path)?;
        } else if source_path.is_file() {
            fs::copy(&source_path, &destination_path)
                .map_err(|error| format!("directory_copy_file_failed:{error}"))?;
        }
    }
    Ok(())
}

pub(crate) fn replace_sqlite_file(source: &Path, destination: &Path) -> Result<(), String> {
    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("database_replace_dir_create_failed:{error}"))?;
    }

    // A restored .db must not reuse WAL/SHM files produced by the previous DB.
    remove_sqlite_sidecars(destination)?;
    let temp_path = destination.with_extension(format!(
        "{}.import-tmp",
        destination
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("db")
    ));
    remove_file_if_exists(&temp_path)?;
    fs::copy(source, &temp_path)
        .map_err(|error| format!("database_replace_copy_failed:{error}"))?;
    remove_file_if_exists(destination)?;
    fs::rename(&temp_path, destination)
        .map_err(|error| format!("database_replace_rename_failed:{error}"))
}

pub(crate) fn remove_file_if_exists(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("file_remove_failed:{error}")),
    }
}

pub(crate) fn normalized_output_path(value: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(value.trim());
    if path.as_os_str().is_empty() {
        return Err("destination_path_required".to_string());
    }
    Ok(path)
}

pub(crate) fn normalized_existing_file_path(value: &str) -> Result<PathBuf, String> {
    let path = normalized_output_path(value)?;
    if !path.is_file() {
        return Err("source_file_not_found".to_string());
    }
    Ok(path)
}

pub(crate) fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| "path_not_utf8".to_string())
}

pub(crate) fn validate_zip_relative_path(value: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(value);
    if path.is_absolute() {
        return Err("zip_path_invalid".to_string());
    }

    let mut clean = PathBuf::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => clean.push(value),
            _ => return Err("zip_path_invalid".to_string()),
        }
    }
    if clean.as_os_str().is_empty() {
        return Err("zip_path_invalid".to_string());
    }
    Ok(clean)
}

fn remove_sqlite_sidecars(path: &Path) -> Result<(), String> {
    for suffix in SQLITE_SIDECARS {
        remove_file_if_exists(&PathBuf::from(format!("{}{}", path.display(), suffix)))?;
    }
    Ok(())
}
