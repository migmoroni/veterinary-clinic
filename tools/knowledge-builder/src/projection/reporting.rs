//! Builds the public projection report from completed evidence ledgers.

use super::*;

pub(super) fn projection_report(
    source: &ValidatedSource,
    context: &BuildContext,
    contracts: &BTreeMap<KnowledgeLocale, ProjectionContract>,
    ledgers: &BTreeMap<KnowledgeLocale, CompletedLedger>,
) -> ProjectionReport {
    let entities_by_type = source
        .entities
        .iter()
        .fold(BTreeMap::new(), |mut result, entry| {
            *result
                .entry(entry.source.entity.entity_type().to_string())
                .or_insert(0) += 1;
            result
        });
    let localized_fragments = source
        .localized_fragments_by_locale
        .iter()
        .map(|(locale, count)| (locale.to_string(), *count))
        .collect::<BTreeMap<_, _>>();
    let locales = ledgers
        .iter()
        .map(|(locale, ledger)| {
            debug_assert_eq!(ledger.locale, *locale);
            let contract = contracts.get(locale).unwrap();
            let consumed_entities = ledger.entities_by_type();
            let rows = ledger.rows_by_type();
            let projected_by_type = entities_by_type
                .keys()
                .map(|entity_type| {
                    (
                        entity_type.clone(),
                        TypeProjection {
                            entities: *consumed_entities.get(entity_type).unwrap_or(&0),
                            rows_by_table: rows.get(entity_type).cloned().unwrap_or_default(),
                        },
                    )
                })
                .collect();
            (
                locale.to_string(),
                LocaleProjection {
                    projected_by_type,
                    rows_by_database: contract.rows_by_database(),
                    expected_obligation_count: ledger.expected_count(),
                    completed_obligation_count: ledger.completed_count(),
                    row_event_count: ledger.row_event_count(),
                    operation_count: contract.operation_count(),
                    resolved_relation_count: ledger.relation_count(),
                    consumed_localized_fragments: ledger.localized_fragment_count(),
                    evidence_digest_sha256: ledger.evidence_digest(),
                },
            )
        })
        .collect();
    let unique_hashes = source
        .media
        .values()
        .map(|asset| asset.content_hash_sha256.as_str())
        .collect::<BTreeSet<_>>()
        .len();
    ProjectionReport {
        schema_version: 4,
        source_digest_sha256: source.source_digest_sha256.clone(),
        build_version: context.build_version,
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
        source: ProjectionSource {
            entities_by_type,
            relation_count: source.relation_count,
            localized_fragments_by_locale: localized_fragments,
            source_files: source.source_files,
        },
        locales,
        media: MediaProjection {
            source_files: source
                .media
                .values()
                .map(|asset| asset.source_path.as_path())
                .collect::<BTreeSet<_>>()
                .len(),
            referenced_media_keys: source.media.len(),
            unique_content_hashes: unique_hashes,
        },
    }
}
