//! Loads and resolves the single canonical editorial section-standard registry.

use super::{Diagnostic, SourceEntry};
use crate::{
    contracts::{
        source_layout::{SECTION_STANDARDS_FILENAME, STANDARDS_DIRECTORY_NAME},
        version::SECTION_STANDARDS_SCHEMA_VERSION,
    },
    source::{
        deserialize_section_standards, ResolvedSection, SectionStandard, SectionStandardsDocument,
    },
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
};

pub(crate) fn canonical_path(source_root: &Path) -> PathBuf {
    source_root
        .join(STANDARDS_DIRECTORY_NAME)
        .join(SECTION_STANDARDS_FILENAME)
}

pub(crate) fn load_section_standards(
    source_root: &Path,
    files: &[PathBuf],
    diagnostics: &mut Vec<Diagnostic>,
) -> Option<(SectionStandardsDocument, BTreeMap<String, SectionStandard>)> {
    let path = canonical_path(source_root);
    if !files.contains(&path) {
        diagnostics.push(Diagnostic::source(
            &path,
            "the canonical section standards registry is required",
        ));
        return None;
    }
    let document = match fs::read(&path)
        .map_err(|error| format!("cannot read section standards registry: {error}"))
        .and_then(|bytes| deserialize_section_standards(&path, &bytes))
    {
        Ok(document) => document,
        Err(error) => {
            diagnostics.push(Diagnostic::source(&path, error));
            return None;
        }
    };
    let keys = document
        .standards
        .iter()
        .map(|standard| standard.key.as_str())
        .collect::<Vec<_>>();
    if document.schema_version != SECTION_STANDARDS_SCHEMA_VERSION {
        diagnostics.push(Diagnostic::source(
            &path,
            format!("schemaVersion must be {SECTION_STANDARDS_SCHEMA_VERSION}"),
        ));
    }
    if !keys.windows(2).all(|pair| pair[0] < pair[1]) {
        diagnostics.push(Diagnostic::source(
            &path,
            "standards must be strictly ordered lexicographically by key",
        ));
    }
    let mut index = BTreeMap::new();
    for standard in &document.standards {
        if index
            .insert(standard.key.clone(), standard.clone())
            .is_some()
        {
            diagnostics.push(Diagnostic::source(
                &path,
                format!("duplicate section standard key {}", standard.key),
            ));
        }
    }
    Some((document, index))
}

pub(crate) fn resolve_sections(
    entry: &SourceEntry,
    standards: &BTreeMap<String, SectionStandard>,
    diagnostics: &mut Vec<Diagnostic>,
) -> Vec<ResolvedSection> {
    let Some(key) = entry.entity.section_standard_key() else {
        return Vec::new();
    };
    let Some(standard) = standards.get(key) else {
        diagnostics.push(Diagnostic::entity(
            entry,
            "sectionStandardKey",
            format!("unknown section standard {key}"),
        ));
        return Vec::new();
    };
    if standard.entity_type != entry.entity.entity_type() {
        diagnostics.push(Diagnostic::entity(
            entry,
            "sectionStandardKey",
            format!(
                "section standard {key} belongs to entityType {}, not {}",
                standard.entity_type,
                entry.entity.entity_type()
            ),
        ));
        return Vec::new();
    }
    standard
        .section_keys
        .iter()
        .enumerate()
        .map(|(index, section_key)| ResolvedSection {
            section_key: section_key.clone(),
            section_number: u32::try_from(index + 1)
                .expect("section standards have at most 64 entries"),
        })
        .collect()
}

pub(crate) fn validate_consumers(
    entries: &[SourceEntry],
    standards: &BTreeMap<String, SectionStandard>,
    registry_path: &Path,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let consumed = entries
        .iter()
        .filter_map(|entry| entry.entity.section_standard_key())
        .collect::<BTreeSet<_>>();
    for key in standards.keys() {
        if !consumed.contains(key.as_str()) {
            diagnostics.push(Diagnostic::source(
                registry_path,
                format!("section standard {key} has no consuming entity"),
            ));
        }
    }
}
