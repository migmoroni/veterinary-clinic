//! Defines validation diagnostics, errors, and the validated source graph.

use super::*;
use serde::Serialize;

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
pub struct ValidatedSource {
    pub(crate) entities: Vec<ValidatedEntity>,
    pub(crate) taxonomies: BTreeMap<(String, String), TaxonomyEntity>,
    pub(crate) media: BTreeMap<String, MediaAsset>,
    pub(crate) media_keys_by_locale: BTreeMap<KnowledgeLocale, BTreeSet<String>>,
    pub(crate) source_digest_sha256: String,
    pub(crate) relation_count: usize,
    pub(crate) localized_fragments_by_locale: BTreeMap<KnowledgeLocale, usize>,
    pub(crate) source_files: usize,
}

impl ValidatedSource {
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
}
