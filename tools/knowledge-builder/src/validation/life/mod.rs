//! Coordinates semantic validation for canonical life entities and their consumers.

mod applicability;
mod classifications;
mod taxonomy;

use super::*;

pub(super) fn validate_life_contracts(
    entries: &[SourceEntry],
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let life = taxonomy::validate_life_taxonomy(entries, diagnostics);
    classifications::validate_life_classifications(&life, taxonomies, diagnostics);
    applicability::validate_applicability(entries, &life, diagnostics);
}

fn sorted(values: &[String]) -> bool {
    values.windows(2).all(|pair| pair[0] < pair[1])
}
