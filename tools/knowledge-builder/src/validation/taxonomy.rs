//! Validates taxonomy term trees and collects the closed taxonomy registry.

use super::*;
use crate::contracts::taxonomy::{taxonomy_spec, CANONICAL_TAXONOMIES};

pub(super) fn validate_taxonomy(
    entry: &SourceEntry,
    taxonomy: &TaxonomyEntity,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if taxonomy.purpose.contains("search") {
        diagnostics.push(Diagnostic::entity(
            entry,
            "purpose",
            "generic search taxonomy is forbidden",
        ));
    }
    let mut keys = BTreeSet::new();
    for (index, term) in taxonomy.terms.iter().enumerate() {
        if term.order != u32::try_from(index).unwrap_or(u32::MAX) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} order must equal its array position", term.key),
            ));
        }
        if !keys.insert(&term.key) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("duplicate term key {}", term.key),
            ));
        }
        validate_localized_content(
            entry,
            &term.localized_content,
            &["label"],
            &["aliases"],
            &["label"],
            &format!("terms.{}.localizedContent", term.key),
            diagnostics,
        );
        if term
            .localized_content
            .get("aliases")
            .is_some_and(|aliases| {
                LOCALES
                    .iter()
                    .all(|locale| aliases.values(*locale).is_empty())
            })
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} aliases field must be omitted when empty", term.key),
            ));
        }
    }
    for term in &taxonomy.terms {
        if term
            .parent_key
            .as_ref()
            .is_some_and(|parent| !keys.contains(parent))
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} has unresolved parent", term.key),
            ));
        }
        let mut visited = BTreeSet::from([term.key.as_str()]);
        let mut parent = term.parent_key.as_deref();
        while let Some(key) = parent {
            if !visited.insert(key) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "terms",
                    format!("term {} has a parent cycle", term.key),
                ));
                break;
            }
            parent = taxonomy
                .terms
                .iter()
                .find(|candidate| candidate.key == key)
                .and_then(|candidate| candidate.parent_key.as_deref());
        }
    }
}

pub(super) fn validate_taxonomy_completeness(
    source_root: &Path,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let expected = CANONICAL_TAXONOMIES
        .iter()
        .map(|spec| (spec.domain, spec.purpose))
        .collect::<BTreeSet<_>>();
    let observed = taxonomies
        .keys()
        .map(|(domain, purpose)| (domain.as_str(), purpose.as_str()))
        .collect::<BTreeSet<_>>();

    for (domain, purpose) in expected.difference(&observed) {
        diagnostics.push(Diagnostic::source(
            source_root,
            format!("missing canonical taxonomy {domain}:{purpose}"),
        ));
    }
    for (domain, purpose) in observed.difference(&expected) {
        debug_assert!(taxonomy_spec(domain, purpose).is_none());
        diagnostics.push(Diagnostic::source(
            source_root,
            format!("unsupported taxonomy domain and purpose {domain}:{purpose}"),
        ));
    }
}

pub(super) fn collect_taxonomies(
    entries: &[SourceEntry],
    diagnostics: &mut Vec<Diagnostic>,
) -> BTreeMap<(String, String), TaxonomyEntity> {
    let mut result = BTreeMap::new();
    for entry in entries {
        let CanonicalEntity::Taxonomy(taxonomy) = &entry.entity else {
            continue;
        };
        let key = (taxonomy.domain.clone(), taxonomy.purpose.clone());
        if result.insert(key.clone(), taxonomy.clone()).is_some() {
            diagnostics.push(Diagnostic::entity(
                entry,
                "purpose",
                format!("duplicate taxonomy owner {}:{}", key.0, key.1),
            ));
        }
    }
    result
}
