//! Enforces locale-specific alias ownership across entities, taxonomies, and product relations.

use super::*;

pub(super) fn validate_alias_ownership(
    entries: &[SourceEntry],
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for locale in LOCALES {
        let mut owners = BTreeMap::<String, String>::new();
        for entry in entries {
            let Some(content) = entry.entity.localized_content() else {
                continue;
            };
            let Some(aliases) = content.get("aliases").and_then(|value| value.list(locale)) else {
                continue;
            };
            for alias in aliases {
                let normalized = normalize_search_text(alias);
                let identity = format!("{}:{}", entry.entity.entity_type(), entry.entity.id());
                if let Some(previous) = owners.insert(normalized.clone(), identity.clone()) {
                    if previous != identity {
                        diagnostics.push(Diagnostic::entity(
                            entry,
                            "localizedContent.aliases",
                            format!("alias {alias} is also owned by {previous}"),
                        ));
                    }
                }
            }
        }
        let taxonomy_values = taxonomies
            .values()
            .flat_map(|taxonomy| taxonomy.terms.iter())
            .flat_map(|term| {
                term.localized_content
                    .values()
                    .flat_map(move |value| value.values(locale))
            })
            .map(normalize_search_text)
            .collect::<BTreeSet<_>>();
        for (alias, owner) in owners {
            if taxonomy_values.contains(&alias) {
                if let Some(entry) = entries.iter().find(|entry| {
                    format!("{}:{}", entry.entity.entity_type(), entry.entity.id()) == owner
                }) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent.aliases",
                        "entity-owned alias duplicates a taxonomy value",
                    ));
                }
            }
        }
        let by_identity = entries
            .iter()
            .map(|entry| ((entry.entity.entity_type(), entry.entity.id()), entry))
            .collect::<BTreeMap<_, _>>();
        for entry in entries {
            let CanonicalEntity::Product(product) = &entry.entity else {
                continue;
            };
            let aliases = localized_list_values(&product.localized_content, "aliases", locale);
            let related = product
                .active_ingredient_ids
                .iter()
                .filter_map(|id| by_identity.get(&("active_ingredient", id.as_str())))
                .flat_map(|ingredient| {
                    let content = ingredient
                        .entity
                        .localized_content()
                        .expect("active ingredients are localized");
                    let mut values = localized_list_values(content, "aliases", locale);
                    if let Some(name) = content.get("name").and_then(|value| value.text(locale)) {
                        values.push(name.to_string());
                    }
                    values
                })
                .map(|value| normalize_search_text(&value))
                .collect::<BTreeSet<_>>();
            for alias in aliases {
                if related.contains(&normalize_search_text(&alias)) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent.aliases",
                        format!("product alias duplicates a related active ingredient in {locale}: {alias}"),
                    ));
                }
            }
        }
    }
}

fn localized_list_values(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Vec<String> {
    content
        .get(field)
        .and_then(|value| value.list(locale))
        .map(<[String]>::to_vec)
        .unwrap_or_default()
}
