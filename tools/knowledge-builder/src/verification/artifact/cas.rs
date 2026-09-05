//! Verifies CAS object bytes, layout, visual properties, and locale/global sets.

use super::{manifest::verify_file_checksum, media::VerifiedMedia, VerificationContext};
use crate::{
    contracts::locale::{KnowledgeLocale, LOCALES},
    media::{cas_relative_path, decode_image, mime_for_format, sha256_hex},
};
use image::GenericImageView;
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
};

#[derive(Debug)]
pub(super) struct VerifiedCas {
    pub(super) global_hashes: BTreeSet<String>,
    #[allow(dead_code)]
    pub(super) locale_hashes: BTreeMap<KnowledgeLocale, BTreeSet<String>>,
}

pub(super) fn verify(
    context: &VerificationContext<'_>,
    media: &VerifiedMedia,
) -> Result<VerifiedCas, crate::VerificationError> {
    verify_inner(context, media).map_err(|detail| crate::VerificationError::invalid("CAS", detail))
}

fn verify_inner(
    context: &VerificationContext<'_>,
    media: &VerifiedMedia,
) -> Result<VerifiedCas, String> {
    let mut global_hashes = BTreeSet::new();
    for locale in LOCALES {
        let hashes = media.locale_hashes.get(&locale).unwrap();
        let artifacts = context.result.locales.get(locale.as_str()).unwrap();
        if set_digest(hashes) != artifacts.cas_set_digest_sha256 {
            return Err(format!("locale CAS set digest mismatch for {locale}"));
        }
        let contract = context.contracts.get(&locale).unwrap();
        for hash in hashes {
            let source_asset = context
                .source
                .media
                .values()
                .find(|asset| asset.content_hash_sha256 == *hash)
                .ok_or_else(|| format!("validated source misses CAS object {hash}"))?;
            let expected = contract
                .cas
                .iter()
                .find(|operation| operation.content_hash == *hash)
                .ok_or_else(|| format!("projection contract misses CAS object {hash}"))?;
            let path = context.cas_root.join(cas_relative_path(hash)?);
            verify_file_checksum(&path, hash)?;
            let bytes = fs::read(&path)
                .map_err(|error| format!("cannot read CAS object {}: {error}", path.display()))?;
            if bytes != expected.bytes
                || bytes.len() as u64 != source_asset.size_bytes
                || mime_for_format(image::guess_format(&bytes).map_err(|error| {
                    format!(
                        "cannot identify CAS object for {}: {error}",
                        source_asset.media_key
                    )
                })?)?
                    != source_asset.mime_type
                || decode_image(&bytes, &source_asset.source_path)?.dimensions()
                    != (source_asset.width, source_asset.height)
            {
                return Err(format!(
                    "CAS object bytes or visual metadata differ for {}",
                    source_asset.media_key
                ));
            }
        }
        global_hashes.extend(hashes.iter().cloned());
    }
    if global_hashes.len() != context.result.cas.object_count
        || set_digest(&global_hashes) != context.result.cas.set_digest_sha256
    {
        return Err("global CAS set differs from build-result.json".to_string());
    }
    Ok(VerifiedCas {
        global_hashes,
        locale_hashes: media.locale_hashes.clone(),
    })
}

fn set_digest(values: &BTreeSet<String>) -> String {
    let bytes = values
        .iter()
        .flat_map(|value| [value.as_bytes(), b"\n"].concat())
        .collect::<Vec<_>>();
    sha256_hex(&bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_digest_is_order_independent_and_line_delimited() {
        let first = BTreeSet::from(["b".to_string(), "a".to_string()]);
        let second = BTreeSet::from(["a".to_string(), "b".to_string()]);
        assert_eq!(set_digest(&first), set_digest(&second));
        assert_eq!(set_digest(&first), sha256_hex(b"a\nb\n"));
    }
}
