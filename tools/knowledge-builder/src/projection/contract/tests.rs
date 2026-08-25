//! Exercises contract validation against deliberately divergent operation evidence.

use super::*;

fn product_row() -> SystemRow {
    SystemRow::Product {
        id: "id".to_string(),
        name: "Name".to_string(),
        normalized_name: "name".to_string(),
        species_json: "[]".to_string(),
        aliases_json: "[]".to_string(),
        manufacturer_id: "manufacturer".to_string(),
        regions_json: "[]".to_string(),
        regulatory_identifiers_json: "{}".to_string(),
        commercial_line: None,
        presentation_dosage: None,
        target_species_warnings_json: "[]".to_string(),
        content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
    }
}

fn product_operation(target: ProjectionTarget) -> SystemProjectionOperation {
    SystemProjectionOperation {
        row: product_row(),
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::Field {
                entity: EntityIdentity::new("product", "id"),
                path: "id".to_string(),
            },
            target,
            class: ObligationClass::Authoring,
        }]),
        event: RowEvent {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: "id".to_string(),
            entity: Some(EntityIdentity::new("product", "id")),
        },
    }
}

#[test]
fn system_operation_rejects_incompatible_column_and_identity() {
    let valid = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: "id".to_string(),
        column: SystemColumn::Id,
    });
    validate_system_operation(&valid, KnowledgeLocale::EnUs).unwrap();

    let invalid_column = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: "id".to_string(),
        column: SystemColumn::Domain,
    });
    assert!(validate_system_operation(&invalid_column, KnowledgeLocale::EnUs).is_err());

    let wrong_row = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: "other".to_string(),
        column: SystemColumn::Id,
    });
    assert!(validate_system_operation(&wrong_row, KnowledgeLocale::EnUs).is_err());

    let wrong_table = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ConditionCatalogItems,
        row: "id".to_string(),
        column: SystemColumn::Id,
    });
    assert!(validate_system_operation(&wrong_table, KnowledgeLocale::EnUs).is_err());

    let mut wrong_event = valid;
    wrong_event.event.row = "other".to_string();
    assert!(validate_system_operation(&wrong_event, KnowledgeLocale::EnUs).is_err());
}

#[test]
fn search_operation_rejects_a_divergent_search_target() {
    let operation = SystemProjectionOperation {
        row: SystemRow::SearchTerm {
            entity_type: "product".to_string(),
            entity_id: "id".to_string(),
            value: "Name".to_string(),
            normalized_value: "name".to_string(),
            provenance: "entity.name".to_string(),
            sort_order: 0,
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::SearchValue {
                entity: EntityIdentity::new("product", "id"),
                locale: KnowledgeLocale::EnUs,
                provenance: "entity.name".to_string(),
                occurrence: 0,
            },
            target: ProjectionTarget::SearchTerm {
                entity: EntityIdentity::new("product", "id"),
                locale: KnowledgeLocale::EnUs,
                provenance: "different".to_string(),
                occurrence: 0,
            },
            class: ObligationClass::Authoring,
        }]),
        event: RowEvent {
            database: DatabaseKind::System,
            table: SystemTable::EntitySearchTerms,
            row: "product/id/0".to_string(),
            entity: Some(EntityIdentity::new("product", "id")),
        },
    };
    assert!(validate_system_operation(&operation, KnowledgeLocale::EnUs).is_err());
}

#[test]
fn non_system_operations_reject_divergent_targets() {
    let entity = EntityIdentity::new("condition", "id");
    let compilation = CompilationOperation {
        identity: CompilationOperationId::Section {
            entity: entity.clone(),
            section_key: "about".to_string(),
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::Section {
                entity: entity.clone(),
                locale: KnowledgeLocale::EnUs,
                section_key: "about".to_string(),
            },
            target: ProjectionTarget::CompiledSection {
                entity: entity.clone(),
                locale: KnowledgeLocale::EnUs,
                section_key: "different".to_string(),
            },
            class: ObligationClass::LocalizedContent,
        }]),
    };
    assert!(validate_compilation_operation(&compilation, KnowledgeLocale::EnUs).is_err());

    let metadata = MetadataOperation {
        database: DatabaseKind::System,
        row: MetadataRow::Build {
            build_version: 1,
            builder_version: "0.3.0".to_string(),
            build_result_schema_version: 1,
            source_digest: vec![0; 32],
            locale: "en-US".to_string(),
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::BuildMetadata {
                database: DatabaseKind::System,
                locale: KnowledgeLocale::EnUs,
                release: false,
            },
            target: ProjectionTarget::BuildMetadata {
                database: DatabaseKind::SystemMedia,
                locale: KnowledgeLocale::EnUs,
                release: false,
            },
            class: ObligationClass::Metadata,
        }]),
        event: RowEvent {
            database: DatabaseKind::System,
            table: SystemTable::KnowledgeBuildMetadata,
            row: "1".to_string(),
            entity: None,
        },
    };
    assert!(validate_metadata_operation(&metadata, KnowledgeLocale::EnUs).is_err());

    let media = SystemMediaProjectionOperation {
        row: SystemMediaRow {
            media_key: "condition/id/cover".to_string(),
            content_hash: vec![0; 32],
            thumbnail: vec![1],
            thumbnail_mime_type: "image/jpeg".to_string(),
            thumbnail_width: 1,
            thumbnail_height: 1,
            mime_type: "image/png".to_string(),
            size_bytes: 1,
            width: 1,
            height: 1,
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::MediaAsset {
                locale: KnowledgeLocale::EnUs,
                media_key: "condition/id/cover".to_string(),
            },
            target: ProjectionTarget::SystemMediaAsset {
                locale: KnowledgeLocale::EnUs,
                media_key: "different".to_string(),
            },
            class: ObligationClass::Media,
        }]),
        event: RowEvent {
            database: DatabaseKind::SystemMedia,
            table: SystemTable::MediaAssets,
            row: "condition/id/cover".to_string(),
            entity: None,
        },
    };
    assert!(validate_system_media_operation(&media, KnowledgeLocale::EnUs).is_err());

    let cas = CasProjectionOperation {
        content_hash: "a".repeat(64),
        bytes: vec![1],
        obligations: BTreeSet::from([ProjectionObligation {
            source: crate::ledger::SourceToken::CasObject {
                locale: KnowledgeLocale::EnUs,
                content_hash: "a".repeat(64),
            },
            target: ProjectionTarget::CasObject {
                locale: KnowledgeLocale::EnUs,
                content_hash: "b".repeat(64),
            },
            class: ObligationClass::Cas,
        }]),
    };
    assert!(validate_cas_operation(&cas, KnowledgeLocale::EnUs).is_err());
}

#[test]
fn duplicate_operation_identity_is_rejected() {
    let obligation = ProjectionObligation {
        source: crate::ledger::SourceToken::Document {
            entity: EntityIdentity::new("condition", "id"),
            locale: KnowledgeLocale::EnUs,
        },
        target: ProjectionTarget::CompiledDocument {
            entity: EntityIdentity::new("condition", "id"),
            locale: KnowledgeLocale::EnUs,
        },
        class: ObligationClass::Authoring,
    };
    let obligations = BTreeSet::from([obligation.clone()]);
    let operation = CompilationOperation {
        identity: CompilationOperationId::Document {
            entity: EntityIdentity::new("condition", "id"),
        },
        obligations: obligations.clone(),
    };
    let duplicated_owner = CompilationOperation {
        identity: CompilationOperationId::Document {
            entity: EntityIdentity::new("condition", "id"),
        },
        obligations: obligations.clone(),
    };
    let contract = ProjectionContract {
        locale: KnowledgeLocale::EnUs,
        compilation: vec![operation, duplicated_owner],
        metadata: vec![],
        system: vec![],
        system_media: vec![],
        cas: vec![],
        expected_obligations: obligations,
        source_facts: ProjectionSourceFacts {
            entities_by_type: BTreeMap::new(),
            relation_count: 0,
            localized_fragments: 0,
            source_files: 0,
        },
    };
    assert!(contract
        .validate()
        .unwrap_err()
        .contains("duplicate projection operation identity"));
}
