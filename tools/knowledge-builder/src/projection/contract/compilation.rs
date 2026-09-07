//! Constructs compilation operations with directly declared ownership.

use super::{ownership::ObligationOwnership, values::identity, CompilationOperation};
use crate::{
    contracts::locale::KnowledgeLocale,
    projection::coverage::{CompilationOperationId, ProjectionOperationId},
    validation::ValidatedSource,
};

pub(super) fn build_compilation_operations(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    ownership: &mut ObligationOwnership,
) -> Result<Vec<CompilationOperation>, crate::ContractError> {
    let mut operations = Vec::new();
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        for validation in ["entity_type", "schema_version"] {
            push(
                &mut operations,
                ownership,
                CompilationOperationId::CanonicalValidation {
                    entity: entity.clone(),
                    validation,
                },
            )?;
        }
        if let Some(document) = entry.editorial.get(&locale) {
            push(
                &mut operations,
                ownership,
                CompilationOperationId::Document {
                    entity: entity.clone(),
                },
            )?;
            for section in &document.sections {
                push(
                    &mut operations,
                    ownership,
                    CompilationOperationId::Section {
                        entity: entity.clone(),
                        section_key: section.section_key.clone(),
                    },
                )?;
            }
        }
    }
    Ok(operations)
}

fn push(
    operations: &mut Vec<CompilationOperation>,
    ownership: &mut ObligationOwnership,
    identity: CompilationOperationId,
) -> Result<(), crate::ContractError> {
    let obligations = ownership.claim(&ProjectionOperationId::Compilation(identity.clone()))?;
    operations.push(CompilationOperation {
        identity,
        obligations,
    });
    Ok(())
}
