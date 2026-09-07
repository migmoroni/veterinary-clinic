//! Traverses validated source data to build the independent expected inventory.

use self::{
    entities::add_entity_obligations, media::add_media_obligations,
    metadata::add_metadata_obligations, model::ExpectedInventory, search::add_search_obligations,
};
use super::coverage::{
    EntityIdentity, ObligationClass, ProjectionObligation, ProjectionTarget, RowIdentity,
    SourceToken, SystemColumn, SystemTable,
};
use crate::{contracts::locale::KnowledgeLocale, validation::ValidatedSource};
use std::collections::BTreeSet;

mod authoring;
mod entities;
mod media;
mod metadata;
mod model;
mod search;
mod taxonomy;

pub(crate) fn expected_obligations(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    release: bool,
) -> Result<BTreeSet<ProjectionObligation>, crate::ContractError> {
    let mut expected = ExpectedInventory::default();
    add_metadata_obligations(&mut expected, locale, release)?;
    for entry in &source.entities {
        add_entity_obligations(&mut expected, source, entry, locale)?;
    }
    add_search_obligations(&mut expected, source, locale)?;
    add_media_obligations(&mut expected, source, locale)?;
    Ok(expected.finish())
}
