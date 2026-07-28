//! Native file manager command.
//!
//! This module keeps platform-specific shell integration out of `lib.rs`.

use std::path::{Path, PathBuf};
use std::process::Command;

#[tauri::command]
pub fn open_file_manager(path: String) -> Result<(), String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("path_empty".to_string());
    }

    let path = PathBuf::from(trimmed_path);
    let target = if path.is_file() {
        path.parent().map(Path::to_path_buf).unwrap_or(path)
    } else {
        path
    };

    if !target.exists() {
        return Err(format!("path_not_found: {}", target.display()));
    }

    open_file_manager_path(&target)
}

#[cfg(target_os = "linux")]
fn open_file_manager_path(path: &Path) -> Result<(), String> {
    Command::new("xdg-open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(target_os = "macos")]
fn open_file_manager_path(path: &Path) -> Result<(), String> {
    Command::new("open")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(target_os = "windows")]
fn open_file_manager_path(path: &Path) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("file_manager_open_failed: {error}"))
}

#[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
fn open_file_manager_path(_path: &Path) -> Result<(), String> {
    Err("file_manager_open_unsupported".to_string())
}
