//! Tests independent coverage sets and strict confirmed-receipt ingestion.

use super::*;
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    projection::{
        coverage::{
            EntityIdentity, ObligationClass, ProjectionObligation, ProjectionOperationId,
            ProjectionTarget, RowEvent, RowIdentity, SourceToken, SystemTable,
        },
        execution::{ConfirmedReceipt, ConfirmedReceiptBatch, ProjectionEvent},
    },
};
use std::collections::{BTreeMap, BTreeSet};

fn obligation(path: &str, row: &str) -> ProjectionObligation {
    ProjectionObligation {
        source: SourceToken::LocalizedValue {
            entity: EntityIdentity::new("product", "id"),
            field: path.to_string(),
            locale: KnowledgeLocale::EnUs,
            position: 0,
        },
        target: ProjectionTarget::TableRow {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: RowIdentity::new(row),
        },
        class: ObligationClass::LocalizedContent,
    }
}

fn operation(row: &str) -> ProjectionOperationId {
    ProjectionOperationId::SystemRow {
        table: SystemTable::ProductCatalogItems,
        row: RowIdentity::new(row),
    }
}

fn receipt(
    owner: ProjectionOperationId,
    obligations: BTreeSet<ProjectionObligation>,
) -> ConfirmedReceipt {
    let ProjectionOperationId::SystemRow { table, row } = &owner else {
        panic!("test owner must be a system row")
    };
    ConfirmedReceipt {
        operation: owner.clone(),
        obligations,
        event: ProjectionEvent::SqliteRow(RowEvent {
            database: DatabaseKind::System,
            table: *table,
            row: row.clone(),
            entity: Some(EntityIdentity::new("product", "id")),
        }),
        observed_count: 1,
    }
}

fn batch(receipts: Vec<ConfirmedReceipt>) -> ConfirmedReceiptBatch {
    ConfirmedReceiptBatch::from_test_receipts(receipts).unwrap()
}

fn ledger() -> (
    ProjectionLedger,
    ProjectionOperationId,
    ProjectionObligation,
) {
    let owner = operation("id");
    let item = obligation("localizedContent.name", "id");
    let expected = BTreeSet::from([item.clone()]);
    let owners = BTreeMap::from([(owner.clone(), expected.clone())]);
    (
        ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap(),
        owner,
        item,
    )
}

#[test]
fn expected_and_owned_must_match_before_execution() {
    let first = obligation("localizedContent.name", "id");
    let second = obligation("localizedContent.aliases", "id");
    let missing_owner = ProjectionLedger::new(
        KnowledgeLocale::EnUs,
        BTreeSet::from([first.clone(), second.clone()]),
        BTreeMap::from([(operation("id"), BTreeSet::from([first.clone()]))]),
    );
    assert!(missing_owner.unwrap_err().to_string().contains("1 missing"));

    let unexpected_owner = ProjectionLedger::new(
        KnowledgeLocale::EnUs,
        BTreeSet::from([first.clone()]),
        BTreeMap::from([(operation("id"), BTreeSet::from([first, second]))]),
    );
    assert!(unexpected_owner
        .unwrap_err()
        .to_string()
        .contains("1 unexpected"));
}

#[test]
fn one_obligation_cannot_have_two_owners() {
    let item = obligation("localizedContent.name", "id");
    let error = ProjectionLedger::new(
        KnowledgeLocale::EnUs,
        BTreeSet::from([item.clone()]),
        BTreeMap::from([
            (operation("id"), BTreeSet::from([item.clone()])),
            (operation("other"), BTreeSet::from([item])),
        ]),
    )
    .unwrap_err();
    assert!(error.to_string().contains("more than one operation"));
}

#[test]
fn only_exact_confirmed_receipts_are_observed() {
    let (mut ledger, owner, item) = ledger();
    let mut divergent = receipt(owner.clone(), BTreeSet::from([item.clone()]));
    divergent.event = ProjectionEvent::SqliteRow(RowEvent {
        database: DatabaseKind::System,
        table: SystemTable::ProductCatalogItems,
        row: RowIdentity::new("other"),
        entity: None,
    });
    assert!(ledger.observe(batch(vec![divergent])).is_err());
    assert!(ledger.clone().finish().is_err());

    ledger
        .observe(batch(vec![receipt(owner, BTreeSet::from([item]))]))
        .unwrap();
    assert_eq!(ledger.finish().unwrap().completed_count(), 1);
}

#[test]
fn receipt_rejects_unexpected_operation_locale_and_cardinality() {
    let (mut operation_ledger, _, item) = ledger();
    assert!(operation_ledger
        .observe(batch(vec![receipt(
            operation("other"),
            BTreeSet::from([item])
        )]))
        .unwrap_err()
        .to_string()
        .contains("unexpected operation"));

    let owner = operation("id");
    let mut foreign = obligation("localizedContent.name", "id");
    let SourceToken::LocalizedValue { locale, .. } = &mut foreign.source else {
        unreachable!()
    };
    *locale = KnowledgeLocale::PtBr;
    let expected = BTreeSet::from([foreign.clone()]);
    let owners = BTreeMap::from([(owner.clone(), expected.clone())]);
    let mut locale_ledger = ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap();
    assert!(locale_ledger
        .observe(batch(vec![receipt(owner, BTreeSet::from([foreign]))]))
        .unwrap_err()
        .to_string()
        .contains("another locale"));

    let (mut cardinality_ledger, owner, item) = ledger();
    let mut divergent = receipt(owner, BTreeSet::from([item]));
    divergent.observed_count = 2;
    assert!(cardinality_ledger
        .observe(batch(vec![divergent]))
        .unwrap_err()
        .to_string()
        .contains("divergent cardinality"));
}

#[test]
fn rejected_batch_publishes_no_partial_observation() {
    let first_owner = operation("first");
    let second_owner = operation("second");
    let first = obligation("localizedContent.name", "first");
    let second = obligation("localizedContent.aliases", "second");
    let expected = BTreeSet::from([first.clone(), second.clone()]);
    let owners = BTreeMap::from([
        (first_owner.clone(), BTreeSet::from([first.clone()])),
        (second_owner.clone(), BTreeSet::from([second.clone()])),
    ]);
    let mut ledger = ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap();
    let mut bad = receipt(second_owner.clone(), BTreeSet::from([second.clone()]));
    bad.observed_count = 0;
    assert!(ledger
        .observe(batch(vec![
            receipt(first_owner.clone(), BTreeSet::from([first.clone()])),
            bad,
        ]))
        .is_err());
    assert!(ledger.clone().finish().is_err());
    ledger
        .observe(batch(vec![
            receipt(first_owner, BTreeSet::from([first])),
            receipt(second_owner, BTreeSet::from([second])),
        ]))
        .unwrap();
    assert_eq!(ledger.finish().unwrap().completed_count(), 2);
}

#[test]
fn shared_destination_does_not_complete_an_omitted_obligation() {
    let owner = operation("id");
    let first = obligation("localizedContent.name", "id");
    let second = obligation("localizedContent.aliases", "id");
    let expected = BTreeSet::from([first.clone(), second.clone()]);
    let owners = BTreeMap::from([(owner.clone(), expected.clone())]);
    let mut ledger = ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap();
    assert!(ledger
        .observe(batch(vec![receipt(owner, BTreeSet::from([first]))]))
        .is_err());
    assert!(ledger.finish().is_err());
}

#[test]
fn evidence_digest_remains_order_independent_and_stable() {
    let first = obligation("localizedContent.name", "first");
    let second = obligation("localizedContent.aliases", "second");
    assert_eq!(
        evidence_digest(&BTreeSet::from([first.clone(), second.clone()])),
        evidence_digest(&BTreeSet::from([second, first]))
    );
}

#[test]
fn large_batch_uses_ordered_uniqueness_and_finishes_atomically() {
    let mut expected = BTreeSet::new();
    let mut owners = BTreeMap::new();
    let mut receipts = Vec::new();
    for index in 0..1_024 {
        let row = format!("row-{index:04}");
        let owner = operation(&row);
        let item = obligation(&format!("localizedContent.value{index}"), &row);
        expected.insert(item.clone());
        owners.insert(owner.clone(), BTreeSet::from([item.clone()]));
        receipts.push(receipt(owner, BTreeSet::from([item])));
    }
    let mut ledger = ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap();
    ledger.observe(batch(receipts)).unwrap();
    assert_eq!(ledger.finish().unwrap().completed_count(), 1_024);
}

#[test]
fn duplicate_inside_batch_and_against_accumulated_state_are_rejected() {
    let first_owner = operation("first");
    let second_owner = operation("second");
    let first = obligation("localizedContent.name", "first");
    let second = obligation("localizedContent.aliases", "second");
    let expected = BTreeSet::from([first.clone(), second.clone()]);
    let owners = BTreeMap::from([
        (first_owner.clone(), BTreeSet::from([first.clone()])),
        (second_owner.clone(), BTreeSet::from([second.clone()])),
    ]);
    let mut ledger = ProjectionLedger::new(KnowledgeLocale::EnUs, expected, owners).unwrap();
    let duplicate = receipt(first_owner.clone(), BTreeSet::from([first.clone()]));
    assert!(matches!(
        ledger.observe(batch(vec![duplicate.clone(), duplicate])),
        Err(crate::ContractError::Invariant { .. })
    ));
    ledger
        .observe(batch(vec![receipt(
            first_owner.clone(),
            BTreeSet::from([first.clone()]),
        )]))
        .unwrap();
    assert!(matches!(
        ledger.observe(batch(vec![receipt(first_owner, BTreeSet::from([first]))])),
        Err(crate::ContractError::Invariant { .. })
    ));
    ledger
        .observe(batch(vec![receipt(second_owner, BTreeSet::from([second]))]))
        .unwrap();
    assert_eq!(ledger.finish().unwrap().completed_count(), 2);
}
