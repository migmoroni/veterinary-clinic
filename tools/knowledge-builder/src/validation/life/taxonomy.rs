//! Resolves life entities through the canonical hierarchical `life:type` taxonomy.

use super::super::{
    CanonicalEntity, Diagnostic, IndexedTaxonomyTerm, LifeEntity, SourceEntry, TaxonomyTermIndexes,
};
use crate::source::LifeRank;
use std::collections::BTreeMap;

pub(super) struct LifeIndex<'a> {
    pub(super) terms: BTreeMap<String, IndexedTaxonomyTerm>,
    pub(super) entities_by_term: BTreeMap<&'a str, (&'a SourceEntry, &'a LifeEntity)>,
}

impl LifeIndex<'_> {
    pub(super) fn values(&self) -> impl Iterator<Item = &(&SourceEntry, &LifeEntity)> {
        self.entities_by_term.values()
    }

    pub(super) fn is_ancestor(&self, ancestor: &str, descendant: &str) -> bool {
        let mut current = self
            .terms
            .get(descendant)
            .and_then(|term| term.parent_key.as_deref());
        while let Some(key) = current {
            if key == ancestor {
                return true;
            }
            current = self
                .terms
                .get(key)
                .and_then(|term| term.parent_key.as_deref());
        }
        false
    }
}

pub(super) fn validate_life_taxonomy<'a>(
    entries: &'a [SourceEntry],
    taxonomies: &'a TaxonomyTermIndexes,
    diagnostics: &mut Vec<Diagnostic>,
) -> LifeIndex<'a> {
    let terms = taxonomies
        .get(&("life".to_string(), "type".to_string()))
        .cloned()
        .unwrap_or_default();
    let mut entities_by_term = BTreeMap::new();

    for entry in entries {
        let CanonicalEntity::Life(entity) = &entry.entity else {
            continue;
        };
        let Some(term) = terms.get(&entity.type_term_key) else {
            diagnostics.push(Diagnostic::entity(
                entry,
                "typeTermKey",
                format!("unresolved life:type term {}", entity.type_term_key),
            ));
            continue;
        };
        if let Some((previous, _)) =
            entities_by_term.insert(entity.type_term_key.as_str(), (entry, &**entity))
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "typeTermKey",
                format!(
                    "life:type term {} is already associated with life entity {}",
                    entity.type_term_key,
                    previous.entity.id()
                ),
            ));
        }
        debug_assert_eq!(
            LifeRank::from_depth(term.depth).map(LifeRank::depth),
            Some(term.depth)
        );
    }

    LifeIndex {
        terms,
        entities_by_term,
    }
}
