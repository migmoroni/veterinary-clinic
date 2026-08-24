//! Unit tests for transactional completion, explicit ownership, and the closed
//! table-column vocabulary.

use super::journal::ProjectionJournal;
use super::*;
use crate::{databases::DatabaseKind, source::KnowledgeLocale};
use std::collections::BTreeSet;

fn obligation(target: ProjectionTarget, path: &str) -> ProjectionObligation {
    ProjectionObligation {
        source: SourceToken::LocalizedValue {
            entity: EntityIdentity::new("product", "id"),
            field: path.to_string(),
            locale: KnowledgeLocale::EnUs,
            position: 0,
        },
        target,
        class: ObligationClass::LocalizedContent,
    }
}

fn row_target() -> ProjectionTarget {
    table_row(
        DatabaseKind::System,
        SystemTable::ProductCatalogItems,
        "id".to_string(),
    )
    .target
}

fn event() -> RowEvent {
    RowEvent {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: "id".to_string(),
        entity: Some(EntityIdentity::new("product", "id")),
    }
}

fn ledger() -> (ProjectionLedger, ProjectionObligation) {
    let target = table_row(
        DatabaseKind::System,
        SystemTable::ProductCatalogItems,
        "id".to_string(),
    )
    .target;
    let obligation = obligation(target, "localizedContent.name");
    (
        ProjectionLedger::new(KnowledgeLocale::EnUs, BTreeSet::from([obligation.clone()])),
        obligation,
    )
}

#[test]
fn journal_detects_missing_unexpected_and_duplicate_obligations() {
    assert!(ledger().0.finish().is_err());
    let (mut complete, completed_obligation) = ledger();
    let mut journal = complete.journal();
    journal.complete(completed_obligation.clone());
    complete.commit(journal).unwrap();
    assert_eq!(complete.finish().unwrap().completed_count(), 1);

    let (mut duplicate, expected_obligation) = ledger();
    let mut first = duplicate.journal();
    first.complete(expected_obligation.clone());
    duplicate.commit(first).unwrap();
    let mut second = duplicate.journal();
    second.complete(expected_obligation);
    assert!(duplicate.commit(second).is_err());

    let (mut unexpected, _) = ledger();
    let mut journal = unexpected.journal();
    journal.complete(obligation(
        ProjectionTarget::CasObject {
            locale: KnowledgeLocale::EnUs,
            content_hash: "0".repeat(64),
        },
        "localizedContent.aliases",
    ));
    assert!(unexpected.commit(journal).is_err());
}

#[test]
fn rejected_journal_publishes_no_partial_evidence() {
    let (mut ledger, obligation) = ledger();
    let mut rejected = ledger.journal();
    rejected.complete(obligation.clone());
    rejected.complete(obligation.clone());
    assert!(ledger.commit(rejected).is_err());

    let mut valid = ledger.journal();
    valid.complete(obligation);
    ledger.commit(valid).unwrap();
    assert_eq!(ledger.finish().unwrap().completed_count(), 1);
}

#[test]
fn rollback_discards_operation_obligations_and_rows() {
    let (mut ledger, obligation) = ledger();
    let mut rolled_back = ledger.journal();
    rolled_back
        .complete_operation(&BTreeSet::from([obligation.clone()]), 1, event())
        .unwrap();
    drop(rolled_back);
    assert!(ledger.clone().finish().is_err());
    let mut committed = ledger.journal();
    committed
        .complete_operation(&BTreeSet::from([obligation]), 1, event())
        .unwrap();
    ledger.commit(committed).unwrap();
    assert_eq!(ledger.finish().unwrap().row_event_count(), 1);
}

#[test]
fn row_event_rejects_divergent_insert_count() {
    let (_, obligation) = ledger();
    let mut journal = ProjectionJournal::default();
    assert!(journal
        .complete_operation(&BTreeSet::from([obligation]), 0, event(),)
        .is_err());
}

#[test]
fn shared_destination_does_not_complete_an_omitted_obligation() {
    let target = row_target();
    let first = obligation(target.clone(), "localizedContent.name");
    let second = obligation(target, "localizedContent.aliases");
    let mut ledger = ProjectionLedger::new(
        KnowledgeLocale::EnUs,
        BTreeSet::from([first.clone(), second]),
    );
    let mut journal = ledger.journal();
    journal.complete(first);
    ledger.commit(journal).unwrap();
    assert!(ledger.finish().is_err());
}

#[test]
fn operation_can_publish_only_the_explicit_batch() {
    let target = row_target();
    let first = obligation(target.clone(), "localizedContent.name");
    let second = obligation(target, "localizedContent.aliases");
    let mut ledger = ProjectionLedger::new(
        KnowledgeLocale::EnUs,
        BTreeSet::from([first.clone(), second]),
    );
    let mut journal = ledger.journal();
    journal
        .complete_operation(&BTreeSet::from([first]), 1, event())
        .unwrap();
    ledger.commit(journal).unwrap();
    assert!(ledger.finish().is_err());
}

#[test]
fn ownership_is_selected_only_by_operation_identity() {
    let target = row_target();
    let first_owner = ProjectionOperationId::SystemRow {
        table: SystemTable::ProductCatalogItems,
        row: "first".to_string(),
    };
    let second_owner = ProjectionOperationId::SystemRow {
        table: SystemTable::ProductCatalogItems,
        row: "second".to_string(),
    };
    let mut ownership = ObligationOwnership::default();
    ownership
        .insert(
            operation_disposition(first_owner.clone(), target.clone()),
            SourceToken::Field {
                entity: EntityIdentity::new("product", "id"),
                path: "localizedContent.name".to_string(),
            },
            ObligationClass::Authoring,
        )
        .unwrap();
    ownership
        .insert(
            operation_disposition(second_owner.clone(), target),
            SourceToken::Field {
                entity: EntityIdentity::new("product", "id"),
                path: "localizedContent.aliases".to_string(),
            },
            ObligationClass::Authoring,
        )
        .unwrap();

    let first = ownership.claim(&first_owner).unwrap();
    assert_eq!(first.len(), 1);
    assert!(first.iter().all(|item| matches!(
        &item.source,
        SourceToken::Field { path, .. } if path == "localizedContent.name"
    )));
    assert!(ownership
        .finish()
        .unwrap_err()
        .contains("1 projection owner"));

    let mut unknown = ObligationOwnership::default();
    assert!(unknown.claim(&second_owner).is_err());
}

#[test]
fn one_obligation_cannot_be_declared_for_two_owners() {
    let target = row_target();
    let source = SourceToken::Field {
        entity: EntityIdentity::new("product", "id"),
        path: "id".to_string(),
    };
    let mut ownership = ObligationOwnership::default();
    ownership
        .insert(
            operation_disposition(
                ProjectionOperationId::SystemRow {
                    table: SystemTable::ProductCatalogItems,
                    row: "first".to_string(),
                },
                target.clone(),
            ),
            source.clone(),
            ObligationClass::Authoring,
        )
        .unwrap();
    let error = ownership
        .insert(
            operation_disposition(
                ProjectionOperationId::SystemRow {
                    table: SystemTable::ProductCatalogItems,
                    row: "second".to_string(),
                },
                target,
            ),
            source,
            ObligationClass::Authoring,
        )
        .unwrap_err();
    assert!(error.contains("declared more than once"));
}

#[test]
fn system_column_names_are_closed_and_unique() {
    let names = SystemColumn::ALL
        .into_iter()
        .map(SystemColumn::as_str)
        .collect::<BTreeSet<_>>();
    assert_eq!(names.len(), SystemColumn::ALL.len());
}
