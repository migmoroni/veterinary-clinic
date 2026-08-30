//! Validates the closed ten-level taxonomy and resolves every explicit ancestry edge.

use super::*;

pub(super) type LifeIndex<'a> = BTreeMap<&'a str, (&'a SourceEntry, &'a LifeEntity)>;

pub(super) fn validate_life_taxonomy<'a>(
    entries: &'a [SourceEntry],
    diagnostics: &mut Vec<Diagnostic>,
) -> LifeIndex<'a> {
    let life = entries
        .iter()
        .filter_map(|entry| match &entry.entity {
            CanonicalEntity::Life(value) => Some((value.id.as_str(), (entry, &**value))),
            _ => None,
        })
        .collect::<LifeIndex<'_>>();

    for (entry, entity) in life.values() {
        let positions = entity.taxonomy.positions();
        let level = entity.taxonomy.level();
        if positions[..=level]
            .iter()
            .any(|position| position.is_none())
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "taxonomy",
                "taxonomy positions must form one continuous prefix",
            ));
            continue;
        }
        if positions[level] != Some(entity.id.as_str()) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "taxonomy",
                "id must equal the last non-null taxonomy position",
            ));
        }
        for (position, referenced_id) in positions[..=level].iter().enumerate() {
            let Some(referenced_id) = referenced_id else {
                continue;
            };
            let Some((_, referenced)) = life.get(referenced_id) else {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    format!("taxonomy.{}", level_name(position)),
                    format!("unresolved life id {referenced_id}"),
                ));
                continue;
            };
            if referenced.taxonomy.level() != position {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    format!("taxonomy.{}", level_name(position)),
                    format!("life id {referenced_id} belongs to a different taxonomy level"),
                ));
                continue;
            }
            let referenced_positions = referenced.taxonomy.positions();
            if referenced_positions[..=position] != positions[..=position] {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    format!("taxonomy.{}", level_name(position)),
                    format!("life id {referenced_id} declares a divergent ancestry"),
                ));
            }
        }
    }
    life
}

pub(super) const fn level_name(level: usize) -> &'static str {
    [
        "domain", "kingdom", "phylum", "class", "order", "family", "genus", "species", "breed",
        "variety",
    ][level]
}
