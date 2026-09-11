//! Validates localized field schemas, values, and declared editorial sections.

use super::{
    is_simple_text, CanonicalEntity, Diagnostic, LocalizedContent, LocalizedValue, SourceEntry,
    LOCALES,
};
use std::collections::BTreeSet;

pub(super) fn validate_localized_schema(entry: &SourceEntry, diagnostics: &mut Vec<Diagnostic>) {
    let Some(content) = entry.entity.localized_content() else {
        return;
    };
    match &entry.entity {
        CanonicalEntity::Product(_) => validate_localized_content(
            entry,
            content,
            &["name", "aliases"],
            &[
                "commercialLine",
                "presentationDosage",
                "targetSpeciesWarnings",
            ],
            &["name", "commercialLine", "presentationDosage"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::Manufacturer(_)
        | CanonicalEntity::Condition(_)
        | CanonicalEntity::GeoPlace(_) => validate_localized_content(
            entry,
            content,
            &["name", "aliases"],
            &[],
            &["name"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::Life(_) => validate_localized_content(
            entry,
            content,
            &["aliases"],
            &[],
            &[],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::ActiveIngredient(value) => {
            let dynamic = value
                .nomenclature
                .denomination_standards
                .iter()
                .map(|standard| format!("denomination_{standard}"))
                .collect::<Vec<_>>();
            let mut optional = vec!["atcVetSystem"];
            optional.extend(dynamic.iter().map(String::as_str));
            let mut text = vec!["name", "atcVetSystem"];
            text.extend(dynamic.iter().map(String::as_str));
            validate_localized_content(
                entry,
                content,
                &["name", "aliases"],
                &optional,
                &text,
                "localizedContent",
                diagnostics,
            );
        }
        CanonicalEntity::TreatmentProtocol(_) => validate_localized_content(
            entry,
            content,
            &["name"],
            &["observation"],
            &["name", "observation"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::Taxonomy(_) => {}
    }
}

pub(super) fn validate_localized_content(
    entry: &SourceEntry,
    content: &LocalizedContent,
    required: &[&str],
    optional: &[&str],
    text_fields: &[&str],
    prefix: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for field in required {
        if !content.contains_key(*field) {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                "required localized field is missing",
            ));
        }
    }
    for (field, value) in content {
        if !required.contains(&field.as_str()) && !optional.contains(&field.as_str()) {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                "unsupported localized field",
            ));
            continue;
        }
        let expects_text = text_fields.contains(&field.as_str());
        if (expects_text && !matches!(value, LocalizedValue::Text(_)))
            || (!expects_text && !matches!(value, LocalizedValue::List(_)))
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                format!(
                    "expected {}, found {}",
                    if expects_text { "text" } else { "list" },
                    value.kind()
                ),
            ));
            continue;
        }
        for locale in LOCALES {
            let values = value.values(locale);
            let mut unique = BTreeSet::new();
            for item in &values {
                if !is_simple_text(item) {
                    diagnostics.push(Diagnostic {
                        path: entry.manifest_path.display().to_string(),
                        entity: Some(format!(
                            "{}:{}",
                            entry.entity.entity_type(),
                            entry.entity.id()
                        )),
                        field: Some(format!("{prefix}.{field}")),
                        locale: Some(locale.to_string()),
                        section: None,
                        message: "value must be non-empty trimmed simple text".to_string(),
                    });
                }
                if !unique.insert(*item) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        format!("{prefix}.{field}"),
                        format!("duplicate localized item for {locale}: {item}"),
                    ));
                }
            }
        }
    }
}
