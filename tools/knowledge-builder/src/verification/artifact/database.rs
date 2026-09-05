//! Verifies database identity and schema, then reads each database exactly once.

use super::{
    identity::resolve_version_path,
    manifest::{verify_file_checksum, VerifiedManifest},
    VerificationContext,
};
use crate::{
    contracts::{
        artifact::locale_artifact,
        locale::{KnowledgeLocale, LOCALES},
    },
    databases::{self, DatabaseKind},
    media::decode_hex,
    report::{self, DatabaseArtifact, LocaleProjection},
    verification::readers::{self, LocaleDatabaseRows},
};
use rusqlite::{Connection, OpenFlags};
use std::collections::BTreeMap;

#[derive(Debug)]
pub(super) struct VerifiedDatabases {
    pub(super) locales: BTreeMap<KnowledgeLocale, LocaleDatabaseRows>,
}

pub(super) fn verify(
    context: &VerificationContext<'_>,
    manifest: &VerifiedManifest,
) -> Result<VerifiedDatabases, String> {
    let mut locales = BTreeMap::new();
    let mut system_fingerprint = None;
    let mut media_fingerprint = None;
    for locale in LOCALES {
        let artifacts = context
            .result
            .locales
            .get(locale.as_str())
            .ok_or_else(|| format!("build result misses locale {locale}"))?;
        let system = open_and_verify(context, &artifacts.system, DatabaseKind::System, locale)?;
        let media = open_and_verify(
            context,
            &artifacts.system_media,
            DatabaseKind::SystemMedia,
            locale,
        )?;
        assert_shared_fingerprint(
            &mut system_fingerprint,
            &artifacts.system.schema_fingerprint_sha256,
            "system",
            locale,
        )?;
        assert_shared_fingerprint(
            &mut media_fingerprint,
            &artifacts.system_media.schema_fingerprint_sha256,
            "system_media",
            locale,
        )?;
        let contract = context
            .contracts
            .get(&locale)
            .ok_or_else(|| format!("projection contract misses locale {locale}"))?;
        let rows = readers::read(&system, &media, contract)?;
        let locale_report = manifest
            .report
            .locales
            .get(locale.as_str())
            .ok_or_else(|| format!("projection report misses locale {locale}"))?;
        verify_row_counts(&rows, locale_report)?;
        readers::verify_semantic_equivalence(&rows, contract)?;
        locales.insert(locale, rows);
    }
    Ok(VerifiedDatabases { locales })
}

fn open_and_verify(
    context: &VerificationContext<'_>,
    artifact: &DatabaseArtifact,
    kind: DatabaseKind,
    locale: KnowledgeLocale,
) -> Result<Connection, String> {
    let expected_relative = report::normalized_relative_path(&locale_artifact(
        context.context.build_version,
        locale,
        *kind.identity(),
    ))?;
    if artifact.path != expected_relative {
        return Err(format!(
            "non-canonical database artifact path: {}",
            artifact.path
        ));
    }
    let path = resolve_version_path(context, &artifact.path)?;
    let metadata = std::fs::metadata(&path)
        .map_err(|error| format!("cannot stat database {}: {error}", path.display()))?;
    if metadata.len() != artifact.size_bytes {
        return Err(format!("sizeBytes mismatch for {}", path.display()));
    }
    verify_file_checksum(&path, &artifact.checksum_sha256)?;
    let connection = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("cannot open database {}: {error}", path.display()))?;
    let source_digest = decode_hex(&context.result.source_digest_sha256)?;
    databases::verify_contract(
        &connection,
        &path,
        kind,
        context.context,
        locale,
        &source_digest,
    )?;
    if databases::schema_fingerprint(&connection)? != artifact.schema_fingerprint_sha256 {
        return Err(format!(
            "schema fingerprint mismatch for {}",
            path.display()
        ));
    }
    Ok(connection)
}

fn verify_row_counts(rows: &LocaleDatabaseRows, report: &LocaleProjection) -> Result<(), String> {
    let expected_system = report
        .rows_by_database
        .get("system")
        .ok_or_else(|| "report misses rows for system".to_string())?;
    for (table, observed) in &rows.system {
        if expected_system.get(table.as_str()).copied() != Some(observed.len()) {
            return Err(format!("row count mismatch for system.{}", table.as_str()));
        }
    }
    let expected_media = report
        .rows_by_database
        .get("systemMedia")
        .ok_or_else(|| "report misses rows for systemMedia".to_string())?;
    if expected_media.get("media_assets").copied() != Some(rows.system_media.len()) {
        return Err("row count mismatch for systemMedia.media_assets".to_string());
    }
    Ok(())
}

fn assert_shared_fingerprint(
    expected: &mut Option<String>,
    current: &str,
    kind: &str,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    if let Some(expected) = expected {
        if expected != current {
            return Err(format!(
                "{kind} schema fingerprint differs for locale {locale}"
            ));
        }
    } else {
        *expected = Some(current.to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn database_fingerprints_must_be_shared_across_locales() {
        let mut observed = None;
        assert_shared_fingerprint(&mut observed, "same", "system", KnowledgeLocale::PtBr).unwrap();
        assert_shared_fingerprint(&mut observed, "same", "system", KnowledgeLocale::EnUs).unwrap();
        assert!(assert_shared_fingerprint(
            &mut observed,
            "different",
            "system",
            KnowledgeLocale::EsEs
        )
        .is_err());
    }
}
