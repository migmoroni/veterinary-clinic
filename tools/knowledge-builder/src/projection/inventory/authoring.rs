//! Maps canonical authoring leaves to expected projection obligations.

use super::{
    model::{ExpectedInventory, OperationDisposition},
    EntityIdentity, ObligationClass, ProjectionTarget, RowIdentity, SourceToken, SystemColumn,
    SystemTable,
};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    source::{CanonicalEntity, LocalizedContent, StructuralMedia},
    validation::ValidatedEntity,
};

pub(super) fn common_authoring(
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    section_standard_key: Option<&str>,
    sections: &[crate::source::ResolvedSection],
) -> Result<(), crate::ContractError> {
    field(
        expected,
        entity,
        "schemaVersion",
        canonical_validation_target(entity, locale, "schema_version"),
        ObligationClass::Authoring,
    )?;
    let Some(standard_key) = section_standard_key else {
        return Ok(());
    };
    insert_obligation(
        expected,
        OperationDisposition {
            target: ProjectionTarget::CompiledDocument {
                entity: entity.clone(),
                locale,
            },
        },
        SourceToken::SectionStandardReference {
            entity: entity.clone(),
            standard_key: standard_key.to_string(),
        },
        ObligationClass::Authoring,
    )?;
    for section in sections {
        let crate::source::ResolvedSection {
            section_key,
            section_number,
        } = section;
        let target = OperationDisposition {
            target: ProjectionTarget::CompiledSection {
                entity: entity.clone(),
                locale,
                section_key: section_key.clone(),
            },
        };
        insert_obligation(
            expected,
            target.clone(),
            SourceToken::SectionStandardDefinition {
                standard_key: standard_key.to_string(),
                section_key: section_key.clone(),
                section_number: *section_number,
            },
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

pub(super) fn structural_media(
    expected: &mut ExpectedInventory,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
    media: Option<&StructuralMedia>,
) -> Result<(), crate::ContractError> {
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
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
) -> Result<(), crate::ContractError> {
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
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
    prefix: &str,
) -> Result<(), crate::ContractError> {
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
) -> Result<SystemColumn, crate::ContractError> {
    let column = if prefix.starts_with("terms.") {
        match field {
            "label" => SystemColumn::Label,
            "aliases" => SystemColumn::AliasesJson,
            _ => {
                return Err(
                    (format!("localized taxonomy field has no policy: {prefix}.{field}")).into(),
                )
            }
        }
    } else if prefix.starts_with("doses.") {
        match field {
            "label" => SystemColumn::Label,
            _ => {
                return Err(
                    (format!("localized dose field has no policy: {prefix}.{field}")).into(),
                )
            }
        }
    } else {
        match (entity.entity_type.as_str(), field) {
            ("product", "name")
            | ("manufacturer", "name")
            | ("active_ingredient", "name")
            | ("condition", "name")
            | ("life", "name")
            | ("geo_place", "name")
            | ("treatment_protocol", "name") => SystemColumn::Name,
            ("product", "aliases")
            | ("manufacturer", "aliases")
            | ("active_ingredient", "aliases")
            | ("condition", "aliases")
            | ("life", "aliases")
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
                return Err((format!(
                    "localized field has no projection policy: {}.{prefix}.{field}",
                    entity.entity_type
                ))
                .into());
            }
        }
    };
    Ok(column)
}

pub(super) fn field(
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    path: &str,
    target: OperationDisposition,
    class: ObligationClass,
) -> Result<(), crate::ContractError> {
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
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    path: &str,
    values: &[T],
    target: OperationDisposition,
) -> Result<(), crate::ContractError> {
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
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    path: &str,
    value: Option<&T>,
    target: OperationDisposition,
) -> Result<(), crate::ContractError> {
    if value.is_some() {
        field(expected, entity, path, target, ObligationClass::Authoring)?;
    }
    Ok(())
}

pub(super) fn relations<F>(
    expected: &mut ExpectedInventory,
    entity: &EntityIdentity,
    field_name: &str,
    values: &[String],
    mut target: F,
) -> Result<(), crate::ContractError>
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
    expected: &mut ExpectedInventory,
    disposition: OperationDisposition,
    source: SourceToken,
    class: ObligationClass,
) -> Result<(), crate::ContractError> {
    expected.insert(disposition, source, class)
}

pub(super) fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
}

pub(super) fn main_row_target(entity: &CanonicalEntity) -> OperationDisposition {
    let table = match entity {
        CanonicalEntity::Life(_) => SystemTable::LifeReferenceItems,
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
        target: ProjectionTarget::TableRow {
            database,
            table,
            row: RowIdentity::new(row),
        },
    }
}

pub(super) fn canonical_validation_target(
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    validation: &'static str,
) -> OperationDisposition {
    OperationDisposition {
        target: ProjectionTarget::CanonicalValidation {
            entity: entity.clone(),
            locale,
            validation,
        },
    }
}
