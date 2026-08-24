//! Serializes the closed obligation model into canonical evidence DTOs and
//! computes the stable digest embedded in projection reports.

use super::{ObligationClass, ProjectionObligation, ProjectionTarget, SourceToken};
use crate::{databases::DatabaseKind, media::sha256_hex};
use serde::Serialize;
use std::collections::BTreeSet;

pub(crate) fn evidence_digest(obligations: &BTreeSet<ProjectionObligation>) -> String {
    let document = EvidenceDigestDocument {
        schema_version: 1,
        obligations: obligations.iter().map(EvidenceObligation::from).collect(),
    };
    let bytes =
        serde_json::to_vec(&document).expect("closed projection evidence DTO must serialize");
    sha256_hex(&bytes)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceDigestDocument {
    schema_version: u32,
    obligations: Vec<EvidenceObligation>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EvidenceObligation {
    class: &'static str,
    source: EvidenceSource,
    target: EvidenceTarget,
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum EvidenceSource {
    Entity {
        entity_type: String,
        id: String,
    },
    Field {
        entity_type: String,
        id: String,
        path: String,
    },
    Relation {
        entity_type: String,
        id: String,
        field: String,
        position: usize,
        related: String,
    },
    LocalizedValue {
        entity_type: String,
        id: String,
        field: String,
        locale: String,
        position: usize,
    },
    Document {
        entity_type: String,
        id: String,
        locale: String,
    },
    Section {
        entity_type: String,
        id: String,
        locale: String,
        section_key: String,
    },
    StructuralMediaReference {
        entity_type: String,
        id: String,
        locale: String,
        role: String,
        sort_order: usize,
        media_key: String,
    },
    MarkdownMediaReference {
        entity_type: String,
        id: String,
        locale: String,
        section_key: String,
        occurrence: usize,
        media_key: String,
    },
    SearchValue {
        entity_type: String,
        id: String,
        locale: String,
        provenance: String,
        occurrence: usize,
    },
    MediaAsset {
        locale: String,
        media_key: String,
    },
    CasObject {
        locale: String,
        content_hash: String,
    },
    BuildMetadata {
        database: &'static str,
        locale: String,
        release: bool,
    },
}

#[derive(Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum EvidenceTarget {
    CanonicalValidation {
        entity_type: String,
        id: String,
        locale: String,
        validation: &'static str,
    },
    TableRow {
        database: &'static str,
        table: &'static str,
        row: String,
    },
    TableColumn {
        database: &'static str,
        table: &'static str,
        row: String,
        column: String,
    },
    SearchTerm {
        entity_type: String,
        id: String,
        locale: String,
        provenance: String,
        occurrence: usize,
    },
    CompiledDocument {
        entity_type: String,
        id: String,
        locale: String,
    },
    CompiledSection {
        entity_type: String,
        id: String,
        locale: String,
        section_key: String,
    },
    SystemMediaAsset {
        locale: String,
        media_key: String,
    },
    CasObject {
        locale: String,
        content_hash: String,
    },
    BuildMetadata {
        database: &'static str,
        locale: String,
        release: bool,
    },
}

impl From<&ProjectionObligation> for EvidenceObligation {
    fn from(value: &ProjectionObligation) -> Self {
        Self {
            class: match value.class {
                ObligationClass::Entity => "entity",
                ObligationClass::Relation => "relation",
                ObligationClass::LocalizedContent => "localized_content",
                ObligationClass::Media => "media",
                ObligationClass::Cas => "cas",
                ObligationClass::Metadata => "metadata",
                ObligationClass::Authoring => "authoring",
            },
            source: EvidenceSource::from(&value.source),
            target: EvidenceTarget::from(&value.target),
        }
    }
}

fn database_name(database: DatabaseKind) -> &'static str {
    match database {
        DatabaseKind::System => "system",
        DatabaseKind::SystemMedia => "system_media",
    }
}

impl From<&SourceToken> for EvidenceSource {
    fn from(value: &SourceToken) -> Self {
        match value {
            SourceToken::Entity(entity) => Self::Entity {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
            },
            SourceToken::Field { entity, path } => Self::Field {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                path: path.clone(),
            },
            SourceToken::Relation {
                entity,
                field,
                position,
                related,
            } => Self::Relation {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                field: field.clone(),
                position: *position,
                related: related.clone(),
            },
            SourceToken::LocalizedValue {
                entity,
                field,
                locale,
                position,
            } => Self::LocalizedValue {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                field: field.clone(),
                locale: locale.to_string(),
                position: *position,
            },
            SourceToken::Document { entity, locale } => Self::Document {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
            },
            SourceToken::Section {
                entity,
                locale,
                section_key,
            } => Self::Section {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                section_key: section_key.clone(),
            },
            SourceToken::StructuralMediaReference {
                entity,
                locale,
                role,
                sort_order,
                media_key,
            } => Self::StructuralMediaReference {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                role: role.clone(),
                sort_order: *sort_order,
                media_key: media_key.clone(),
            },
            SourceToken::MarkdownMediaReference {
                entity,
                locale,
                section_key,
                occurrence,
                media_key,
            } => Self::MarkdownMediaReference {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                section_key: section_key.clone(),
                occurrence: *occurrence,
                media_key: media_key.clone(),
            },
            SourceToken::SearchValue {
                entity,
                locale,
                provenance,
                occurrence,
            } => Self::SearchValue {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                provenance: provenance.clone(),
                occurrence: *occurrence,
            },
            SourceToken::MediaAsset { locale, media_key } => Self::MediaAsset {
                locale: locale.to_string(),
                media_key: media_key.clone(),
            },
            SourceToken::CasObject {
                locale,
                content_hash,
            } => Self::CasObject {
                locale: locale.to_string(),
                content_hash: content_hash.clone(),
            },
            SourceToken::BuildMetadata {
                database,
                locale,
                release,
            } => Self::BuildMetadata {
                database: database_name(*database),
                locale: locale.to_string(),
                release: *release,
            },
        }
    }
}

impl From<&ProjectionTarget> for EvidenceTarget {
    fn from(value: &ProjectionTarget) -> Self {
        match value {
            ProjectionTarget::CanonicalValidation {
                entity,
                locale,
                validation,
            } => Self::CanonicalValidation {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                validation,
            },
            ProjectionTarget::TableRow {
                database,
                table,
                row,
            } => Self::TableRow {
                database: database_name(*database),
                table: table.as_str(),
                row: row.clone(),
            },
            ProjectionTarget::TableColumn {
                database,
                table,
                row,
                column,
            } => Self::TableColumn {
                database: database_name(*database),
                table: table.as_str(),
                row: row.clone(),
                column: column.as_str().to_string(),
            },
            ProjectionTarget::SearchTerm {
                entity,
                locale,
                provenance,
                occurrence,
            } => Self::SearchTerm {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                provenance: provenance.clone(),
                occurrence: *occurrence,
            },
            ProjectionTarget::CompiledDocument { entity, locale } => Self::CompiledDocument {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
            },
            ProjectionTarget::CompiledSection {
                entity,
                locale,
                section_key,
            } => Self::CompiledSection {
                entity_type: entity.entity_type.clone(),
                id: entity.id.clone(),
                locale: locale.to_string(),
                section_key: section_key.clone(),
            },
            ProjectionTarget::SystemMediaAsset { locale, media_key } => Self::SystemMediaAsset {
                locale: locale.to_string(),
                media_key: media_key.clone(),
            },
            ProjectionTarget::CasObject {
                locale,
                content_hash,
            } => Self::CasObject {
                locale: locale.to_string(),
                content_hash: content_hash.clone(),
            },
            ProjectionTarget::BuildMetadata {
                database,
                locale,
                release,
            } => Self::BuildMetadata {
                database: database_name(*database),
                locale: locale.to_string(),
                release: *release,
            },
        }
    }
}
