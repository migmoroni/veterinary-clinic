//! Verifies semantic media references, complete asset metadata, and JPEG thumbnails.

use super::{database::VerifiedDatabases, VerificationContext};
use crate::{
    contracts::locale::{KnowledgeLocale, LOCALES},
    markdown::{collect_compiled_media_keys, CompiledDocument},
    projection::{contract::SystemRow, coverage::SystemTable},
    schemas,
};
use image::{GenericImageView, ImageFormat};
use std::collections::{BTreeMap, BTreeSet};

type CompiledSectionIdentity = (String, String, String);
type CompiledMediaOccurrences = BTreeMap<CompiledSectionIdentity, Vec<String>>;

#[derive(Debug)]
pub(super) struct VerifiedMedia {
    pub(super) locale_hashes: BTreeMap<KnowledgeLocale, BTreeSet<String>>,
}

pub(super) fn verify(
    context: &VerificationContext<'_>,
    databases: &VerifiedDatabases,
) -> Result<VerifiedMedia, crate::VerificationError> {
    verify_inner(context, databases)
}

fn verify_inner(
    context: &VerificationContext<'_>,
    databases: &VerifiedDatabases,
) -> Result<VerifiedMedia, crate::VerificationError> {
    let expected_structural = context
        .source
        .entities
        .iter()
        .flat_map(|entry| {
            entry.structural_media.iter().map(|reference| {
                (
                    entry.source.entity.entity_type().to_string(),
                    entry.source.entity.id().to_string(),
                    reference.role.to_string(),
                    reference.sort_order,
                    reference.media_key.clone(),
                )
            })
        })
        .collect::<BTreeSet<_>>();
    let mut locale_hashes = BTreeMap::new();

    for locale in LOCALES {
        let rows = databases.locales.get(&locale).unwrap();
        let structural_rows = structural_media_references(&rows.system);
        if structural_rows != expected_structural {
            return Err((format!(
                "structural media references differ from source evidence for {locale}"
            ))
            .into());
        }
        verify_structural_media_owners(&rows.system, &structural_rows)?;
        let structural = structural_rows
            .iter()
            .map(|row| row.4.clone())
            .collect::<BTreeSet<_>>();

        let system_path = context
            .version_root
            .join(&context.result.locales[locale.as_str()].system.path);
        let markdown_occurrences = compiled_media_occurrences(&rows.system, &system_path)?;
        let mut expected_markdown = BTreeMap::<CompiledSectionIdentity, Vec<String>>::new();
        for entry in &context.source.entities {
            for reference in entry.markdown_media.get(&locale).into_iter().flatten() {
                expected_markdown
                    .entry((
                        entry.source.entity.entity_type().to_string(),
                        entry.source.entity.id().to_string(),
                        reference.section_key.clone(),
                    ))
                    .or_default()
                    .push(reference.media_key.clone());
            }
        }
        if markdown_occurrences != expected_markdown {
            return Err((format!(
                "compiled Markdown media occurrences differ from source evidence for {locale}"
            ))
            .into());
        }
        let markdown = markdown_occurrences
            .values()
            .flatten()
            .cloned()
            .collect::<BTreeSet<_>>();
        let referenced = structural
            .union(&markdown)
            .cloned()
            .collect::<BTreeSet<_>>();

        let contract = &context.plans.get(&locale).unwrap().contract;
        let mut assets = BTreeSet::new();
        let mut hashes = BTreeSet::new();
        for (media_key, row) in &rows.system_media {
            let hash = encode_hex(&row.content_hash);
            let source_asset = context.source.media.get(media_key).ok_or_else(|| {
                format!("localized media asset is absent from validated source: {media_key}")
            })?;
            if !contract
                .cas
                .iter()
                .any(|operation| operation.content_hash == hash)
            {
                return Err((format!("projection contract misses CAS object {hash}")).into());
            }
            if hash != source_asset.content_hash_sha256
                || row.mime_type != source_asset.mime_type
                || row.size_bytes != source_asset.size_bytes
                || (row.width, row.height) != (source_asset.width, source_asset.height)
            {
                return Err((format!(
                    "original media metadata differs from source evidence for {media_key}"
                ))
                .into());
            }
            if row.thumbnail_mime_type != "image/jpeg"
                || image::guess_format(&row.thumbnail).map_err(|source| {
                    crate::VerificationError::Image {
                        artifact: format!("thumbnail {media_key}"),
                        path: media_key.into(),
                        source,
                    }
                })? != ImageFormat::Jpeg
            {
                return Err((format!("thumbnail for {media_key} is not JPEG")).into());
            }
            let decoded = image::load_from_memory_with_format(&row.thumbnail, ImageFormat::Jpeg)
                .map_err(|source| crate::VerificationError::Image {
                    artifact: format!("thumbnail {media_key}"),
                    path: media_key.into(),
                    source,
                })?;
            if decoded.dimensions() != (row.thumbnail_width, row.thumbnail_height)
                || row.thumbnail_width > 200
                || row.thumbnail_height > 200
                || row.thumbnail_width > row.width
                || row.thumbnail_height > row.height
            {
                return Err((format!("thumbnail dimensions mismatch for {media_key}")).into());
            }
            assets.insert(media_key.clone());
            hashes.insert(hash);
        }
        if assets != referenced {
            return Err((format!("localized media assets differ from structural and Markdown references for {locale}")).into());
        }
        locale_hashes.insert(locale, hashes);
    }
    Ok(VerifiedMedia { locale_hashes })
}

fn structural_media_references(
    rows: &crate::verification::readers::SystemRows,
) -> BTreeSet<crate::verification::readers::StructuralMediaRow> {
    rows[&SystemTable::EntityMediaReferences]
        .values()
        .filter_map(|row| match row {
            SystemRow::MediaReference {
                entity_type,
                entity_id,
                role,
                media_key,
                sort_order,
            } => Some((
                entity_type.clone(),
                entity_id.clone(),
                role.clone(),
                *sort_order,
                media_key.clone(),
            )),
            _ => None,
        })
        .collect()
}

fn verify_structural_media_owners(
    rows: &crate::verification::readers::SystemRows,
    references: &BTreeSet<crate::verification::readers::StructuralMediaRow>,
) -> Result<(), crate::VerificationError> {
    let owners = rows
        .values()
        .flat_map(|table| table.values())
        .filter_map(|row| match row {
            SystemRow::Life { id, .. } => Some(("life", id.as_str())),
            SystemRow::Product { id, .. } => Some(("product", id.as_str())),
            SystemRow::Manufacturer { id, .. } => Some(("manufacturer", id.as_str())),
            SystemRow::ActiveIngredient { id, .. } => Some(("active_ingredient", id.as_str())),
            SystemRow::Condition { id, .. } => Some(("condition", id.as_str())),
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    for (entity_type, entity_id, ..) in references {
        if !owners.contains(&(entity_type.as_str(), entity_id.as_str())) {
            return Err((format!(
                "structural media owner does not exist: {entity_type}:{entity_id}"
            ))
            .into());
        }
    }
    Ok(())
}

fn compiled_media_occurrences(
    rows: &crate::verification::readers::SystemRows,
    database: &std::path::Path,
) -> Result<CompiledMediaOccurrences, crate::VerificationError> {
    let mut result = BTreeMap::new();
    for row in rows.values().flat_map(|table| table.values()) {
        let (entity_type, id, content) = match row {
            SystemRow::Life {
                id, content_json, ..
            } => ("life", id, content_json),
            SystemRow::Manufacturer {
                id, content_json, ..
            } => ("manufacturer", id, content_json),
            SystemRow::ActiveIngredient {
                id, content_json, ..
            } => ("active_ingredient", id, content_json),
            SystemRow::Condition {
                id, content_json, ..
            } => ("condition", id, content_json),
            SystemRow::Product {
                id, content_json, ..
            } => ("product", id, content_json),
            _ => continue,
        };
        let artifact = format!("compiled content {entity_type}:{id}");
        let raw: serde_json::Value =
            serde_json::from_str(content).map_err(|source| crate::VerificationError::Json {
                artifact: artifact.clone(),
                path: database.to_path_buf(),
                source,
            })?;
        schemas::validate_content(&raw)?;
        let document: CompiledDocument =
            serde_json::from_value(raw).map_err(|source| crate::VerificationError::Json {
                artifact,
                path: database.to_path_buf(),
                source,
            })?;
        for section in document.sections {
            let keys = collect_compiled_media_keys(&section.compiled_markdown)?;
            if !keys.is_empty() {
                result.insert(
                    (entity_type.to_string(), id.clone(), section.section_key),
                    keys,
                );
            }
        }
    }
    Ok(result)
}

fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn content_hashes_use_lowercase_hex() {
        assert_eq!(encode_hex(&[0x00, 0xab, 0xff]), "00abff");
    }
}
