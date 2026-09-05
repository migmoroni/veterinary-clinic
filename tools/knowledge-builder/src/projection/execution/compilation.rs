//! Confirms compilation operations only after locating their validated source result.

use super::receipts::{ConfirmedReceiptBatch, PendingReceipt, ProjectionEvent};
use crate::{
    contracts::locale::KnowledgeLocale,
    projection::{contract::CompilationOperation, coverage::CompilationOperationId},
    validation::ValidatedSource,
};

pub(crate) fn confirm_compilation(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    operations: &[CompilationOperation],
) -> Result<Option<ConfirmedReceiptBatch>, String> {
    let mut pending = Vec::new();
    for operation in operations {
        let entity = match &operation.identity {
            CompilationOperationId::CanonicalValidation { entity, .. }
            | CompilationOperationId::Document { entity }
            | CompilationOperationId::Section { entity, .. } => entity,
        };
        let entry = source
            .entities
            .iter()
            .find(|entry| {
                entry.source.entity.entity_type() == entity.entity_type
                    && entry.source.entity.id() == entity.id
            })
            .ok_or_else(|| format!("compiled operation references missing entity {entity}"))?;
        match &operation.identity {
            CompilationOperationId::CanonicalValidation { .. } => {}
            CompilationOperationId::Document { .. } => {
                entry.editorial.get(&locale).ok_or_else(|| {
                    format!("compiled document is missing for {entity} in {locale}")
                })?;
            }
            CompilationOperationId::Section { section_key, .. } => {
                let document = entry.editorial.get(&locale).ok_or_else(|| {
                    format!("compiled document is missing for {entity} in {locale}")
                })?;
                if !document
                    .sections
                    .iter()
                    .any(|section| section.section_key == *section_key)
                {
                    return Err(format!(
                        "compiled section {section_key} is missing for {entity} in {locale}"
                    ));
                }
            }
        }
        pending.push(PendingReceipt::new(
            operation.id(),
            operation.obligations.clone(),
            ProjectionEvent::Compilation(operation.identity.clone()),
            1,
        )?);
    }
    if pending.is_empty() {
        Ok(None)
    } else {
        ConfirmedReceiptBatch::confirm(pending).map(Some)
    }
}
