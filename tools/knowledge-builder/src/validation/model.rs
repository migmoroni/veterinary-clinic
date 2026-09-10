//! Defines validation diagnostics, errors, and the validated source graph.

use super::{CompiledDocument, KnowledgeLocale, MediaAsset, SourceEntry, TaxonomyEntity};
use crate::markdown::CompiledMediaReference;
use crate::source::{CanonicalEntity, LifeEntity, LifeRank, LocalizedValue, TaxonomyTerm};
use serde::Serialize;
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt,
    path::Path,
};

#[derive(Clone, Debug, Serialize)]
pub struct Diagnostic {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
    pub message: String,
}

impl Diagnostic {
    pub(super) fn source(path: &Path, message: impl Into<String>) -> Self {
        Self {
            path: path.display().to_string(),
            entity: None,
            field: None,
            locale: None,
            section: None,
            message: message.into(),
        }
    }

    pub(super) fn entity(
        entry: &SourceEntry,
        field: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            path: entry.manifest_path.display().to_string(),
            entity: Some(format!(
                "{}:{}",
                entry.entity.entity_type(),
                entry.entity.id()
            )),
            field: Some(field.into()),
            locale: None,
            section: None,
            message: message.into(),
        }
    }

    pub(super) fn editorial(
        path: &Path,
        entry: &SourceEntry,
        locale: KnowledgeLocale,
        message: impl Into<String>,
    ) -> Self {
        Self {
            path: path.display().to_string(),
            entity: Some(format!(
                "{}:{}",
                entry.entity.entity_type(),
                entry.entity.id()
            )),
            field: Some("sections".to_string()),
            locale: Some(locale.to_string()),
            section: None,
            message: message.into(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct ValidationError {
    pub diagnostics: Vec<Diagnostic>,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(
            formatter,
            "knowledge source validation failed with {} diagnostic(s)",
            self.diagnostics.len()
        )?;
        for diagnostic in &self.diagnostics {
            write!(formatter, "{}", diagnostic.path)?;
            if let Some(entity) = &diagnostic.entity {
                write!(formatter, " [{entity}]")?;
            }
            if let Some(field) = &diagnostic.field {
                write!(formatter, " field={field}")?;
            }
            if let Some(locale) = &diagnostic.locale {
                write!(formatter, " locale={locale}")?;
            }
            if let Some(section) = &diagnostic.section {
                write!(formatter, " section={section}")?;
            }
            writeln!(formatter, ": {}", diagnostic.message)?;
        }
        Ok(())
    }
}

impl std::error::Error for ValidationError {}

#[derive(Clone, Debug)]
pub(crate) struct ValidatedEntity {
    pub source: SourceEntry,
    pub editorial: BTreeMap<KnowledgeLocale, CompiledDocument>,
    pub structural_media: Vec<ValidatedMediaReference>,
    pub markdown_media: BTreeMap<KnowledgeLocale, Vec<CompiledMediaReference>>,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct ValidatedMediaReference {
    pub role: &'static str,
    pub sort_order: usize,
    pub media_key: String,
}

#[derive(Clone, Debug)]
pub(crate) struct IndexedTaxonomyTerm {
    pub(crate) term: TaxonomyTerm,
    pub(crate) parent_key: Option<String>,
    pub(crate) sibling_order: usize,
    pub(crate) depth: usize,
    pub(crate) source_path: String,
    pub(crate) owner_path: String,
}

pub(crate) type TaxonomyTermIndexes =
    BTreeMap<(String, String), BTreeMap<String, IndexedTaxonomyTerm>>;

#[derive(Clone, Debug)]
pub struct ValidatedSource {
    pub(crate) entities: Vec<ValidatedEntity>,
    pub(crate) taxonomies: BTreeMap<(String, String), TaxonomyEntity>,
    pub(crate) taxonomy_terms: TaxonomyTermIndexes,
    pub(crate) media: BTreeMap<String, MediaAsset>,
    pub(crate) media_keys_by_locale: BTreeMap<KnowledgeLocale, BTreeSet<String>>,
    pub(crate) source_digest_sha256: String,
    pub(crate) relation_count: usize,
    pub(crate) localized_fragments_by_locale: BTreeMap<KnowledgeLocale, usize>,
    pub(crate) source_files: usize,
}

impl ValidatedSource {
    pub(crate) fn taxonomy_term(
        &self,
        domain: &str,
        purpose: &str,
        key: &str,
    ) -> Option<&IndexedTaxonomyTerm> {
        self.taxonomy_terms
            .get(&(domain.to_string(), purpose.to_string()))
            .and_then(|terms| terms.get(key))
    }

    pub fn entity_count(&self) -> usize {
        self.entities.len()
    }

    pub fn relation_count(&self) -> usize {
        self.relation_count
    }

    pub fn localized_fragment_count(&self) -> usize {
        self.localized_fragments_by_locale.values().sum()
    }

    pub fn source_digest_sha256(&self) -> &str {
        &self.source_digest_sha256
    }

    pub fn life_term_rank(&self, term_key: &str) -> Option<LifeRank> {
        self.taxonomy_term("life", "type", term_key)
            .and_then(|term| LifeRank::from_depth(term.depth))
    }

    pub fn life_type_of_entity(&self, entity_id: &str) -> Option<(&LifeEntity, LifeRank)> {
        self.entities
            .iter()
            .find_map(|entry| match &entry.source.entity {
                CanonicalEntity::Life(entity) if entity.id == entity_id => self
                    .life_term_rank(&entity.type_term_key)
                    .map(|rank| (&**entity, rank)),
                _ => None,
            })
    }

    pub fn life_entity_for_term(&self, term_key: &str) -> Option<&LifeEntity> {
        self.entities
            .iter()
            .find_map(|entry| match &entry.source.entity {
                CanonicalEntity::Life(entity) if entity.type_term_key == term_key => {
                    Some(&**entity)
                }
                _ => None,
            })
    }

    pub fn life_parent(&self, term_key: &str) -> Option<&str> {
        self.taxonomy_term("life", "type", term_key)
            .and_then(|term| term.parent_key.as_deref())
    }

    pub fn life_children(&self, term_key: &str) -> Vec<&str> {
        let Some(terms) = self
            .taxonomy_terms
            .get(&("life".to_string(), "type".to_string()))
        else {
            return Vec::new();
        };
        let mut children = terms
            .iter()
            .filter(|(_, term)| term.parent_key.as_deref() == Some(term_key))
            .map(|(key, term)| (term.sibling_order, key.as_str()))
            .collect::<Vec<_>>();
        children.sort_unstable();
        children.into_iter().map(|(_, key)| key).collect()
    }

    pub fn life_ancestors(&self, term_key: &str) -> Vec<&str> {
        let mut result = Vec::new();
        let mut current = self.life_parent(term_key);
        while let Some(key) = current {
            result.push(key);
            current = self.life_parent(key);
        }
        result.reverse();
        result
    }

    pub fn life_descendants(&self, term_key: &str) -> Vec<&str> {
        let mut result = Vec::new();
        let mut pending = self.life_children(term_key);
        pending.reverse();
        while let Some(key) = pending.pop() {
            result.push(key);
            let mut children = self.life_children(key);
            children.reverse();
            pending.extend(children);
        }
        result
    }

    pub fn life_is_ancestor(&self, ancestor: &str, descendant: &str) -> bool {
        self.life_ancestors(descendant).contains(&ancestor)
    }

    pub fn life_taxon_label(&self, term_key: &str, locale: KnowledgeLocale) -> Option<&str> {
        self.taxonomy_term("life", "type", term_key)
            .and_then(|term| term.term.localized_content.get("label"))
            .and_then(|value| value.text(locale))
    }

    pub fn life_entity_aliases(
        &self,
        entity_id: &str,
        locale: KnowledgeLocale,
    ) -> Option<&[String]> {
        let (entity, _) = self.life_type_of_entity(entity_id)?;
        match entity.localized_content.get("aliases")? {
            LocalizedValue::List(value) => Some(value.get(locale)),
            LocalizedValue::Text(_) => None,
        }
    }
}
