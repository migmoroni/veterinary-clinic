//! Exercises contract validation against deliberately divergent operation evidence.

use super::*;
use crate::{
    contracts::{locale::KnowledgeLocale, version::BUILD_RESULT_SCHEMA_VERSION},
    databases::DatabaseKind,
    projection::coverage::{
        CompilationOperationId, EntityIdentity, ObligationClass, ProjectionObligation,
        ProjectionTarget, RowEvent, RowIdentity, SourceToken, SystemColumn, SystemTable,
    },
};
use std::collections::{BTreeMap, BTreeSet};

fn minimal_plan_parts() -> (BTreeSet<ProjectionObligation>, ProjectionContract) {
    let fixture = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/valid-minimal");
    let source = crate::validate(fixture).unwrap();
    let context = crate::BuildContext {
        schema_version: 1,
        build_version: 1,
        release: None,
    };
    let expected =
        crate::projection::inventory::expected_obligations(&source, KnowledgeLocale::EnUs, false)
            .unwrap();
    let contract = ProjectionContract::build(&source, KnowledgeLocale::EnUs, &context).unwrap();
    (expected, contract)
}

fn assert_plan_rejects(expected: BTreeSet<ProjectionObligation>, contract: ProjectionContract) {
    assert!(matches!(
        LocaleProjectionPlan::new(expected, contract),
        Err(crate::ContractError::Invariant {
            operation: "expected and owned coverage",
            ..
        })
    ));
}

#[test]
fn independent_inventory_and_operations_reject_every_coverage_dimension() {
    let (expected, contract) = minimal_plan_parts();
    LocaleProjectionPlan::new(expected.clone(), contract.clone()).unwrap();

    let original = expected.iter().next().unwrap().clone();
    let mut wrong_target = expected.clone();
    wrong_target.remove(&original);
    let mut changed = original.clone();
    changed.target = ProjectionTarget::CasObject {
        locale: KnowledgeLocale::EnUs,
        content_hash: "wrong-target".to_string(),
    };
    wrong_target.insert(changed);
    assert_plan_rejects(wrong_target, contract.clone());

    let mut omitted_source = expected.clone();
    omitted_source.remove(&original);
    assert_plan_rejects(omitted_source, contract.clone());

    let mut additional_source = expected.clone();
    let mut changed = original.clone();
    changed.source = SourceToken::Field {
        entity: EntityIdentity::new("condition", "additional"),
        path: "additional".to_string(),
    };
    additional_source.insert(changed);
    assert_plan_rejects(additional_source, contract.clone());

    let mut wrong_class = expected.clone();
    wrong_class.remove(&original);
    let mut changed = original.clone();
    changed.class = ObligationClass::Cas;
    wrong_class.insert(changed);
    assert_plan_rejects(wrong_class, contract.clone());

    let mut incomplete_owner = contract.clone();
    incomplete_owner.compilation[0].obligations.pop_first();
    assert_plan_rejects(expected.clone(), incomplete_owner);

    let mut additional_operation = contract.clone();
    let mut changed = original.clone();
    changed.source = SourceToken::Field {
        entity: EntityIdentity::new("condition", "operation-extra"),
        path: "operationExtra".to_string(),
    };
    additional_operation.compilation[0]
        .obligations
        .insert(changed);
    assert_plan_rejects(expected.clone(), additional_operation);

    let search = expected
        .iter()
        .find(|item| matches!(item.target, ProjectionTarget::SearchTerm { .. }))
        .unwrap()
        .clone();
    let mut divergent_search = expected.clone();
    divergent_search.remove(&search);
    let mut changed = search;
    if let ProjectionTarget::SearchTerm { provenance, .. } = &mut changed.target {
        *provenance = "divergent".to_string();
    }
    divergent_search.insert(changed);
    assert_plan_rejects(divergent_search, contract.clone());

    let mut expected_without_operation = expected;
    let owned_only = contract.compilation[0]
        .obligations
        .iter()
        .next()
        .unwrap()
        .clone();
    expected_without_operation.remove(&owned_only);
    assert_plan_rejects(expected_without_operation, contract);
}

fn product_row() -> SystemRow {
    SystemRow::Product {
        id: "id".to_string(),
        name: "Name".to_string(),
        normalized_name: "name".to_string(),
        applicable_taxon_term_keys_json: "[]".to_string(),
        applicable_life_stages_json: "[]".to_string(),
        therapeutic_spectrum: None,
        aliases_json: "[]".to_string(),
        manufacturer_id: "manufacturer".to_string(),
        regions_json: "[]".to_string(),
        regulatory_identifiers_json: "{}".to_string(),
        commercial_line: None,
        presentation_dosage: None,
        target_species_warnings_json: "[]".to_string(),
        content_json: format!(
            r#"{{"schemaVersion":{},"sections":[]}}"#,
            crate::contracts::version::CONTENT_DOCUMENT_SCHEMA_VERSION
        ),
    }
}

fn product_operation(target: ProjectionTarget) -> SystemProjectionOperation {
    SystemProjectionOperation {
        row: product_row(),
        obligations: BTreeSet::from([ProjectionObligation {
            source: SourceToken::Field {
                entity: EntityIdentity::new("product", "id"),
                path: "id".to_string(),
            },
            target,
            class: ObligationClass::Authoring,
        }]),
        event: RowEvent {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: RowIdentity::new("id"),
            entity: Some(EntityIdentity::new("product", "id")),
        },
    }
}

#[test]
fn system_operation_rejects_incompatible_column_and_identity() {
    let valid = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: RowIdentity::new("id"),
        column: SystemColumn::Id,
    });
    validate_system_operation(&valid, KnowledgeLocale::EnUs).unwrap();

    let invalid_column = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: RowIdentity::new("id"),
        column: SystemColumn::Domain,
    });
    assert!(validate_system_operation(&invalid_column, KnowledgeLocale::EnUs).is_err());

    let wrong_row = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: RowIdentity::new("other"),
        column: SystemColumn::Id,
    });
    assert!(validate_system_operation(&wrong_row, KnowledgeLocale::EnUs).is_err());

    let wrong_table = product_operation(ProjectionTarget::TableColumn {
        database: DatabaseKind::System,
        table: SystemTable::ConditionCatalogItems,
        row: RowIdentity::new("id"),
        column: SystemColumn::Id,
    });
    assert!(validate_system_operation(&wrong_table, KnowledgeLocale::EnUs).is_err());

    let mut wrong_event = valid;
    wrong_event.event.row = RowIdentity::new("other");
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
            source: SourceToken::SearchValue {
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
            row: RowIdentity::new("product/id/0"),
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
            source: SourceToken::Section {
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
            builder_version: env!("CARGO_PKG_VERSION").to_string(),
            build_result_schema_version: BUILD_RESULT_SCHEMA_VERSION,
            source_digest: vec![0; 32],
            locale: "en-US".to_string(),
        },
        obligations: BTreeSet::from([ProjectionObligation {
            source: SourceToken::BuildMetadata {
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
            row: RowIdentity::new("1"),
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
            source: SourceToken::MediaAsset {
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
            row: RowIdentity::new("condition/id/cover"),
            entity: None,
        },
    };
    assert!(validate_system_media_operation(&media, KnowledgeLocale::EnUs).is_err());

    let cas = CasProjectionOperation {
        content_hash: "a".repeat(64),
        bytes: vec![1],
        obligations: BTreeSet::from([ProjectionObligation {
            source: SourceToken::CasObject {
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
        source: SourceToken::Document {
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
        .to_string()
        .contains("duplicate projection operation identity"));
}
