//! Traverses validated source data to build the independent expected inventory.

use self::{entities::add_entity_obligations, helpers::insert_obligation};
use super::coverage::{
    EntityIdentity, ObligationClass, ProjectionObligation, ProjectionTarget, RowIdentity,
    SearchCandidate, SourceToken, SystemColumn, SystemTable,
};
use crate::{
    contracts::locale::KnowledgeLocale, databases::DatabaseKind, validation::ValidatedSource,
};
use std::collections::BTreeSet;

mod entities;
mod helpers;
mod media;
mod search;
mod taxonomy;

pub(crate) use search::search_candidates;

#[derive(Clone, Debug)]
pub(super) struct OperationDisposition {
    pub(super) target: ProjectionTarget,
}

impl OperationDisposition {
    pub(super) fn column(&self, column: SystemColumn) -> Self {
        let ProjectionTarget::TableRow {
            database,
            table,
            row,
        } = &self.target
        else {
            panic!("only a SQLite row disposition can select a column");
        };
        Self {
            target: ProjectionTarget::TableColumn {
                database: *database,
                table: *table,
                row: row.clone(),
                column,
            },
        }
    }
}

#[derive(Clone, Debug, Default)]
struct ExpectedInventory {
    expected: BTreeSet<ProjectionObligation>,
}

impl ExpectedInventory {
    pub(super) fn insert(
        &mut self,
        disposition: OperationDisposition,
        source: SourceToken,
        class: ObligationClass,
    ) -> Result<(), String> {
        let obligation = ProjectionObligation {
            source,
            target: disposition.target,
            class,
        };
        if !self.expected.insert(obligation.clone()) {
            return Err(format!(
                "projection obligation is declared more than once: {obligation}"
            ));
        }
        Ok(())
    }
}

pub(crate) fn expected_obligations(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    release: bool,
) -> Result<BTreeSet<ProjectionObligation>, String> {
    let mut expected = ExpectedInventory::default();
    for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
        insert_obligation(
            &mut expected,
            OperationDisposition {
                target: ProjectionTarget::BuildMetadata {
                    database,
                    locale,
                    release: false,
                },
            },
            SourceToken::BuildMetadata {
                database,
                locale,
                release: false,
            },
            ObligationClass::Metadata,
        )?;
        if release {
            insert_obligation(
                &mut expected,
                OperationDisposition {
                    target: ProjectionTarget::BuildMetadata {
                        database,
                        locale,
                        release: true,
                    },
                },
                SourceToken::BuildMetadata {
                    database,
                    locale,
                    release: true,
                },
                ObligationClass::Metadata,
            )?;
        }
    }
    for entry in &source.entities {
        add_entity_obligations(&mut expected, source, entry, locale)?;
    }
    for candidate in search_candidates(source, locale)? {
        let class = if matches!(candidate.source, SourceToken::LocalizedValue { .. }) {
            ObligationClass::LocalizedContent
        } else {
            ObligationClass::Authoring
        };
        insert_obligation(
            &mut expected,
            OperationDisposition {
                target: ProjectionTarget::SearchTerm {
                    entity: candidate.entity.clone(),
                    locale,
                    provenance: candidate.provenance.clone(),
                    occurrence: candidate.occurrence,
                },
            },
            candidate.source,
            class,
        )?;
    }
    let mut hashes = BTreeSet::new();
    for media_key in source
        .media_keys_by_locale
        .get(&locale)
        .into_iter()
        .flatten()
    {
        insert_obligation(
            &mut expected,
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
            &mut expected,
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
    Ok(expected.expected)
}
