//! Validates taxonomy term trees and collects the closed taxonomy registry.

use super::{
    validate_localized_content, CanonicalEntity, Diagnostic, IndexedTaxonomyTerm, SourceEntry,
    TaxonomyEntity, TaxonomyTermIndexes, LOCALES,
};
use crate::contracts::taxonomy::{taxonomy_spec, CANONICAL_TAXONOMIES};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

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
    let mut term_count = 0usize;
    for visit in taxonomy.walk_terms() {
        let term = visit.term;
        term_count += 1;
        let key_path = format!("{}.key", visit.source_path);
        if !keys.insert(&term.key) {
            diagnostics.push(Diagnostic::entity(
                entry,
                &key_path,
                format!("duplicate term key {}", term.key),
            ));
        }
        if visit.depth >= 32 {
            diagnostics.push(Diagnostic::entity(
                entry,
                &key_path,
                "taxonomy depth must not exceed 32 levels",
            ));
        }
        validate_localized_content(
            entry,
            &term.localized_content,
            &["label"],
            &["aliases"],
            &["label"],
            &format!("{}.localizedContent", visit.source_path),
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
                format!("{}.localizedContent.aliases", visit.source_path),
                format!("term {} aliases field must be omitted when empty", term.key),
            ));
        }
    }
    if term_count > 10_000 {
        diagnostics.push(Diagnostic::entity(
            entry,
            "terms",
            "taxonomy must not contain more than 10000 terms",
        ));
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
) -> (
    BTreeMap<(String, String), TaxonomyEntity>,
    TaxonomyTermIndexes,
) {
    let mut result = BTreeMap::new();
    let mut indexes = BTreeMap::new();
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
        indexes.insert(
            key,
            taxonomy
                .walk_terms()
                .map(|visit| {
                    (
                        visit.term.key.clone(),
                        IndexedTaxonomyTerm {
                            term: visit.term.clone(),
                            parent_key: visit.parent_key.map(str::to_string),
                            sibling_order: visit.sibling_order,
                            depth: visit.depth,
                            owner_path: visit.owner_path().to_string(),
                            source_path: visit.source_path,
                        },
                    )
                })
                .collect(),
        );
    }
    (result, indexes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn localized_label(label: &str) -> serde_json::Value {
        serde_json::json!({
            "label": {
                "pt-BR": label, "pt-PT": label, "gn-PY": label,
                "en-US": label, "es-ES": label, "fr-FR": label
            }
        })
    }

    #[test]
    fn traversal_preserves_opaque_keys_and_derives_only_structural_metadata() {
        let taxonomy: TaxonomyEntity = serde_json::from_value(serde_json::json!({
            "schemaVersion": 1,
            "id": "opaque-keys",
            "domain": "product",
            "purpose": "classification",
            "terms": [
                {
                    "key": "administrationRoute.epidural",
                    "localizedContent": localized_label("Epidural"),
                    "children": [
                        {
                            "key": "unrelatedChildIdentity",
                            "localizedContent": localized_label("Child"),
                            "children": [
                                {
                                    "key": "namespace.grandchild",
                                    "localizedContent": localized_label("Grandchild")
                                }
                            ]
                        }
                    ]
                },
                {
                    "key": "regulatory.brazil.prescriptionOnly",
                    "localizedContent": localized_label("Prescription")
                }
            ]
        }))
        .unwrap();

        let visits = taxonomy.walk_terms().collect::<Vec<_>>();
        assert_eq!(
            visits
                .iter()
                .map(|visit| (
                    visit.term.key.as_str(),
                    visit.parent_key,
                    visit.sibling_order,
                    visit.depth,
                    visit.source_path.as_str(),
                ))
                .collect::<Vec<_>>(),
            vec![
                ("administrationRoute.epidural", None, 0, 0, "terms.0"),
                (
                    "unrelatedChildIdentity",
                    Some("administrationRoute.epidural"),
                    0,
                    1,
                    "terms.0.children.0",
                ),
                (
                    "namespace.grandchild",
                    Some("unrelatedChildIdentity"),
                    0,
                    2,
                    "terms.0.children.0.children.0",
                ),
                ("regulatory.brazil.prescriptionOnly", None, 1, 0, "terms.1",),
            ]
        );
    }
}
