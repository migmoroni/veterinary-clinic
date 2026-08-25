//! Provides reusable declarations for authored fields, localized fragments,
//! relations, compiled documents, and structural media references.

use super::{
    ownership::{ObligationOwnership, OperationDisposition},
    CompilationOperationId, EntityIdentity, ObligationClass, ProjectionOperationId,
    ProjectionTarget, SourceToken, SystemColumn, SystemTable,
};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    source::{CanonicalEntity, LocalizedContent, StructuralMedia},
    validation::{ValidatedEntity, ValidatedSource},
};

pub(super) fn common_authoring(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    sections: &[crate::source::SectionDeclaration],
    content_path: Option<&str>,
    main: &OperationDisposition,
) -> Result<(), String> {
    field(
        expected,
        entity,
        "schemaVersion",
        canonical_validation_target(entity, locale, "schema_version"),
        ObligationClass::Authoring,
    )?;
    if sections.is_empty() {
        field(
            expected,
            entity,
            "sections",
            main.column(SystemColumn::ContentJson),
            ObligationClass::Authoring,
        )?;
    }
    for section in sections {
        let crate::source::SectionDeclaration {
            section_key,
            section_number,
        } = section;
        let target = OperationDisposition {
            owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                entity: entity.clone(),
                section_key: section_key.clone(),
            }),
            target: ProjectionTarget::CompiledSection {
                entity: entity.clone(),
                locale,
                section_key: section_key.clone(),
            },
        };
        field(
            expected,
            entity,
            &format!("sections.{section_number}.sectionKey"),
            target.clone(),
            ObligationClass::Authoring,
        )?;
        field(
            expected,
            entity,
            &format!("sections.{section_number}.sectionNumber"),
            target,
            ObligationClass::Authoring,
        )?;
    }
    if content_path.is_some() {
        field(
            expected,
            entity,
            "contentPath",
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Document {
                    entity: entity.clone(),
                }),
                target: ProjectionTarget::CompiledDocument {
                    entity: entity.clone(),
                    locale,
                },
            },
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

pub(super) fn structural_media(
    expected: &mut ObligationOwnership,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
    media: Option<&StructuralMedia>,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    let Some(media) = media else {
        return Ok(());
    };
    let StructuralMedia { cover, gallery } = media;
    let _ = (cover, gallery);
    for reference in &entry.structural_media {
        let row = format!(
            "{}/{}/{}/{}",
            entity.entity_type, entity.id, reference.role, reference.sort_order
        );
        insert_obligation(
            expected,
            table_row(
                DatabaseKind::System,
                SystemTable::EntityMediaReferences,
                row,
            ),
            SourceToken::StructuralMediaReference {
                entity: entity.clone(),
                locale,
                role: reference.role.to_string(),
                sort_order: reference.sort_order,
                media_key: reference.media_key.clone(),
            },
            ObligationClass::Media,
        )?;
    }
    Ok(())
}

pub(super) fn localized(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
) -> Result<(), String> {
    localized_with_prefix(
        expected,
        entity,
        content,
        locale,
        target,
        "localizedContent",
    )
}

pub(super) fn localized_with_prefix(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
    prefix: &str,
) -> Result<(), String> {
    for (field_name, value) in content {
        let values = value.values(locale);
        let localized_path = format!("{prefix}.{field_name}");
        let target = target.column(localized_column(entity, prefix, field_name)?);
        if values.is_empty() {
            field(
                expected,
                entity,
                &localized_path,
                target.clone(),
                ObligationClass::Authoring,
            )?;
        }
        for position in 0..values.len() {
            insert_obligation(
                expected,
                target.clone(),
                SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: localized_path.clone(),
                    locale,
                    position,
                },
                ObligationClass::LocalizedContent,
            )?;
        }
    }
    Ok(())
}

pub(super) fn localized_column(
    entity: &EntityIdentity,
    prefix: &str,
    field: &str,
) -> Result<SystemColumn, String> {
    let column = if prefix.starts_with("terms.") {
        match field {
            "label" => SystemColumn::Label,
            "aliases" => SystemColumn::AliasesJson,
            _ => {
                return Err(format!(
                    "localized taxonomy field has no policy: {prefix}.{field}"
                ))
            }
        }
    } else if prefix.starts_with("doses.") {
        match field {
            "label" => SystemColumn::Label,
            _ => {
                return Err(format!(
                    "localized dose field has no policy: {prefix}.{field}"
                ))
            }
        }
    } else {
        match (entity.entity_type.as_str(), field) {
            ("product", "name")
            | ("manufacturer", "name")
            | ("active_ingredient", "name")
            | ("condition", "name")
            | ("breed", "name")
            | ("geo_place", "name")
            | ("treatment_protocol", "name") => SystemColumn::Name,
            ("product", "aliases")
            | ("manufacturer", "aliases")
            | ("active_ingredient", "aliases")
            | ("condition", "aliases")
            | ("breed", "aliases")
            | ("geo_place", "aliases") => SystemColumn::AliasesJson,
            ("product", "commercialLine") => SystemColumn::CommercialLine,
            ("product", "presentationDosage") => SystemColumn::PresentationDosage,
            ("product", "targetSpeciesWarnings") => SystemColumn::TargetSpeciesWarningsJson,
            ("active_ingredient", "atcVetSystem") => SystemColumn::AtcVetSystem,
            ("active_ingredient", denomination) if denomination.starts_with("denomination_") => {
                SystemColumn::DenominationsJson
            }
            ("treatment_protocol", "observation") => SystemColumn::Observation,
            _ => {
                return Err(format!(
                    "localized field has no projection policy: {}.{prefix}.{field}",
                    entity.entity_type
                ));
            }
        }
    };
    Ok(column)
}

pub(super) fn field(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    target: OperationDisposition,
    class: ObligationClass,
) -> Result<(), String> {
    insert_obligation(
        expected,
        target,
        SourceToken::Field {
            entity: entity.clone(),
            path: path.to_string(),
        },
        class,
    )
}

pub(super) fn fields<T>(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    values: &[T],
    target: OperationDisposition,
) -> Result<(), String> {
    if values.is_empty() {
        return field(expected, entity, path, target, ObligationClass::Authoring);
    }
    for index in 0..values.len() {
        field(
            expected,
            entity,
            &format!("{path}.{index}"),
            target.clone(),
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

pub(super) fn optional_fields<T>(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    value: Option<&T>,
    target: OperationDisposition,
) -> Result<(), String> {
    if value.is_some() {
        field(expected, entity, path, target, ObligationClass::Authoring)?;
    }
    Ok(())
}

pub(super) fn relations<F>(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    field_name: &str,
    values: &[String],
    mut target: F,
) -> Result<(), String>
where
    F: FnMut(usize, &str) -> OperationDisposition,
{
    if values.is_empty() {
        return Ok(());
    }
    for (position, related) in values.iter().enumerate() {
        insert_obligation(
            expected,
            target(position, related),
            SourceToken::Relation {
                entity: entity.clone(),
                field: field_name.to_string(),
                position,
                related: related.clone(),
            },
            ObligationClass::Relation,
        )?;
    }
    Ok(())
}

pub(super) fn insert_obligation(
    expected: &mut ObligationOwnership,
    disposition: OperationDisposition,
    source: SourceToken,
    class: ObligationClass,
) -> Result<(), String> {
    expected.insert(disposition, source, class)
}

pub(super) fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
}

pub(super) fn main_row_target(entity: &CanonicalEntity) -> OperationDisposition {
    let table = match entity {
        CanonicalEntity::Breed(_) => SystemTable::BreedReferenceItems,
        CanonicalEntity::Product(_) => SystemTable::ProductCatalogItems,
        CanonicalEntity::Manufacturer(_) => SystemTable::ManufacturerCatalogItems,
        CanonicalEntity::ActiveIngredient(_) => SystemTable::ActiveIngredientCatalogItems,
        CanonicalEntity::Condition(_) => SystemTable::ConditionCatalogItems,
        CanonicalEntity::GeoPlace(_) => SystemTable::GeoPlaces,
        CanonicalEntity::Taxonomy(_) => SystemTable::TaxonomyRegistry,
        CanonicalEntity::TreatmentProtocol(_) => SystemTable::TreatmentProtocols,
    };
    table_row(DatabaseKind::System, table, entity.id().to_string())
}

pub(super) fn table_row(
    database: DatabaseKind,
    table: SystemTable,
    row: String,
) -> OperationDisposition {
    OperationDisposition {
        owner: ProjectionOperationId::SystemRow {
            table,
            row: row.clone(),
        },
        target: ProjectionTarget::TableRow {
            database,
            table,
            row,
        },
    }
}

pub(super) fn operation_disposition(
    owner: ProjectionOperationId,
    target: ProjectionTarget,
) -> OperationDisposition {
    OperationDisposition { owner, target }
}

pub(super) fn canonical_validation_target(
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    validation: &'static str,
) -> OperationDisposition {
    OperationDisposition {
        owner: ProjectionOperationId::Compilation(CompilationOperationId::CanonicalValidation {
            entity: entity.clone(),
            validation,
        }),
        target: ProjectionTarget::CanonicalValidation {
            entity: entity.clone(),
            locale,
            validation,
        },
    }
}

pub(super) fn taxonomy_row(
    entity: &EntityIdentity,
    taxonomy_id: &str,
    term: &str,
) -> OperationDisposition {
    table_row(
        DatabaseKind::System,
        SystemTable::EntityTaxonomyTerms,
        format!("{}/{}/{taxonomy_id}/{term}", entity.entity_type, entity.id),
    )
}

pub(super) fn taxonomy_id<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a str, String> {
    source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .map(|taxonomy| taxonomy.id.as_str())
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))
}
