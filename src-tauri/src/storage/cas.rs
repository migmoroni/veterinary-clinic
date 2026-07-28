//! Content-addressable storage helpers for original media files.
//!
//! SQLite stores media metadata only; this module resolves SHA-256 hashes to
//! vault paths and writes immutable bytes to disk with a temp-file commit.

use super::{data::StorageManager, StorageDatabase};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageDomain {
    User,
    System,
}

impl StorageDomain {
    pub(crate) fn vault_segment(self) -> &'static str {
        match self {
            Self::User => "user",
            Self::System => "system",
        }
    }

    pub(crate) fn media_database(self) -> StorageDatabase {
        match self {
            Self::User => StorageDatabase::UserMedia,
            Self::System => StorageDatabase::SystemMedia,
        }
    }
}

impl StorageManager {
    pub fn resolve_cas_path(&self, domain: StorageDomain, hash: &[u8]) -> Result<PathBuf, String> {
        resolve_cas_path(&self.base_vault_path, domain, hash)
    }

    pub fn write_cas_file(
        &self,
        domain: StorageDomain,
        hash: &[u8],
        bytes: &[u8],
    ) -> Result<PathBuf, String> {
        let path = self.resolve_cas_path(domain, hash)?;
        write_file_if_missing(&path, bytes)?;
        Ok(path)
    }
}

pub fn resolve_cas_path(
    base_vault_path: &Path,
    domain: StorageDomain,
    hash: &[u8],
) -> Result<PathBuf, String> {
    if hash.len() != 32 {
        return Err("media_hash_invalid".to_string());
    }
    let hash_hex = bytes_to_hex(hash);
    Ok(base_vault_path
        .join(domain.vault_segment())
        .join(&hash_hex[0..2])
        .join(&hash_hex[2..4])
        .join(format!("{hash_hex}.bin")))
}

pub(crate) fn sha256(bytes: &[u8]) -> [u8; 32] {
    let digest = Sha256::digest(bytes);
    let mut hash = [0_u8; 32];
    hash.copy_from_slice(&digest);
    hash
}

pub(crate) fn decode_hash_hex(value: &str) -> Result<Vec<u8>, String> {
    let normalized = value.trim().to_lowercase();
    if normalized.len() != 64
        || !normalized
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err("media_hash_invalid".to_string());
    }
    let mut bytes = Vec::with_capacity(32);
    for pair in normalized.as_bytes().chunks_exact(2) {
        let high = hex_nibble(pair[0])?;
        let low = hex_nibble(pair[1])?;
        bytes.push((high << 4) | low);
    }
    Ok(bytes)
}

pub fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn detect_mime_type(bytes: &[u8]) -> &'static str {
    match bytes {
        [0x89, 0x50, 0x4e, 0x47, ..] => "image/png",
        [0xff, 0xd8, 0xff, ..] => "image/jpeg",
        [0x47, 0x49, 0x46, ..] => "image/gif",
        [0x52, 0x49, 0x46, 0x46, ..] if bytes.len() >= 12 && &bytes[8..12] == b"WEBP" => {
            "image/webp"
        }
        [0x25, 0x50, 0x44, 0x46, ..] => "application/pdf",
        [0x00, 0x00, 0x00, ..] if bytes.len() >= 8 && &bytes[4..8] == b"ftyp" => "video/mp4",
        _ => "application/octet-stream",
    }
}

pub(crate) fn path_to_string(path: &Path) -> Result<String, String> {
    path.to_str()
        .map(str::to_string)
        .ok_or_else(|| "media_path_not_utf8".to_string())
}

fn write_file_if_missing(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if path.is_file() {
        return Ok(());
    }

    let parent = path
        .parent()
        .ok_or_else(|| "media_path_invalid".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("media_vault_dir_create_failed:{error}"))?;

    if path.is_file() {
        return Ok(());
    }

    // Write through a temp file, sync it, then rename. That keeps CAS commits
    // atomic enough for local desktop failures without involving SQLite.
    let temp_path = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("media"),
        temp_file_suffix()
    ));
    {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&temp_path)
            .map_err(|error| format!("media_temp_create_failed:{error}"))?;
        file.write_all(bytes)
            .map_err(|error| format!("media_temp_write_failed:{error}"))?;
        file.sync_all()
            .map_err(|error| format!("media_temp_sync_failed:{error}"))?;
    }

    if path.is_file() {
        let _ = fs::remove_file(temp_path);
        return Ok(());
    }

    fs::rename(&temp_path, path).map_err(|error| {
        let _ = fs::remove_file(&temp_path);
        format!("media_file_commit_failed:{error}")
    })
}

fn temp_file_suffix() -> String {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    format!("{}.{}", std::process::id(), timestamp)
}

fn hex_nibble(value: u8) -> Result<u8, String> {
    match value {
        b'0'..=b'9' => Ok(value - b'0'),
        b'a'..=b'f' => Ok(value - b'a' + 10),
        b'A'..=b'F' => Ok(value - b'A' + 10),
        _ => Err("media_hash_invalid".to_string()),
    }
}
