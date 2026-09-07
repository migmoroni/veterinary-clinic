//! Assembles one locale projection contract from validated canonical knowledge.

use super::{
    catalog::project_catalog,
    compilation::build_compilation_operations,
    declarations::{owned_obligations, search_candidates},
    media::{project_media_assets, project_media_references},
    metadata::build_metadata_operations,
    ownership::ObligationOwnership,
    search::project_search,
    taxonomy::{project_geo_places, project_taxonomies},
    ProjectionContract, ProjectionSourceFacts,
};
use crate::{
    contracts::locale::KnowledgeLocale, media::decode_hex, report::BuildContext,
    validation::ValidatedSource,
};
use std::collections::BTreeMap;

impl ProjectionContract {
    pub(crate) fn build(
        source: &ValidatedSource,
        locale: KnowledgeLocale,
        context: &BuildContext,
    ) -> Result<Self, crate::ContractError> {
        let declared = owned_obligations(source, locale, context.release.is_some())?;
        let mut claims = ObligationOwnership::from_declared(&declared)?;
        let search_candidates = search_candidates(source, locale)?;
        let source_digest = decode_hex(&source.source_digest_sha256)?;
        let metadata = build_metadata_operations(source_digest, locale, context, &mut claims)?;
        let compilation = build_compilation_operations(source, locale, &mut claims)?;

        let mut system = Vec::new();
        project_taxonomies(source, locale, &mut claims, &mut system)?;
        project_geo_places(source, locale, &mut claims, &mut system)?;
        project_catalog(source, locale, &mut claims, &mut system)?;
        project_media_references(source, locale, &mut claims, &mut system)?;
        project_search(search_candidates, &mut claims, &mut system)?;

        let (system_media, cas) = project_media_assets(source, locale, &mut claims)?;
        claims.finish()?;

        let entities_by_type =
            source
                .entities
                .iter()
                .fold(BTreeMap::<String, usize>::new(), |mut result, entry| {
                    *result
                        .entry(entry.source.entity.entity_type().to_string())
                        .or_default() += 1;
                    result
                });
        let localized_fragments = source
            .localized_fragments_by_locale
            .get(&locale)
            .copied()
            .unwrap_or_default();
        let contract = Self {
            locale,
            compilation,
            metadata,
            system,
            system_media,
            cas,
            source_facts: ProjectionSourceFacts {
                entities_by_type,
                relation_count: source.relation_count,
                localized_fragments,
                source_files: source.source_files,
            },
        };
        contract.validate()?;
        Ok(contract)
    }
}
