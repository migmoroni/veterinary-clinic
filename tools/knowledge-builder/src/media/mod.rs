use crate::normalization::normalize_text;
use image::{
    codecs::jpeg::JpegEncoder, imageops::FilterType, ColorType, DynamicImage, GenericImageView,
    ImageDecoder, ImageEncoder, ImageFormat, ImageReader, Limits, Rgb, RgbImage,
};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Cursor,
    path::{Component, Path, PathBuf},
};

const MAX_SOURCE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_DIMENSION: u32 = 16_384;
const MAX_PIXELS: u64 = 100_000_000;
const THUMBNAIL_MAX_SIDE: u32 = 200;
const THUMBNAIL_JPEG_QUALITY: u8 = 72;

#[derive(Clone, Debug, serde::Serialize)]
pub struct MediaAsset {
    pub media_key: String,
    pub relative_path: String,
    #[serde(skip)]
    pub source_path: PathBuf,
    pub content_hash_sha256: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: u32,
    pub height: u32,
    #[serde(skip)]
    pub bytes: Vec<u8>,
    #[serde(skip)]
    pub thumbnail: Vec<u8>,
    pub thumbnail_mime_type: String,
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
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
    if metadata.len() > MAX_SOURCE_BYTES {
        return Err(format!(
            "media exceeds the 25 MiB source limit: {}",
            canonical.display()
        ));
    }
    let relative = canonical
        .strip_prefix(&entity_root)
        .map_err(|_| "media path escapes entity directory".to_string())?;
    let relative_path = normalized_relative_path(relative)?;
    let bytes = fs::read(&canonical)
        .map_err(|error| format!("cannot read media {}: {error}", canonical.display()))?;
    let decoded = decode_image(&bytes, &canonical)?;
    let (width, height) = decoded.dimensions();
    let thumbnail_image = if width <= THUMBNAIL_MAX_SIDE && height <= THUMBNAIL_MAX_SIDE {
        decoded
    } else {
        decoded.resize(THUMBNAIL_MAX_SIDE, THUMBNAIL_MAX_SIDE, FilterType::Lanczos3)
    };
    let (thumbnail_width, thumbnail_height) = thumbnail_image.dimensions();
    let thumbnail = encode_jpeg_on_white(&thumbnail_image)?;
    let mime_type = mime_for_format(
        image::guess_format(&bytes)
            .map_err(|error| format!("cannot identify media {}: {error}", canonical.display()))?,
    )?;
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
        thumbnail,
        thumbnail_mime_type: "image/jpeg".to_string(),
        thumbnail_width,
        thumbnail_height,
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
    if value.len() != 64
        || !value
            .bytes()
            .all(|value| value.is_ascii_digit() || matches!(value, b'a'..=b'f'))
    {
        return Err("SHA-256 must contain 64 lowercase hexadecimal characters".to_string());
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
            Component::Normal(value) => {
                let value = value
                    .to_str()
                    .ok_or_else(|| "media path is not valid UTF-8".to_string())?;
                segments.push(normalize_text(value));
            }
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

pub(crate) fn decode_image(bytes: &[u8], path: &Path) -> Result<DynamicImage, String> {
    let format = image::guess_format(bytes)
        .map_err(|error| format!("unsupported or invalid image {}: {error}", path.display()))?;
    let mime_type = mime_for_format(format)?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let extensions: &[&str] = match format {
        ImageFormat::Png => &["png"],
        ImageFormat::Jpeg => &["jpg", "jpeg"],
        ImageFormat::Gif => &["gif"],
        ImageFormat::WebP => &["webp"],
        _ => return Err(format!("unsupported image format for {}", path.display())),
    };
    if !extensions.contains(&extension.as_str()) {
        return Err(format!(
            "media extension does not match detected MIME type {mime_type}: {}",
            path.display()
        ));
    }
    let mut reader = ImageReader::new(Cursor::new(bytes));
    reader.set_format(format);
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_DIMENSION);
    limits.max_image_height = Some(MAX_DIMENSION);
    limits.max_alloc = Some(MAX_PIXELS.saturating_mul(4));
    reader.limits(limits);
    let mut decoder = reader
        .into_decoder()
        .map_err(|error| format!("cannot create decoder for {}: {error}", path.display()))?;
    let (encoded_width, encoded_height) = decoder.dimensions();
    if encoded_width == 0
        || encoded_height == 0
        || encoded_width > MAX_DIMENSION
        || encoded_height > MAX_DIMENSION
        || u64::from(encoded_width) * u64::from(encoded_height) > MAX_PIXELS
    {
        return Err(format!(
            "image dimensions exceed the media profile: {}",
            path.display()
        ));
    }
    let orientation = decoder
        .orientation()
        .map_err(|error| format!("cannot read image orientation {}: {error}", path.display()))?;
    let mut image = DynamicImage::from_decoder(decoder)
        .map_err(|error| format!("cannot decode image {}: {error}", path.display()))?;
    image.apply_orientation(orientation);
    Ok(image)
}

pub(crate) fn mime_for_format(format: ImageFormat) -> Result<&'static str, String> {
    match format {
        ImageFormat::Png => Ok("image/png"),
        ImageFormat::Jpeg => Ok("image/jpeg"),
        ImageFormat::Gif => Ok("image/gif"),
        ImageFormat::WebP => Ok("image/webp"),
        _ => Err("unsupported image format".to_string()),
    }
}

fn encode_jpeg_on_white(image: &DynamicImage) -> Result<Vec<u8>, String> {
    let rgba = image.to_rgba8();
    let mut rgb = RgbImage::new(rgba.width(), rgba.height());
    for (x, y, pixel) in rgba.enumerate_pixels() {
        let alpha = u16::from(pixel[3]);
        let blend = |channel: u8| -> u8 {
            let value = u16::from(channel) * alpha + 255 * (255 - alpha);
            ((value + 127) / 255) as u8
        };
        rgb.put_pixel(
            x,
            y,
            Rgb([blend(pixel[0]), blend(pixel[1]), blend(pixel[2])]),
        );
    }
    let mut bytes = Vec::new();
    JpegEncoder::new_with_quality(&mut bytes, THUMBNAIL_JPEG_QUALITY)
        .write_image(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            ColorType::Rgb8.into(),
        )
        .map_err(|error| format!("cannot encode deterministic JPEG thumbnail: {error}"))?;
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};
    use std::fs::File;
    use std::sync::atomic::{AtomicU64, Ordering};

    static TEST_COUNTER: AtomicU64 = AtomicU64::new(0);

    fn encoded(format: ImageFormat, width: u32, height: u32) -> Vec<u8> {
        let pixels = ImageBuffer::from_fn(width, height, |x, y| {
            Rgba([
                (x % 255) as u8,
                (y % 255) as u8,
                80,
                if x == 0 { 0 } else { 255 },
            ])
        });
        let image = DynamicImage::ImageRgba8(pixels);
        let image = if format == ImageFormat::Jpeg {
            DynamicImage::ImageRgb8(image.to_rgb8())
        } else {
            image
        };
        let mut bytes = Cursor::new(Vec::new());
        image.write_to(&mut bytes, format).unwrap();
        bytes.into_inner()
    }

    fn with_orientation_six(mut jpeg: Vec<u8>) -> Vec<u8> {
        let exif = [
            b'E', b'x', b'i', b'f', 0, 0, b'M', b'M', 0, 42, 0, 0, 0, 8, 0, 1, 1, 18, 0, 3, 0, 0,
            0, 1, 0, 6, 0, 0, 0, 0, 0, 0,
        ];
        let mut result = jpeg.drain(..2).collect::<Vec<_>>();
        result.extend_from_slice(&[0xff, 0xe1, 0, 34]);
        result.extend_from_slice(&exif);
        result.extend(jpeg);
        result
    }

    fn test_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "knowledge-builder-media-{label}-{}-{}",
            std::process::id(),
            TEST_COUNTER.fetch_add(1, Ordering::Relaxed)
        ))
    }

    #[test]
    fn cas_layout_is_fragmented() {
        let hash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        assert_eq!(
            cas_relative_path(hash).unwrap(),
            PathBuf::from("01/23").join(format!("{hash}.bin"))
        );
        assert!(decode_hex(&hash.to_ascii_uppercase()).is_err());
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
        image::DynamicImage::new_rgba8(1, 1)
            .save(media.join("pixel.png"))
            .unwrap();
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
        assert_eq!((asset.width, asset.height), (1, 1));
        assert_eq!(asset.thumbnail_mime_type, "image/jpeg");
        assert_ne!(asset.thumbnail, asset.bytes);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn decodes_all_source_formats_and_encodes_deterministic_jpeg_thumbnails() {
        for (format, extension, mime) in [
            (ImageFormat::Png, "png", "image/png"),
            (ImageFormat::Jpeg, "jpg", "image/jpeg"),
            (ImageFormat::Gif, "gif", "image/gif"),
            (ImageFormat::WebP, "webp", "image/webp"),
        ] {
            let bytes = encoded(format, 400, 100);
            let path = PathBuf::from(format!("source.{extension}"));
            assert_eq!(
                mime_for_format(image::guess_format(&bytes).unwrap()).unwrap(),
                mime
            );
            let decoded = decode_image(&bytes, &path).unwrap();
            let thumbnail = decoded.resize(200, 200, FilterType::Lanczos3);
            let left = encode_jpeg_on_white(&thumbnail).unwrap();
            let right = encode_jpeg_on_white(&thumbnail).unwrap();
            assert_eq!(left, right);
            assert!(left.starts_with(&[0xff, 0xd8, 0xff]));
            assert_eq!(thumbnail.dimensions(), (200, 50));
            assert_ne!(left, bytes);
        }
    }

    #[test]
    fn jpeg_exif_orientation_changes_visual_dimensions_before_thumbnailing() {
        let bytes = with_orientation_six(encoded(ImageFormat::Jpeg, 4, 2));
        let image = decode_image(&bytes, Path::new("oriented.jpg")).unwrap();
        assert_eq!(image.dimensions(), (2, 4));
    }

    #[test]
    fn thumbnail_composes_transparency_on_white_without_upscaling() {
        let root = test_root("transparent");
        fs::create_dir_all(&root).unwrap();
        let source = root.join("transparent.png");
        fs::write(&source, encoded(ImageFormat::Png, 1, 1)).unwrap();

        let asset = resolve_media(&root, "product", "entity", &source).unwrap();
        let thumbnail = image::load_from_memory_with_format(&asset.thumbnail, ImageFormat::Jpeg)
            .unwrap()
            .to_rgb8();
        assert_eq!((asset.thumbnail_width, asset.thumbnail_height), (1, 1));
        assert!(thumbnail
            .get_pixel(0, 0)
            .0
            .iter()
            .all(|channel| *channel >= 250));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_oversized_files_and_extension_signature_mismatches() {
        let root = test_root("limits");
        fs::create_dir_all(&root).unwrap();
        let oversized = root.join("oversized.png");
        File::create(&oversized)
            .unwrap()
            .set_len(MAX_SOURCE_BYTES + 1)
            .unwrap();
        assert!(resolve_media(&root, "product", "entity", &oversized)
            .unwrap_err()
            .contains("25 MiB"));

        let mismatch = root.join("mismatch.jpg");
        fs::write(&mismatch, encoded(ImageFormat::Png, 1, 1)).unwrap();
        assert!(resolve_media(&root, "product", "entity", &mismatch)
            .unwrap_err()
            .contains("extension does not match"));

        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_dimensions_outside_the_media_profile() {
        let bytes = encoded(ImageFormat::Png, MAX_DIMENSION + 1, 1);
        assert!(decode_image(&bytes, Path::new("too-wide.png")).is_err());
    }
}
