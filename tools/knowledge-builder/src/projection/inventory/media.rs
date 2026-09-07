//! Declares locale-wide expected system_media and CAS obligations.

use super::{
    authoring::insert_obligation,
    model::{ExpectedInventory, OperationDisposition},
};
use crate::{
    contracts::locale::KnowledgeLocale,
    projection::coverage::{ObligationClass, ProjectionTarget, SourceToken},
    validation::ValidatedSource,
};
use std::collections::BTreeSet;

pub(super) fn add_media_obligations(
    expected: &mut ExpectedInventory,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<(), crate::ContractError> {
    let mut hashes = BTreeSet::new();
    for media_key in source
        .media_keys_by_locale
        .get(&locale)
        .into_iter()
        .flatten()
    {
        insert_obligation(
            expected,
            OperationDisposition {
                target: ProjectionTarget::SystemMediaAsset {
                    locale,
                    media_key: media_key.clone(),
                },
            },
            SourceToken::MediaAsset {
                locale,
                media_key: media_key.clone(),
            },
            ObligationClass::Media,
        )?;
        let asset = source
            .media
            .get(media_key)
            .ok_or_else(|| format!("media key has no asset: {media_key}"))?;
        hashes.insert(asset.content_hash_sha256.clone());
    }
    for content_hash in hashes {
        insert_obligation(
            expected,
            OperationDisposition {
                target: ProjectionTarget::CasObject {
                    locale,
                    content_hash: content_hash.clone(),
                },
            },
            SourceToken::CasObject {
                locale,
                content_hash: content_hash.clone(),
            },
            ObligationClass::Cas,
        )?;
    }
    Ok(())
}
