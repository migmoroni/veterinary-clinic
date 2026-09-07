//! Owns structural media, system_media, and CAS projection operations.

use super::{
    ownership::ObligationOwnership,
    values::{identity, push_system},
    CasProjectionOperation, SystemMediaProjectionOperation, SystemMediaRow,
    SystemProjectionOperation, SystemRow,
};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    media::decode_hex,
    projection::coverage::{ProjectionOperationId, RowEvent, RowIdentity, SystemTable},
    validation::ValidatedSource,
};
use std::collections::BTreeSet;

pub(super) fn project_media_references(
    source: &ValidatedSource,
    _locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), crate::ContractError> {
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        for reference in &entry.structural_media {
            let row_id = format!(
                "{}/{}/{}/{}",
                entity.entity_type, entity.id, reference.role, reference.sort_order
            );
            push_system(
                operations,
                claims,
                SystemRow::MediaReference {
                    entity_type: entity.entity_type.clone(),
                    entity_id: entity.id.clone(),
                    role: reference.role.to_string(),
                    media_key: reference.media_key.clone(),
                    sort_order: reference.sort_order,
                },
                SystemTable::EntityMediaReferences,
                row_id,
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

pub(super) fn project_media_assets(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
) -> Result<
    (
        Vec<SystemMediaProjectionOperation>,
        Vec<CasProjectionOperation>,
    ),
    crate::ContractError,
> {
    let mut system_media = Vec::new();
    let mut cas_hashes = BTreeSet::new();
    for media_key in source
        .media_keys_by_locale
        .get(&locale)
        .into_iter()
        .flatten()
    {
        let asset = source
            .media
            .get(media_key)
            .ok_or_else(|| format!("media key has no source asset: {media_key}"))?;
        let owner = ProjectionOperationId::SystemMediaAsset {
            media_key: media_key.clone(),
        };
        system_media.push(SystemMediaProjectionOperation {
            row: SystemMediaRow {
                media_key: asset.media_key.clone(),
                content_hash: decode_hex(&asset.content_hash_sha256)?,
                thumbnail: asset.thumbnail.clone(),
                thumbnail_mime_type: asset.thumbnail_mime_type.clone(),
                thumbnail_width: asset.thumbnail_width,
                thumbnail_height: asset.thumbnail_height,
                mime_type: asset.mime_type.clone(),
                size_bytes: asset.size_bytes,
                width: asset.width,
                height: asset.height,
            },
            obligations: claims.claim(&owner)?,
            event: RowEvent {
                database: DatabaseKind::SystemMedia,
                table: SystemTable::MediaAssets,
                row: RowIdentity::new(media_key),
                entity: None,
            },
        });
        cas_hashes.insert(asset.content_hash_sha256.clone());
    }

    let mut cas = Vec::new();
    for content_hash in cas_hashes {
        let asset = source
            .media
            .values()
            .find(|asset| asset.content_hash_sha256 == content_hash)
            .ok_or_else(|| format!("CAS hash has no source asset: {content_hash}"))?;
        let owner = ProjectionOperationId::CasObject {
            content_hash: content_hash.clone(),
        };
        cas.push(CasProjectionOperation {
            content_hash,
            bytes: asset.bytes.clone(),
            obligations: claims.claim(&owner)?,
        });
    }
    Ok((system_media, cas))
}
