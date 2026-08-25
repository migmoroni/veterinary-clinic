//! Validates operation ownership and semantic compatibility across the complete contract.

use super::*;

impl ProjectionContract {
    pub(crate) fn validate(&self) -> Result<(), String> {
        let mut operation_ids = BTreeSet::new();
        let mut ownership = BTreeSet::new();
        for operation in &self.compilation {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_compilation_operation(operation, self.locale)?;
        }
        for operation in &self.metadata {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_metadata_operation(operation, self.locale)?;
        }
        for operation in &self.system {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_system_operation(operation, self.locale)?;
        }
        for operation in &self.system_media {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_system_media_operation(operation, self.locale)?;
        }
        for operation in &self.cas {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_cas_operation(operation, self.locale)?;
        }
        if ownership != self.expected_obligations {
            return Err("operation obligations do not equal expected obligations".to_string());
        }
        validate_universal_taxonomies(&self.system)?;
        let localized = self
            .expected_obligations
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len();
        if localized != self.source_facts.localized_fragments {
            return Err(format!(
                "localized fragment count differs between source and contract for {}: source {}, contract {localized}",
                self.locale, self.source_facts.localized_fragments
            ));
        }
        Ok(())
    }
}

fn validate_universal_taxonomies(operations: &[SystemProjectionOperation]) -> Result<(), String> {
    let allowed = BTreeSet::from([
        ("breed", "size"),
        ("manufacturer", "type"),
        ("manufacturer", "classification"),
        ("active_ingredient", "type"),
        ("active_ingredient", "classification"),
        ("condition", "type"),
        ("condition", "classification"),
        ("product", "type"),
        ("product", "classification"),
        ("product", "target"),
        ("product", "vaccine_profile"),
        ("product", "life_stage"),
        ("product", "therapeutic_scope"),
    ]);
    let mut registries = BTreeMap::<&str, (&str, &str)>::new();
    let mut terms = BTreeSet::<(&str, &str)>::new();
    let mut entities = BTreeSet::<(&str, &str)>::new();
    for operation in operations {
        match &operation.row {
            SystemRow::TaxonomyRegistry {
                id,
                domain,
                purpose,
            } => {
                if !allowed.contains(&(domain.as_str(), purpose.as_str())) {
                    return Err(format!(
                        "unsupported taxonomy domain and purpose {domain}:{purpose}"
                    ));
                }
                if registries
                    .insert(id, (domain.as_str(), purpose.as_str()))
                    .is_some()
                {
                    return Err(format!("duplicate taxonomy registry id {id}"));
                }
            }
            SystemRow::TaxonomyTerm {
                taxonomy_id,
                term_key,
                ..
            } if !terms.insert((taxonomy_id, term_key)) => {
                return Err(format!("duplicate taxonomy term {taxonomy_id}/{term_key}"));
            }
            SystemRow::TaxonomyTerm { .. } => {}
            SystemRow::Breed { id, .. } => {
                entities.insert(("breed", id));
            }
            SystemRow::Manufacturer { id, .. } => {
                entities.insert(("manufacturer", id));
            }
            SystemRow::ActiveIngredient { id, .. } => {
                entities.insert(("active_ingredient", id));
            }
            SystemRow::Condition { id, .. } => {
                entities.insert(("condition", id));
            }
            SystemRow::Product { id, .. } => {
                entities.insert(("product", id));
            }
            _ => {}
        }
    }

    let mut positions = BTreeSet::new();
    let mut counts = BTreeMap::<(&str, &str, &str), usize>::new();
    for operation in operations {
        let SystemRow::EntityTaxonomy {
            entity_type,
            entity_id,
            taxonomy_id,
            term_key,
            sort_order,
        } = &operation.row
        else {
            continue;
        };
        if !entities.contains(&(entity_type.as_str(), entity_id.as_str())) {
            return Err(format!(
                "taxonomy relation has no projected {entity_type} entity {entity_id}"
            ));
        }
        let (domain, purpose) = registries
            .get(taxonomy_id.as_str())
            .copied()
            .ok_or_else(|| {
                format!("taxonomy relation references unknown taxonomy {taxonomy_id}")
            })?;
        if domain != entity_type {
            return Err(format!(
                "taxonomy {taxonomy_id} domain {domain} is incompatible with {entity_type}"
            ));
        }
        if !allowed.contains(&(entity_type.as_str(), purpose)) {
            return Err(format!(
                "taxonomy purpose {purpose} is incompatible with {entity_type}"
            ));
        }
        if !terms.contains(&(taxonomy_id.as_str(), term_key.as_str())) {
            return Err(format!(
                "taxonomy relation references foreign or missing term {taxonomy_id}/{term_key}"
            ));
        }
        if !positions.insert((
            entity_type.as_str(),
            entity_id.as_str(),
            taxonomy_id.as_str(),
            *sort_order,
        )) {
            return Err(format!(
                "taxonomy relation repeats sort order for {entity_type}/{entity_id}/{taxonomy_id}"
            ));
        }
        *counts.entry((entity_type, entity_id, purpose)).or_default() += 1;
    }

    for (entity_type, entity_id) in entities {
        let required_purpose = if entity_type == "breed" {
            "size"
        } else {
            "type"
        };
        let count = counts
            .get(&(entity_type, entity_id, required_purpose))
            .copied()
            .unwrap_or_default();
        if count != 1 {
            return Err(format!(
                "{entity_type}/{entity_id} requires exactly one {required_purpose} taxonomy relation"
            ));
        }
    }
    Ok(())
}

pub(super) fn validate_operation_registration(
    id: ProjectionOperationId,
    obligations: &BTreeSet<ProjectionObligation>,
    operation_ids: &mut BTreeSet<ProjectionOperationId>,
    ownership: &mut BTreeSet<ProjectionObligation>,
) -> Result<(), String> {
    if !operation_ids.insert(id.clone()) {
        return Err(format!("duplicate projection operation identity: {id:?}"));
    }
    if obligations.is_empty() {
        return Err(format!(
            "projection operation has no declared owner batch: {id:?}"
        ));
    }
    for obligation in obligations {
        if !ownership.insert(obligation.clone()) {
            return Err(format!(
                "projection obligation belongs to more than one operation: {obligation}"
            ));
        }
    }
    Ok(())
}

pub(super) fn validate_compilation_operation(
    operation: &CompilationOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    for obligation in &operation.obligations {
        let compatible = match (&operation.identity, &obligation.target) {
            (
                CompilationOperationId::CanonicalValidation { entity, validation },
                ProjectionTarget::CanonicalValidation {
                    entity: target_entity,
                    locale: target_locale,
                    validation: target_validation,
                },
            ) => {
                entity == target_entity
                    && locale == *target_locale
                    && validation == target_validation
            }
            (
                CompilationOperationId::Document { entity },
                ProjectionTarget::CompiledDocument {
                    entity: target_entity,
                    locale: target_locale,
                },
            ) => entity == target_entity && locale == *target_locale,
            (
                CompilationOperationId::Section {
                    entity,
                    section_key,
                },
                ProjectionTarget::CompiledSection {
                    entity: target_entity,
                    locale: target_locale,
                    section_key: target_section,
                },
            ) => {
                entity == target_entity && locale == *target_locale && section_key == target_section
            }
            _ => false,
        };
        if !compatible {
            return Err(format!(
                "compilation operation {:?} cannot materialize target {:?}",
                operation.identity, obligation.target
            ));
        }
    }
    Ok(())
}

pub(super) fn validate_metadata_operation(
    operation: &MetadataOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let release = operation.row.is_release();
    let expected_table = if release {
        SystemTable::KnowledgeReleaseMetadata
    } else {
        SystemTable::KnowledgeBuildMetadata
    };
    if operation.event.database != operation.database
        || operation.event.table != expected_table
        || operation.event.row != "1"
    {
        return Err("metadata event differs from its operation identity".to_string());
    }
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::BuildMetadata {
                database,
                locale: target_locale,
                release: target_release,
            } if *database == operation.database && *target_locale == locale && *target_release == release
        ) {
            return Err("metadata obligation differs from its operation identity".to_string());
        }
    }
    Ok(())
}

pub(super) fn validate_system_operation(
    operation: &SystemProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let table = operation.row.table();
    let row = operation.row.logical_row_id();
    if operation.event.database != DatabaseKind::System
        || operation.event.table != table
        || operation.event.row != row
    {
        return Err(format!(
            "system row event differs from payload identity: {}:{}",
            table.as_str(),
            row
        ));
    }
    let columns = operation.row.materialized_columns();
    for obligation in &operation.obligations {
        let compatible = match &obligation.target {
            ProjectionTarget::TableRow {
                database,
                table: target_table,
                row: target_row,
            } => *database == DatabaseKind::System && *target_table == table && *target_row == row,
            ProjectionTarget::TableColumn {
                database,
                table: target_table,
                row: target_row,
                column,
            } => {
                *database == DatabaseKind::System
                    && *target_table == table
                    && *target_row == row
                    && columns.contains(column)
            }
            ProjectionTarget::SearchTerm {
                entity,
                locale: target_locale,
                provenance,
                occurrence,
            } => match &operation.row {
                SystemRow::SearchTerm {
                    entity_type,
                    entity_id,
                    value,
                    normalized_value,
                    provenance: row_provenance,
                    sort_order,
                } => {
                    let _ = (value, normalized_value);
                    entity.entity_type == *entity_type
                        && entity.id == *entity_id
                        && *target_locale == locale
                        && provenance == row_provenance
                        && *occurrence == *sort_order
                }
                SystemRow::TaxonomyRegistry {
                    id,
                    domain,
                    purpose,
                } => {
                    let _ = (id, domain, purpose);
                    false
                }
                SystemRow::TaxonomyTerm {
                    taxonomy_id,
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order,
                } => {
                    let _ = (
                        taxonomy_id,
                        term_key,
                        parent_term_key,
                        label,
                        normalized_label,
                        aliases_json,
                        sort_order,
                    );
                    false
                }
                SystemRow::GeoPlace {
                    id,
                    place_type,
                    parent_place_id,
                    country_codes_json,
                    latitude,
                    longitude,
                    name,
                    normalized_name,
                    aliases_json,
                } => {
                    let _ = (
                        id,
                        place_type,
                        parent_place_id,
                        country_codes_json,
                        latitude,
                        longitude,
                        name,
                        normalized_name,
                        aliases_json,
                    );
                    false
                }
                SystemRow::Breed {
                    id,
                    species_json,
                    name,
                    normalized_name,
                    aliases_json,
                    average_weight_kg_json,
                    average_height_cm_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        species_json,
                        name,
                        normalized_name,
                        aliases_json,
                        average_weight_kg_json,
                        average_height_cm_json,
                        content_json,
                    );
                    false
                }
                SystemRow::BreedOrigin {
                    breed_id,
                    place_id,
                    sort_order,
                } => {
                    let _ = (breed_id, place_id, sort_order);
                    false
                }
                SystemRow::Manufacturer {
                    id,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    website,
                    content_json,
                } => {
                    let _ = (
                        id,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        website,
                        content_json,
                    );
                    false
                }
                SystemRow::ActiveIngredient {
                    id,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    nomenclature_json,
                    atc_vet_code,
                    atc_vet_system,
                    denominations_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        nomenclature_json,
                        atc_vet_code,
                        atc_vet_system,
                        denominations_json,
                        content_json,
                    );
                    false
                }
                SystemRow::Condition {
                    id,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        content_json,
                    );
                    false
                }
                SystemRow::Product {
                    id,
                    name,
                    normalized_name,
                    species_json,
                    aliases_json,
                    manufacturer_id,
                    regions_json,
                    regulatory_identifiers_json,
                    commercial_line,
                    presentation_dosage,
                    target_species_warnings_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        name,
                        normalized_name,
                        species_json,
                        aliases_json,
                        manufacturer_id,
                        regions_json,
                        regulatory_identifiers_json,
                        commercial_line,
                        presentation_dosage,
                        target_species_warnings_json,
                        content_json,
                    );
                    false
                }
                SystemRow::EntityTaxonomy {
                    entity_type,
                    entity_id,
                    taxonomy_id,
                    term_key,
                    sort_order,
                } => {
                    let _ = (entity_type, entity_id, taxonomy_id, term_key, sort_order);
                    false
                }
                SystemRow::ProductActiveIngredient {
                    product_id,
                    active_ingredient_id,
                    sort_order,
                } => {
                    let _ = (product_id, active_ingredient_id, sort_order);
                    false
                }
                SystemRow::TreatmentProtocol {
                    id,
                    kind,
                    name,
                    normalized_name,
                    species_json,
                    observation,
                } => {
                    let _ = (id, kind, name, normalized_name, species_json, observation);
                    false
                }
                SystemRow::TreatmentProtocolItem {
                    protocol_id,
                    product_id,
                    sort_order,
                } => {
                    let _ = (protocol_id, product_id, sort_order);
                    false
                }
                SystemRow::TreatmentProtocolDose {
                    protocol_id,
                    dose_id,
                    label,
                    validity_value,
                    validity_unit,
                    sort_order,
                } => {
                    let _ = (
                        protocol_id,
                        dose_id,
                        label,
                        validity_value,
                        validity_unit,
                        sort_order,
                    );
                    false
                }
                SystemRow::MediaReference {
                    entity_type,
                    entity_id,
                    role,
                    media_key,
                    sort_order,
                } => {
                    let _ = (entity_type, entity_id, role, media_key, sort_order);
                    false
                }
            },
            ProjectionTarget::CanonicalValidation {
                entity,
                locale,
                validation,
            } => {
                let _ = (entity, locale, validation);
                false
            }
            ProjectionTarget::CompiledDocument { entity, locale } => {
                let _ = (entity, locale);
                false
            }
            ProjectionTarget::CompiledSection {
                entity,
                locale,
                section_key,
            } => {
                let _ = (entity, locale, section_key);
                false
            }
            ProjectionTarget::SystemMediaAsset { locale, media_key } => {
                let _ = (locale, media_key);
                false
            }
            ProjectionTarget::CasObject {
                locale,
                content_hash,
            } => {
                let _ = (locale, content_hash);
                false
            }
            ProjectionTarget::BuildMetadata {
                database,
                locale,
                release,
            } => {
                let _ = (database, locale, release);
                false
            }
        };
        if !compatible {
            return Err(format!(
                "system operation {}:{} cannot materialize target {:?}",
                table.as_str(),
                row,
                obligation.target
            ));
        }
    }
    Ok(())
}

pub(super) fn validate_system_media_operation(
    operation: &SystemMediaProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    if operation.event.database != DatabaseKind::SystemMedia
        || operation.event.table != SystemTable::MediaAssets
        || operation.event.row != operation.row.media_key
    {
        return Err("system_media event differs from payload identity".to_string());
    }
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::SystemMediaAsset { locale: target_locale, media_key }
                if *target_locale == locale && media_key == &operation.row.media_key
        ) {
            return Err("system_media obligation differs from payload identity".to_string());
        }
    }
    Ok(())
}

pub(super) fn validate_cas_operation(
    operation: &CasProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::CasObject { locale: target_locale, content_hash }
                if *target_locale == locale && content_hash == &operation.content_hash
        ) {
            return Err("CAS obligation differs from operation identity".to_string());
        }
    }
    Ok(())
}
