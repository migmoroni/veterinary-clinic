//! Resolves product and protocol applicability and rejects redundant ancestry targets.

use super::{sorted, taxonomy::LifeIndex};
use crate::validation::{CanonicalEntity, Diagnostic, SourceEntry};

pub(super) fn validate_applicability(
    entries: &[SourceEntry],
    life: &LifeIndex<'_>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for entry in entries {
        let values = match &entry.entity {
            CanonicalEntity::Product(value) => Some(&value.applicable_taxon_term_keys),
            CanonicalEntity::TreatmentProtocol(value) => Some(&value.applicable_taxon_term_keys),
            _ => None,
        };
        let Some(values) = values else {
            continue;
        };
        if !sorted(values) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "applicableTaxonTermKeys",
                "applicableTaxonTermKeys must be strictly sorted",
            ));
        }
        for key in values {
            if !life.terms.contains_key(key.as_str()) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "applicableTaxonTermKeys",
                    format!("unresolved life:type term {key}"),
                ));
            }
        }
        for (index, left) in values.iter().enumerate() {
            for right in &values[index + 1..] {
                if life.is_ancestor(left, right) || life.is_ancestor(right, left) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "applicableTaxonTermKeys",
                        format!("redundant ancestor and descendant targets {left} and {right}"),
                    ));
                }
            }
        }
    }
}
