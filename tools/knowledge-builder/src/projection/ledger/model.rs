//! Validates confirmed receipt batches against independent expected and owned coverage.

use super::evidence_digest;
use crate::{
    contracts::locale::KnowledgeLocale,
    projection::{
        coverage::{
            ObligationClass, ProjectionObligation, ProjectionOperationId, ProjectionTarget,
            RowEvent, SourceToken,
        },
        execution::{ConfirmedReceipt, ConfirmedReceiptBatch, ProjectionEvent},
    },
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub(crate) struct ProjectionLedger {
    locale: KnowledgeLocale,
    expected: BTreeSet<ProjectionObligation>,
    owned: BTreeSet<ProjectionObligation>,
    owners: BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>,
    observed: BTreeSet<ProjectionObligation>,
    observed_operations: BTreeSet<ProjectionOperationId>,
    events: Vec<ProjectionEvent>,
}

#[derive(Clone, Debug)]
pub(crate) struct CompletedLedger {
    pub locale: KnowledgeLocale,
    expected: BTreeSet<ProjectionObligation>,
    owned: BTreeSet<ProjectionObligation>,
    observed: BTreeSet<ProjectionObligation>,
    events: Vec<ProjectionEvent>,
}

impl ProjectionLedger {
    pub(crate) fn new(
        locale: KnowledgeLocale,
        expected: BTreeSet<ProjectionObligation>,
        owners: BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>,
    ) -> Result<Self, String> {
        let mut owned = BTreeSet::new();
        for (owner, obligations) in &owners {
            if obligations.is_empty() {
                return Err(format!(
                    "projection operation owns no obligations: {owner:?}"
                ));
            }
            for obligation in obligations {
                if !owned.insert(obligation.clone()) {
                    return Err(format!(
                        "projection obligation belongs to more than one operation: {obligation}"
                    ));
                }
            }
        }
        if expected != owned {
            return Err(coverage_difference(&expected, &owned, "owned"));
        }
        Ok(Self {
            locale,
            expected,
            owned,
            owners,
            observed: BTreeSet::new(),
            observed_operations: BTreeSet::new(),
            events: Vec::new(),
        })
    }

    pub(crate) fn observe(&mut self, batch: ConfirmedReceiptBatch) -> Result<(), String> {
        let mut observed = self.observed.clone();
        let mut operations = self.observed_operations.clone();
        let mut events = self.events.clone();
        for receipt in batch.iter() {
            self.validate_receipt(receipt)?;
            if !operations.insert(receipt.operation.clone()) {
                return Err(format!(
                    "duplicated confirmed operation receipt: {:?}",
                    receipt.operation
                ));
            }
            for obligation in &receipt.obligations {
                if !observed.insert(obligation.clone()) {
                    return Err(format!("duplicated projection obligation {obligation}"));
                }
            }
            if !events.insert_unique(receipt.event.clone()) {
                return Err(format!("duplicated projection event: {:?}", receipt.event));
            }
        }
        self.observed = observed;
        self.observed_operations = operations;
        self.events = events;
        Ok(())
    }

    fn validate_receipt(&self, receipt: &ConfirmedReceipt) -> Result<(), String> {
        if receipt.observed_count != 1 {
            return Err(format!(
                "confirmed receipt {:?} has divergent cardinality {}",
                receipt.operation, receipt.observed_count
            ));
        }
        let owned = self.owners.get(&receipt.operation).ok_or_else(|| {
            format!(
                "confirmed receipt has unexpected operation: {:?}",
                receipt.operation
            )
        })?;
        if owned != &receipt.obligations {
            return Err(format!(
                "confirmed receipt obligations diverge for {:?}",
                receipt.operation
            ));
        }
        for obligation in &receipt.obligations {
            if obligation_locale(obligation).is_some_and(|locale| locale != self.locale) {
                return Err(format!(
                    "projection obligation belongs to another locale: {obligation}"
                ));
            }
        }
        validate_event(&receipt.operation, &receipt.event)
    }

    pub(crate) fn finish(self) -> Result<CompletedLedger, String> {
        if self.expected != self.observed {
            return Err(coverage_difference(
                &self.expected,
                &self.observed,
                "observed",
            ));
        }
        Ok(CompletedLedger {
            locale: self.locale,
            expected: self.expected,
            owned: self.owned,
            observed: self.observed,
            events: self.events,
        })
    }
}

trait UniqueEventVec {
    fn insert_unique(&mut self, event: ProjectionEvent) -> bool;
}

impl UniqueEventVec for Vec<ProjectionEvent> {
    fn insert_unique(&mut self, event: ProjectionEvent) -> bool {
        if self.contains(&event) {
            false
        } else {
            self.push(event);
            true
        }
    }
}

fn validate_event(
    operation: &ProjectionOperationId,
    event: &ProjectionEvent,
) -> Result<(), String> {
    let compatible = match (operation, event) {
        (ProjectionOperationId::Compilation(operation), ProjectionEvent::Compilation(event)) => {
            operation == event
        }
        (
            ProjectionOperationId::Metadata { database, release },
            ProjectionEvent::SqliteRow(event),
        ) => {
            event.database == *database
                && event.row == crate::projection::coverage::RowIdentity::new("1")
                && event.table
                    == if *release {
                        crate::projection::coverage::SystemTable::KnowledgeReleaseMetadata
                    } else {
                        crate::projection::coverage::SystemTable::KnowledgeBuildMetadata
                    }
        }
        (ProjectionOperationId::SystemRow { table, row }, ProjectionEvent::SqliteRow(event)) => {
            event.database == crate::databases::DatabaseKind::System
                && event.table == *table
                && event.row == *row
        }
        (
            ProjectionOperationId::SystemMediaAsset { media_key },
            ProjectionEvent::SqliteRow(event),
        ) => {
            event.database == crate::databases::DatabaseKind::SystemMedia
                && event.table == crate::projection::coverage::SystemTable::MediaAssets
                && event.row.to_string() == *media_key
        }
        (
            ProjectionOperationId::CasObject { content_hash },
            ProjectionEvent::CasObject {
                content_hash: observed,
            },
        ) => content_hash == observed,
        _ => false,
    };
    if compatible {
        Ok(())
    } else {
        Err(format!(
            "confirmed receipt event diverges from operation {operation:?}: {event:?}"
        ))
    }
}

fn coverage_difference(
    expected: &BTreeSet<ProjectionObligation>,
    actual: &BTreeSet<ProjectionObligation>,
    label: &str,
) -> String {
    let missing = expected
        .difference(actual)
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    let unexpected = actual
        .difference(expected)
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    format!(
        "projection coverage differs from {label}: {} missing, {} unexpected{}{}",
        missing.len(),
        unexpected.len(),
        if missing.is_empty() {
            ""
        } else {
            "; missing: "
        },
        missing.join(", ")
    )
}

fn obligation_locale(obligation: &ProjectionObligation) -> Option<KnowledgeLocale> {
    match &obligation.source {
        SourceToken::LocalizedValue { locale, .. }
        | SourceToken::Document { locale, .. }
        | SourceToken::Section { locale, .. }
        | SourceToken::StructuralMediaReference { locale, .. }
        | SourceToken::MarkdownMediaReference { locale, .. }
        | SourceToken::SearchValue { locale, .. }
        | SourceToken::MediaAsset { locale, .. }
        | SourceToken::CasObject { locale, .. }
        | SourceToken::BuildMetadata { locale, .. } => Some(*locale),
        SourceToken::Entity(_) | SourceToken::Field { .. } | SourceToken::Relation { .. } => {
            projection_target_locale(&obligation.target)
        }
    }
}

fn projection_target_locale(target: &ProjectionTarget) -> Option<KnowledgeLocale> {
    match target {
        ProjectionTarget::CanonicalValidation { locale, .. }
        | ProjectionTarget::SearchTerm { locale, .. }
        | ProjectionTarget::CompiledDocument { locale, .. }
        | ProjectionTarget::CompiledSection { locale, .. }
        | ProjectionTarget::SystemMediaAsset { locale, .. }
        | ProjectionTarget::CasObject { locale, .. }
        | ProjectionTarget::BuildMetadata { locale, .. } => Some(*locale),
        ProjectionTarget::TableRow { .. } | ProjectionTarget::TableColumn { .. } => None,
    }
}

impl CompletedLedger {
    pub(crate) fn expected_count(&self) -> usize {
        self.expected.len()
    }

    pub(crate) fn completed_count(&self) -> usize {
        debug_assert_eq!(self.expected, self.owned);
        self.observed.len()
    }

    pub(crate) fn row_event_count(&self) -> usize {
        self.events
            .iter()
            .filter(|event| matches!(event, ProjectionEvent::SqliteRow(_)))
            .count()
    }

    pub(crate) fn evidence_digest(&self) -> String {
        evidence_digest(&self.expected)
    }

    pub(crate) fn entities_by_type(&self) -> BTreeMap<String, usize> {
        let mut counts = BTreeMap::new();
        for obligation in &self.observed {
            if let SourceToken::Entity(entity) = &obligation.source {
                *counts.entry(entity.entity_type.clone()).or_default() += 1;
            }
        }
        counts
    }

    pub(crate) fn relation_count(&self) -> usize {
        self.observed
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::Relation)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn localized_fragment_count(&self) -> usize {
        self.observed
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn rows_by_type(&self) -> BTreeMap<String, BTreeMap<String, usize>> {
        let mut rows = BTreeMap::new();
        for event in &self.events {
            let ProjectionEvent::SqliteRow(RowEvent {
                table,
                entity: Some(entity),
                ..
            }) = event
            else {
                continue;
            };
            *rows
                .entry(entity.entity_type.clone())
                .or_insert_with(BTreeMap::new)
                .entry(table.as_str().to_string())
                .or_default() += 1;
        }
        rows
    }
}
