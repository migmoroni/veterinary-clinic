//! Verifies report identity, ownership coverage, counts, and evidence digests.

use super::{
    cas::VerifiedCas, database::VerifiedDatabases, manifest::VerifiedManifest, VerificationContext,
};
use crate::{
    contracts::{locale::LOCALES, version::PROJECTION_REPORT_SCHEMA_VERSION},
    projection::{coverage::ObligationClass, ledger::evidence_digest},
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug)]
pub(super) struct VerifiedEvidence;

pub(super) fn verify(
    context: &VerificationContext<'_>,
    manifest: &VerifiedManifest,
    databases: &VerifiedDatabases,
    cas: &VerifiedCas,
) -> Result<VerifiedEvidence, String> {
    let report = &manifest.report;
    if report.schema_version != PROJECTION_REPORT_SCHEMA_VERSION
        || report.source_digest_sha256 != context.result.source_digest_sha256
        || report.build_version != context.result.build_version
        || report.system_schema_version != context.result.system_schema_version
        || report.system_media_schema_version != context.result.system_media_schema_version
    {
        return Err("projection report identity differs from build-result.json".to_string());
    }
    if databases.locales.len() != LOCALES.len() || cas.locale_hashes.len() != LOCALES.len() {
        return Err("verified locale coverage is incomplete".to_string());
    }
    let entities_by_type = context.source.entities.iter().fold(
        BTreeMap::<String, usize>::new(),
        |mut result, entry| {
            *result
                .entry(entry.source.entity.entity_type().to_string())
                .or_default() += 1;
            result
        },
    );
    let localized = context
        .source
        .localized_fragments_by_locale
        .iter()
        .map(|(locale, count)| (locale.to_string(), *count))
        .collect::<BTreeMap<_, _>>();
    if report.source.entities_by_type != entities_by_type
        || report.source.relation_count != context.source.relation_count
        || report.source.localized_fragments_by_locale != localized
        || report.source.source_files != context.source.source_files
    {
        return Err("projection report source facts differ from validated source".to_string());
    }
    for locale in LOCALES {
        let contract = context.contracts.get(&locale).unwrap();
        let expected_relation_count = contract
            .expected_obligations
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::Relation)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len();
        let expected_localized_fragments = contract
            .expected_obligations
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len();
        if expected_relation_count != context.source.relation_count {
            return Err(format!(
                "regenerated relation obligations differ from source facts for {locale}"
            ));
        }
        let actual = report.locales.get(locale.as_str()).unwrap();
        if actual.expected_obligation_count != contract.expected_obligations.len()
            || actual.completed_obligation_count != contract.expected_obligations.len()
            || actual.operation_count != contract.operation_count()
            || actual.resolved_relation_count != expected_relation_count
            || actual.consumed_localized_fragments != expected_localized_fragments
            || expected_localized_fragments != contract.source_facts.localized_fragments
            || actual.evidence_digest_sha256 != evidence_digest(&contract.expected_obligations)
        {
            return Err(format!("projection evidence mismatch for {locale}"));
        }
        let projected_entities = actual
            .projected_by_type
            .iter()
            .map(|(entity_type, projection)| (entity_type.clone(), projection.entities))
            .collect::<BTreeMap<_, _>>();
        if projected_entities != entities_by_type {
            return Err(format!("projected entity counts mismatch for {locale}"));
        }
        let projectable_rows = actual
            .rows_by_database
            .values()
            .flat_map(|tables| tables.values())
            .sum::<usize>();
        let metadata_events = 2 + usize::from(context.context.release.is_some()) * 2;
        if actual.row_event_count != projectable_rows + metadata_events {
            return Err(format!("row event count mismatch for {locale}"));
        }
        let mut rows_from_types = BTreeMap::<String, usize>::new();
        for projection in actual.projected_by_type.values() {
            for (table, count) in &projection.rows_by_table {
                *rows_from_types.entry(table.clone()).or_default() += count;
            }
        }
        let system_rows = actual.rows_by_database.get("system").unwrap();
        for (table, count) in system_rows {
            if rows_from_types.get(table).copied().unwrap_or_default() != *count {
                return Err(format!(
                    "rowsByTable attribution mismatch for {locale}.{table}"
                ));
            }
        }
    }
    let source_media_files = context
        .source
        .media
        .values()
        .map(|asset| asset.source_path.as_path())
        .collect::<BTreeSet<_>>()
        .len();
    let unique_hashes = context
        .source
        .media
        .values()
        .map(|asset| asset.content_hash_sha256.as_str())
        .collect::<BTreeSet<_>>()
        .len();
    if report.media.source_files != source_media_files
        || report.media.referenced_media_keys != context.source.media.len()
        || report.media.unique_content_hashes != unique_hashes
    {
        return Err("projection report media facts differ from validated source".to_string());
    }
    Ok(VerifiedEvidence)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn evidence_stage_is_an_immutable_completion_token() {
        assert_eq!(format!("{:?}", VerifiedEvidence), "VerifiedEvidence");
    }
}
