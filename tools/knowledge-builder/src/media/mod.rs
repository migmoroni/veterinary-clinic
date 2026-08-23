use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Component, Path, PathBuf},
};

#[derive(Clone, Debug, serde::Serialize)]
pub struct MediaAsset {
    pub media_key: String,
    pub relative_path: String,
    #[serde(skip)]
    pub source_path: PathBuf,
    pub content_hash_sha256: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    #[serde(skip)]
    pub bytes: Vec<u8>,
    #[serde(skip)]
    pub thumbnail: Option<Vec<u8>>,
}

pub fn resolve_markdown_image(
    entity_directory: &Path,
    document_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    destination: &str,
) -> Result<MediaAsset, String> {
    if destination.trim() != destination || destination.is_empty() {
        return Err("image destination must be non-empty and trimmed".to_string());
    }
    if destination.contains("knowledge-media:") || has_uri_scheme(destination) {
        return Err(format!("image destination must be local: {destination}"));
    }
    let destination_path = Path::new(destination);
    if destination_path.is_absolute() {
        return Err(format!("absolute image path is forbidden: {destination}"));
    }
    let source_path = document_directory.join(destination_path);
    resolve_media(entity_directory, entity_type, entity_id, &source_path)
}

pub fn resolve_media(
    entity_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    source_path: &Path,
) -> Result<MediaAsset, String> {
    reject_symlink_components(entity_directory, source_path)?;
    let entity_root = fs::canonicalize(entity_directory).map_err(|error| {
        format!(
            "cannot resolve entity directory {}: {error}",
            entity_directory.display()
        )
    })?;
    let canonical = fs::canonicalize(source_path)
        .map_err(|error| format!("cannot resolve media {}: {error}", source_path.display()))?;
    if !canonical.starts_with(&entity_root) {
        return Err(format!(
            "media path escapes entity directory: {}",
            source_path.display()
        ));
    }
    let metadata = fs::metadata(&canonical)
        .map_err(|error| format!("cannot inspect media {}: {error}", canonical.display()))?;
    if !metadata.is_file() || metadata.len() == 0 {
        return Err(format!(
            "media must be a non-empty regular file: {}",
            canonical.display()
        ));
    }
    let relative = canonical
        .strip_prefix(&entity_root)
        .map_err(|_| "media path escapes entity directory".to_string())?;
    let relative_path = normalized_relative_path(relative)?;
    let bytes = fs::read(&canonical)
        .map_err(|error| format!("cannot read media {}: {error}", canonical.display()))?;
    let (mime_type, width, height) = inspect_image(&bytes, &canonical)?;
    let content_hash_sha256 = sha256_hex(&bytes);
    let media_key = format!("{entity_type}/{entity_id}/{relative_path}");

    Ok(MediaAsset {
        media_key,
        relative_path,
        source_path: canonical,
        content_hash_sha256,
        mime_type: mime_type.to_string(),
        size_bytes: metadata.len(),
        width,
        height,
        // The v1 profile stores a deterministic preview. For already compact
        // source images the byte-identical preview avoids a second codec and
        // remains stable across platforms.
        thumbnail: Some(bytes.clone()),
        bytes,
    })
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

pub fn decode_hex(value: &str) -> Result<Vec<u8>, String> {
    if value.len() != 64 || !value.bytes().all(|value| value.is_ascii_hexdigit()) {
        return Err("SHA-256 must contain 64 hexadecimal characters".to_string());
    }
    value
        .as_bytes()
        .chunks_exact(2)
        .map(|pair| {
            let pair = std::str::from_utf8(pair).map_err(|error| error.to_string())?;
            u8::from_str_radix(pair, 16).map_err(|error| error.to_string())
        })
        .collect()
}

pub fn cas_relative_path(hash: &str) -> Result<PathBuf, String> {
    decode_hex(hash)?;
    Ok(PathBuf::from(&hash[0..2])
        .join(&hash[2..4])
        .join(format!("{hash}.bin")))
}

pub fn percent_encode_media_key(value: &str) -> String {
    let mut result = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~' | b'/') {
            result.push(char::from(byte));
        } else {
            result.push_str(&format!("%{byte:02X}"));
        }
    }
    result
}

fn normalized_relative_path(path: &Path) -> Result<String, String> {
    let mut segments = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => segments.push(
                value
                    .to_str()
                    .ok_or_else(|| "media path is not valid UTF-8".to_string())?
                    .to_string(),
            ),
            _ => return Err("media path is not a normalized relative path".to_string()),
        }
    }
    if segments.is_empty() {
        return Err("media path is empty".to_string());
    }
    Ok(segments.join("/"))
}

fn reject_symlink_components(entity_directory: &Path, source_path: &Path) -> Result<(), String> {
    let relative = source_path
        .strip_prefix(entity_directory)
        .unwrap_or(source_path);
    let mut current = entity_directory.to_path_buf();
    for component in relative.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                current.pop();
            }
            Component::Normal(value) => {
                current.push(value);
                if let Ok(metadata) = fs::symlink_metadata(&current) {
                    if metadata.file_type().is_symlink() {
                        return Err(format!(
                            "symlink is forbidden in media path: {}",
                            current.display()
                        ));
                    }
                }
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err("absolute media path is forbidden".to_string());
            }
        }
    }
    Ok(())
}

fn has_uri_scheme(value: &str) -> bool {
    let Some(index) = value.find(':') else {
        return false;
    };
    let scheme = &value[..index];
    !scheme.is_empty()
        && scheme.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_alphabetic()
                || (index > 0 && matches!(byte, b'0'..=b'9' | b'+' | b'-' | b'.'))
        })
}

fn inspect_image(
    bytes: &[u8],
    path: &Path,
) -> Result<(&'static str, Option<u32>, Option<u32>), String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let detected = if bytes.starts_with(b"\x89PNG\r\n\x1a\n") && bytes.len() >= 24 {
        (
            "image/png",
            Some(be_u32(&bytes[16..20])),
            Some(be_u32(&bytes[20..24])),
            &["png"][..],
        )
    } else if (bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a")) && bytes.len() >= 10 {
        (
            "image/gif",
            Some(u32::from(u16::from_le_bytes([bytes[6], bytes[7]]))),
            Some(u32::from(u16::from_le_bytes([bytes[8], bytes[9]]))),
            &["gif"][..],
        )
    } else if bytes.starts_with(&[0xff, 0xd8, 0xff]) {
        let (width, height) = jpeg_dimensions(bytes)?;
        (
            "image/jpeg",
            Some(width),
            Some(height),
            &["jpg", "jpeg"][..],
        )
    } else if bytes.len() >= 16 && bytes.starts_with(b"RIFF") && &bytes[8..12] == b"WEBP" {
        let (width, height) = webp_dimensions(bytes);
        ("image/webp", width, height, &["webp"][..])
    } else {
        return Err(format!(
            "unsupported or invalid image bytes: {}",
            path.display()
        ));
    };
    if !detected.3.contains(&extension.as_str()) {
        return Err(format!(
            "media extension does not match detected MIME type: {}",
            path.display()
        ));
    }
    if matches!(detected.1, Some(0)) || matches!(detected.2, Some(0)) {
        return Err(format!(
            "image dimensions must be positive: {}",
            path.display()
        ));
    }
    Ok((detected.0, detected.1, detected.2))
}

fn be_u32(bytes: &[u8]) -> u32 {
    u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]])
}

fn jpeg_dimensions(bytes: &[u8]) -> Result<(u32, u32), String> {
    let mut index = 2;
    while index + 9 < bytes.len() {
        if bytes[index] != 0xff {
            index += 1;
            continue;
        }
        let marker = bytes[index + 1];
        index += 2;
        if matches!(marker, 0xd8 | 0xd9) {
            continue;
        }
        if index + 2 > bytes.len() {
            break;
        }
        let length = usize::from(u16::from_be_bytes([bytes[index], bytes[index + 1]]));
        if length < 2 || index + length > bytes.len() {
            break;
        }
        if matches!(
            marker,
            0xc0 | 0xc1
                | 0xc2
                | 0xc3
                | 0xc5
                | 0xc6
                | 0xc7
                | 0xc9
                | 0xca
                | 0xcb
                | 0xcd
                | 0xce
                | 0xcf
        ) && length >= 7
        {
            let height = u32::from(u16::from_be_bytes([bytes[index + 3], bytes[index + 4]]));
            let width = u32::from(u16::from_be_bytes([bytes[index + 5], bytes[index + 6]]));
            return Ok((width, height));
        }
        index += length;
    }
    Err("JPEG dimensions could not be determined".to_string())
}

fn webp_dimensions(bytes: &[u8]) -> (Option<u32>, Option<u32>) {
    if bytes.len() >= 30 && &bytes[12..16] == b"VP8X" {
        let width = 1 + u32::from_le_bytes([bytes[24], bytes[25], bytes[26], 0]);
        let height = 1 + u32::from_le_bytes([bytes[27], bytes[28], bytes[29], 0]);
        (Some(width), Some(height))
    } else {
        (None, None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    #[test]
    fn cas_layout_is_fragmented() {
        let hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        assert_eq!(
            cas_relative_path(hash).unwrap(),
            PathBuf::from("01/23").join(format!("{hash}.bin"))
        );
    }

    #[test]
    fn media_key_percent_encoding_preserves_segments() {
        assert_eq!(
            percent_encode_media_key("product/id/media/ação.png"),
            "product/id/media/a%C3%A7%C3%A3o.png"
        );
    }

    #[test]
    fn resolves_local_image_inside_entity() {
        let root = std::env::temp_dir().join(format!(
            "knowledge-builder-media-{}-{}",
            std::process::id(),
            TEST_COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        let content = root.join("content");
        let media = root.join("media");
        fs::create_dir_all(&content).unwrap();
        fs::create_dir_all(&media).unwrap();
        let mut png = b"\x89PNG\r\n\x1a\n".to_vec();
        png.extend_from_slice(&[0, 0, 0, 13, b'I', b'H', b'D', b'R']);
        png.extend_from_slice(&1_u32.to_be_bytes());
        png.extend_from_slice(&1_u32.to_be_bytes());
        fs::write(media.join("pixel.png"), &png).unwrap();
        let asset = resolve_markdown_image(
            &root,
            &content,
            "product",
            "37ef9309-c8fd-42ac-99a5-050b195d747f",
            "../media/pixel.png",
        )
        .unwrap();
        assert_eq!(
            asset.media_key,
            "product/37ef9309-c8fd-42ac-99a5-050b195d747f/media/pixel.png"
        );
        assert_eq!((asset.width, asset.height), (Some(1), Some(1)));
        fs::remove_dir_all(root).unwrap();
    }
}
