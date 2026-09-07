//! Owns search rows and the coverage declared by those rows.

use super::{
    declarations::SearchCandidate, ownership::ObligationOwnership, values::push_system,
    SystemProjectionOperation, SystemRow,
};
use crate::{normalization::normalize_search_text, projection::coverage::SystemTable};

pub(super) fn project_search(
    candidates: Vec<SearchCandidate>,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), crate::ContractError> {
    for candidate in candidates {
        let row_id = format!("{}/{}", candidate.entity, candidate.occurrence);
        push_system(
            operations,
            claims,
            SystemRow::SearchTerm {
                entity_type: candidate.entity.entity_type.clone(),
                entity_id: candidate.entity.id.clone(),
                normalized_value: normalize_search_text(&candidate.value),
                value: candidate.value,
                provenance: candidate.provenance,
                sort_order: candidate.occurrence,
            },
            SystemTable::EntitySearchTerms,
            row_id,
            Some(candidate.entity),
        )?;
    }
    Ok(())
}
