//! Owns expected taxonomy destinations and taxonomy lookup policy.

use super::{authoring::table_row, model::OperationDisposition, EntityIdentity, SystemTable};
use crate::{databases::DatabaseKind, validation::ValidatedSource};

pub(super) fn taxonomy_row(
    entity: &EntityIdentity,
    taxonomy_id: &str,
    term: &str,
) -> OperationDisposition {
    table_row(
        DatabaseKind::System,
        SystemTable::EntityTaxonomyTerms,
        format!("{}/{}/{taxonomy_id}/{term}", entity.entity_type, entity.id),
    )
}

pub(super) fn taxonomy_id<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a str, crate::ContractError> {
    Ok(source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .map(|taxonomy| taxonomy.id.as_str())
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))?)
}
