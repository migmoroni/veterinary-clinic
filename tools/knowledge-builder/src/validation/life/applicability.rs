//! Resolves product and protocol applicability and rejects redundant ancestry targets.

use super::{taxonomy::LifeIndex, *};

pub(super) fn validate_applicability(
    entries: &[SourceEntry],
    life: &LifeIndex<'_>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for entry in entries {
        let values = match &entry.entity {
            CanonicalEntity::Product(value) => Some(&value.applicable_taxon_ids),
            CanonicalEntity::TreatmentProtocol(value) => Some(&value.applicable_taxon_ids),
            _ => None,
        };
        let Some(values) = values else {
            continue;
        };
        if !sorted(values) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "applicableTaxonIds",
                "applicableTaxonIds must be strictly sorted",
            ));
        }
        for id in values {
            if !life.contains_key(id.as_str()) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "applicableTaxonIds",
                    format!("unresolved life id {id}"),
                ));
            }
        }
        for (index, left) in values.iter().enumerate() {
            for right in &values[index + 1..] {
                let redundant = [left, right].iter().any(|ancestor| {
                    let descendant = if *ancestor == left { right } else { left };
                    life.get(descendant.as_str()).is_some_and(|(_, entity)| {
                        entity
                            .taxonomy
                            .positions()
                            .contains(&Some(ancestor.as_str()))
                    })
                });
                if redundant {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "applicableTaxonIds",
                        format!("redundant ancestor and descendant targets {left} and {right}"),
                    ));
                }
            }
        }
    }
}
