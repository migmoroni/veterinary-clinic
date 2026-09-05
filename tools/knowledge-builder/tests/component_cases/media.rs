//! Exercises media decoding, thumbnail persistence, and CAS materialization in isolation.

use crate::support::*;
use image::{DynamicImage, ImageBuffer, Rgba};
use knowledge_builder::{build, BuildOptions};
use rusqlite::Connection;
use std::{fs, path::Path};

#[test]
fn minimal_media_round_trips_thumbnail_and_cas_bytes() {
    let fixture = Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let source = TestDirectory::new("component-media-source");
    copy_tree(&fixture, source.path());
    let manifest = find_manifest_by_type(source.path(), "product").unwrap();
    let entity_directory = manifest.parent().unwrap();
    let media_directory = entity_directory.join("_media");
    fs::create_dir_all(&media_directory).unwrap();
    let source_path = media_directory.join("cover.png");
    DynamicImage::ImageRgba8(ImageBuffer::from_pixel(32, 16, Rgba([20, 80, 140, 255])))
        .save(&source_path)
        .unwrap();
    let mut entity: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest).unwrap()).unwrap();
    entity["media"] = serde_json::json!({ "cover": "./_media/cover.png" });
    fs::write(&manifest, serde_json::to_vec_pretty(&entity).unwrap()).unwrap();

    let output = TestDirectory::new("component-media-output");
    let result = build(&BuildOptions {
        source: source.path().to_path_buf(),
        output: output.path().to_path_buf(),
        context: context_path(),
    })
    .unwrap();
    let media = Connection::open(
        output
            .path()
            .join(&result.locales["pt-BR"].system_media.path),
    )
    .unwrap();
    let (content_hash, thumbnail, mime): (Vec<u8>, Vec<u8>, String) = media
        .query_row(
            "SELECT content_hash, thumbnail, thumbnail_mime_type FROM media_assets",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .unwrap();
    let content_hash = content_hash
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect::<String>();
    assert_eq!(mime, "image/jpeg");
    assert!(thumbnail.starts_with(&[0xff, 0xd8, 0xff]));
    let cas_path = format!(
        "CAS/system/{}/{}/{}.bin",
        &content_hash[..2],
        &content_hash[2..4],
        content_hash
    );
    assert_eq!(
        fs::read(output.path().join(cas_path)).unwrap(),
        fs::read(source_path).unwrap()
    );
}
