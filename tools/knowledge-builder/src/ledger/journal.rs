//! Applies transactional evidence journals and exposes aggregate facts from a
//! fully completed locale ledger.

use super::{
    evidence_digest, EntityIdentity, ObligationClass, ProjectionObligation, ProjectionTarget,
    RowEvent, SourceToken,
};
use crate::source::KnowledgeLocale;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Default)]
pub(crate) struct ProjectionJournal {
    completed: Vec<ProjectionObligation>,
    rows: Vec<RowEvent>,
}

impl ProjectionJournal {
    pub(crate) fn complete_operation(
        &mut self,
        obligations: &BTreeSet<ProjectionObligation>,
        affected_rows: usize,
        event: RowEvent,
    ) -> Result<(), String> {
        if affected_rows != 1 {
            return Err(format!(
                "{} insert affected {affected_rows} rows instead of 1",
                event.table.as_str()
            ));
        }
        self.completed.extend(obligations.iter().cloned());
        self.rows.push(event);
        Ok(())
    }

    pub(crate) fn complete(&mut self, obligation: ProjectionObligation) {
        self.completed.push(obligation);
    }
}

#[derive(Clone, Debug)]
pub(crate) struct ProjectionLedger {
    locale: KnowledgeLocale,
    expected: BTreeSet<ProjectionObligation>,
    completed: BTreeSet<ProjectionObligation>,
    row_events: Vec<RowEvent>,
}

#[derive(Clone, Debug)]
pub(crate) struct CompletedLedger {
    pub locale: KnowledgeLocale,
    expected: BTreeSet<ProjectionObligation>,
    completed: BTreeSet<ProjectionObligation>,
    row_events: Vec<RowEvent>,
}

#[derive(Clone, Debug)]
pub(crate) struct SearchCandidate {
    pub entity: EntityIdentity,
    pub value: String,
    pub provenance: String,
    pub occurrence: usize,
    pub source: SourceToken,
}

impl ProjectionLedger {
    pub(crate) fn new(locale: KnowledgeLocale, expected: BTreeSet<ProjectionObligation>) -> Self {
        Self {
            locale,
            expected,
            completed: BTreeSet::new(),
            row_events: Vec::new(),
        }
    }

    pub(crate) fn commit(&mut self, journal: ProjectionJournal) -> Result<(), String> {
        let mut completed = self.completed.clone();
        for obligation in journal.completed {
            if !self.expected.contains(&obligation) {
                return Err(format!("unexpected projection obligation {obligation}"));
            }
            if obligation_locale(&obligation).is_some_and(|locale| locale != self.locale) {
                return Err(format!(
                    "projection obligation belongs to another locale: {obligation}"
                ));
            }
            if !completed.insert(obligation.clone()) {
                return Err(format!("duplicated projection obligation {obligation}"));
            }
        }
        let mut observed_rows = self.row_events.iter().cloned().collect::<BTreeSet<_>>();
        for event in &journal.rows {
            if !observed_rows.insert(event.clone()) {
                return Err(format!(
                    "duplicated row event {}:{}",
                    event.table.as_str(),
                    event.row
                ));
            }
        }
        self.completed = completed;
        self.row_events.extend(journal.rows);
        Ok(())
    }

    pub(crate) fn finish(self) -> Result<CompletedLedger, String> {
        let missing = self
            .expected
            .difference(&self.completed)
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        if !missing.is_empty() {
            return Err(format!(
                "projection ledger {} has {} uncompleted obligation(s): {}",
                self.locale,
                missing.len(),
                missing.join(", ")
            ));
        }
        Ok(CompletedLedger {
            locale: self.locale,
            expected: self.expected,
            completed: self.completed,
            row_events: self.row_events,
        })
    }
}

impl ProjectionLedger {
    pub(crate) fn journal(&self) -> ProjectionJournal {
        ProjectionJournal::default()
    }
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
        self.completed.len()
    }

    pub(crate) fn row_event_count(&self) -> usize {
        self.row_events.len()
    }

    pub(crate) fn evidence_digest(&self) -> String {
        evidence_digest(&self.expected)
    }

    pub(crate) fn entities_by_type(&self) -> BTreeMap<String, usize> {
        let mut counts = BTreeMap::new();
        for obligation in &self.completed {
            if let SourceToken::Entity(entity) = &obligation.source {
                *counts.entry(entity.entity_type.clone()).or_default() += 1;
            }
        }
        counts
    }

    pub(crate) fn relation_count(&self) -> usize {
        self.completed
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::Relation)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn localized_fragment_count(&self) -> usize {
        self.completed
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn rows_by_type(&self) -> BTreeMap<String, BTreeMap<String, usize>> {
        let mut rows = BTreeMap::new();
        for event in &self.row_events {
            let Some(entity) = &event.entity else {
                continue;
            };
            *rows
                .entry(entity.entity_type.clone())
                .or_insert_with(BTreeMap::new)
                .entry(event.table.as_str().to_string())
                .or_default() += 1;
        }
        rows
    }
}
