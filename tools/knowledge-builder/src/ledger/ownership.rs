//! Assigns every projection obligation to one explicit operation owner and
//! exposes closed batches for contract construction.

use super::{
    entity_obligations::add_entity_obligations,
    obligation_helpers::{insert_obligation, operation_disposition},
    search::search_candidates,
    ObligationClass, ProjectionObligation, ProjectionOperationId, ProjectionTarget, SourceToken,
    SystemColumn, SystemTable,
};
use crate::{databases::DatabaseKind, source::KnowledgeLocale, validation::ValidatedSource};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub(super) struct OperationDisposition {
    pub(super) owner: ProjectionOperationId,
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
            owner: self.owner.clone(),
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
pub(crate) struct ObligationOwnership {
    by_owner: BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>,
    expected: BTreeSet<ProjectionObligation>,
}

impl ObligationOwnership {
    pub(crate) fn claim(
        &mut self,
        owner: &ProjectionOperationId,
    ) -> Result<BTreeSet<ProjectionObligation>, String> {
        self.by_owner
            .remove(owner)
            .ok_or_else(|| format!("operation has no declared obligation owner: {owner:?}"))
    }

    pub(crate) fn expected(&self) -> BTreeSet<ProjectionObligation> {
        self.expected.clone()
    }

    pub(crate) fn finish(self) -> Result<(), String> {
        if self.by_owner.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "{} projection owner(s) have no operation",
                self.by_owner.len()
            ))
        }
    }

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
        self.by_owner
            .entry(disposition.owner)
            .or_default()
            .insert(obligation);
        Ok(())
    }
}

pub(crate) fn owned_obligations(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    release: bool,
) -> Result<ObligationOwnership, String> {
    let mut expected = ObligationOwnership::default();
    for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
        insert_obligation(
            &mut expected,
            OperationDisposition {
                owner: ProjectionOperationId::Metadata {
                    database,
                    release: false,
                },
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
                    owner: ProjectionOperationId::Metadata {
                        database,
                        release: true,
                    },
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
            operation_disposition(
                ProjectionOperationId::SystemRow {
                    table: SystemTable::EntitySearchTerms,
                    row: format!("{}/{}", candidate.entity, candidate.occurrence),
                },
                ProjectionTarget::SearchTerm {
                    entity: candidate.entity.clone(),
                    locale,
                    provenance: candidate.provenance.clone(),
                    occurrence: candidate.occurrence,
                },
            ),
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
                owner: ProjectionOperationId::SystemMediaAsset {
                    media_key: media_key.clone(),
                },
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
                owner: ProjectionOperationId::CasObject {
                    content_hash: content_hash.clone(),
                },
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
    Ok(expected)
}
