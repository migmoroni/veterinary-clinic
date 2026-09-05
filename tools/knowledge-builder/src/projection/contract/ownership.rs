//! Assigns each independently inventoried obligation to one explicit operation identity.

use super::*;

#[derive(Clone, Debug, Default)]
pub(super) struct ObligationOwnership {
    by_owner: BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>,
}

impl ObligationOwnership {
    pub(super) fn from_expected(expected: &BTreeSet<ProjectionObligation>) -> Result<Self, String> {
        let mut result = Self::default();
        for obligation in expected {
            let owner = owner_for(obligation)?;
            result
                .by_owner
                .entry(owner)
                .or_default()
                .insert(obligation.clone());
        }
        Ok(result)
    }

    pub(super) fn claim(
        &mut self,
        owner: &ProjectionOperationId,
    ) -> Result<BTreeSet<ProjectionObligation>, String> {
        self.by_owner
            .remove(owner)
            .ok_or_else(|| format!("operation has no declared obligation owner: {owner:?}"))
    }

    pub(super) fn finish(self) -> Result<(), String> {
        if self.by_owner.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "{} projection owner(s) have no operation",
                self.by_owner.len()
            ))
        }
    }
}

fn owner_for(obligation: &ProjectionObligation) -> Result<ProjectionOperationId, String> {
    let owner = match &obligation.target {
        ProjectionTarget::CanonicalValidation {
            entity, validation, ..
        } => ProjectionOperationId::Compilation(CompilationOperationId::CanonicalValidation {
            entity: entity.clone(),
            validation,
        }),
        ProjectionTarget::TableRow { table, row, .. }
        | ProjectionTarget::TableColumn { table, row, .. } => ProjectionOperationId::SystemRow {
            table: *table,
            row: row.clone(),
        },
        ProjectionTarget::SearchTerm {
            entity, occurrence, ..
        } => ProjectionOperationId::SystemRow {
            table: SystemTable::EntitySearchTerms,
            row: RowIdentity::new(format!("{entity}/{occurrence}")),
        },
        ProjectionTarget::CompiledDocument { entity, .. } => {
            ProjectionOperationId::Compilation(CompilationOperationId::Document {
                entity: entity.clone(),
            })
        }
        ProjectionTarget::CompiledSection {
            entity,
            section_key,
            ..
        } => ProjectionOperationId::Compilation(CompilationOperationId::Section {
            entity: entity.clone(),
            section_key: section_key.clone(),
        }),
        ProjectionTarget::SystemMediaAsset { media_key, .. } => {
            ProjectionOperationId::SystemMediaAsset {
                media_key: media_key.clone(),
            }
        }
        ProjectionTarget::CasObject { content_hash, .. } => ProjectionOperationId::CasObject {
            content_hash: content_hash.clone(),
        },
        ProjectionTarget::BuildMetadata {
            database, release, ..
        } => ProjectionOperationId::Metadata {
            database: *database,
            release: *release,
        },
    };
    Ok(owner)
}
