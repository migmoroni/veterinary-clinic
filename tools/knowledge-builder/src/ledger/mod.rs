use crate::{
    source::{KnowledgeLocale, LOCALES},
    validation::ValidatedSource,
};
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt,
};

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ConsumptionDestination {
    System,
    SystemMedia,
    Cas,
    CompiledContent,
    BuildMetadata,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum FieldKind {
    Structural,
    Relation,
    Localized,
    Authoring,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum PathPart {
    Field(String),
    Index(usize),
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectionToken {
    Entity {
        entity_type: String,
        id: String,
    },
    Field {
        kind: FieldKind,
        entity_type: String,
        id: String,
        locale: Option<KnowledgeLocale>,
        path: Vec<PathPart>,
    },
    Document {
        entity_type: String,
        id: String,
        locale: KnowledgeLocale,
    },
    Section {
        entity_type: String,
        id: String,
        locale: KnowledgeLocale,
        key: String,
    },
    MediaAsset {
        locale: KnowledgeLocale,
        media_key: String,
    },
    CasObject {
        locale: KnowledgeLocale,
        content_hash: String,
    },
}

impl fmt::Display for ProjectionToken {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Entity { entity_type, id } => write!(formatter, "entity/{entity_type}/{id}"),
            Self::Field {
                kind,
                entity_type,
                id,
                locale,
                path,
            } => {
                let kind = match kind {
                    FieldKind::Structural => "structural",
                    FieldKind::Relation => "relation",
                    FieldKind::Localized => "localized",
                    FieldKind::Authoring => "authoring",
                };
                write!(formatter, "{kind}/{entity_type}/{id}")?;
                if let Some(locale) = locale {
                    write!(formatter, "/{locale}")?;
                }
                for part in path {
                    match part {
                        PathPart::Field(value) => write!(formatter, "/{value}")?,
                        PathPart::Index(value) => write!(formatter, "/{value}")?,
                    }
                }
                Ok(())
            }
            Self::Document {
                entity_type,
                id,
                locale,
            } => write!(formatter, "document/{entity_type}/{id}/{locale}"),
            Self::Section {
                entity_type,
                id,
                locale,
                key,
            } => write!(formatter, "section/{entity_type}/{id}/{locale}/{key}"),
            Self::MediaAsset { locale, media_key } => {
                write!(formatter, "media/{locale}/{media_key}")
            }
            Self::CasObject {
                locale,
                content_hash,
            } => write!(formatter, "cas/{locale}/{content_hash}"),
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct ProjectionLedger {
    locale: KnowledgeLocale,
    expected: BTreeMap<ProjectionToken, ConsumptionDestination>,
    consumed: BTreeSet<ProjectionToken>,
    unexpected: BTreeSet<ProjectionToken>,
    duplicated: BTreeSet<ProjectionToken>,
}

#[derive(Clone, Debug)]
pub(crate) struct CompletedLedger {
    pub locale: KnowledgeLocale,
    pub consumed: BTreeSet<ProjectionToken>,
}

impl ProjectionLedger {
    pub(crate) fn expected(
        source: &ValidatedSource,
        locale: KnowledgeLocale,
    ) -> Result<Self, String> {
        let mut expected = BTreeMap::new();
        for entry in &source.entities {
            let entity_type = entry.source.entity.entity_type().to_string();
            let id = entry.source.entity.id().to_string();
            insert_expected(
                &mut expected,
                ProjectionToken::Entity {
                    entity_type: entity_type.clone(),
                    id: id.clone(),
                },
                ConsumptionDestination::System,
            )?;
            let value = serde_json::to_value(&entry.source.entity)
                .map_err(|error| format!("cannot tokenize {entity_type}:{id}: {error}"))?;
            tokenize_value(
                &mut expected,
                &entity_type,
                &id,
                locale,
                &mut Vec::new(),
                &value,
            )?;
            if let Some(document) = entry.editorial.get(&locale) {
                insert_expected(
                    &mut expected,
                    ProjectionToken::Document {
                        entity_type: entity_type.clone(),
                        id: id.clone(),
                        locale,
                    },
                    ConsumptionDestination::CompiledContent,
                )?;
                for section in &document.sections {
                    insert_expected(
                        &mut expected,
                        ProjectionToken::Section {
                            entity_type: entity_type.clone(),
                            id: id.clone(),
                            locale,
                            key: section.section_key.clone(),
                        },
                        ConsumptionDestination::CompiledContent,
                    )?;
                }
            }
        }
        let mut locale_hashes = BTreeSet::new();
        for media_key in source
            .media_keys_by_locale
            .get(&locale)
            .into_iter()
            .flatten()
        {
            insert_expected(
                &mut expected,
                ProjectionToken::MediaAsset {
                    locale,
                    media_key: media_key.clone(),
                },
                ConsumptionDestination::SystemMedia,
            )?;
            let asset = source
                .media
                .get(media_key)
                .ok_or_else(|| format!("media key has no asset: {media_key}"))?;
            locale_hashes.insert(asset.content_hash_sha256.clone());
        }
        for content_hash in locale_hashes {
            insert_expected(
                &mut expected,
                ProjectionToken::CasObject {
                    locale,
                    content_hash,
                },
                ConsumptionDestination::Cas,
            )?;
        }
        Ok(Self {
            locale,
            expected,
            consumed: BTreeSet::new(),
            unexpected: BTreeSet::new(),
            duplicated: BTreeSet::new(),
        })
    }

    pub(crate) fn consume(&mut self, token: ProjectionToken) -> Result<(), String> {
        if !self.expected.contains_key(&token) {
            self.unexpected.insert(token.clone());
            return Err(format!("unexpected projection token {token}"));
        }
        if !self.consumed.insert(token.clone()) {
            self.duplicated.insert(token.clone());
            return Err(format!("duplicated projection token {token}"));
        }
        Ok(())
    }

    pub(crate) fn consume_destination(
        &mut self,
        destination: ConsumptionDestination,
    ) -> Result<(), String> {
        let tokens = self
            .expected
            .iter()
            .filter_map(|(token, actual)| (*actual == destination).then_some(token.clone()))
            .collect::<Vec<_>>();
        for token in tokens {
            self.consume(token)?;
        }
        Ok(())
    }

    pub(crate) fn finish(self) -> Result<CompletedLedger, String> {
        let unconsumed = self
            .expected
            .keys()
            .filter(|token| !self.consumed.contains(*token))
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        if !unconsumed.is_empty() || !self.unexpected.is_empty() || !self.duplicated.is_empty() {
            return Err(format!(
                "projection ledger {} is incomplete: unconsumed=[{}], unexpected=[{}], duplicated=[{}]",
                self.locale,
                unconsumed.join(", "),
                self.unexpected.iter().map(ToString::to_string).collect::<Vec<_>>().join(", "),
                self.duplicated.iter().map(ToString::to_string).collect::<Vec<_>>().join(", ")
            ));
        }
        Ok(CompletedLedger {
            locale: self.locale,
            consumed: self.consumed,
        })
    }
}

impl CompletedLedger {
    pub(crate) fn entities_by_type(&self) -> BTreeMap<String, usize> {
        let mut counts = BTreeMap::new();
        for token in &self.consumed {
            if let ProjectionToken::Entity { entity_type, .. } = token {
                *counts.entry(entity_type.clone()).or_default() += 1;
            }
        }
        counts
    }
    pub(crate) fn relation_count(&self) -> usize {
        self.consumed
            .iter()
            .filter(|token| {
                matches!(
                    token,
                    ProjectionToken::Field {
                        kind: FieldKind::Relation,
                        ..
                    }
                )
            })
            .count()
    }
    pub(crate) fn localized_fragment_count(&self) -> usize {
        self.consumed
            .iter()
            .filter(|token| {
                matches!(
                    token,
                    ProjectionToken::Field {
                        kind: FieldKind::Localized,
                        ..
                    } | ProjectionToken::Section { .. }
                )
            })
            .count()
    }
}

fn tokenize_value(
    expected: &mut BTreeMap<ProjectionToken, ConsumptionDestination>,
    entity_type: &str,
    id: &str,
    locale: KnowledgeLocale,
    path: &mut Vec<PathPart>,
    value: &Value,
) -> Result<(), String> {
    match value {
        Value::Object(object) if is_locale_map(object) => {
            let localized = object
                .get(locale.as_str())
                .ok_or_else(|| format!("localized map misses {locale}"))?;
            path.push(PathPart::Field(locale.to_string()));
            tokenize_value(expected, entity_type, id, locale, path, localized)?;
            path.pop();
        }
        Value::Object(object) if !object.is_empty() => {
            for (field, child) in object {
                path.push(PathPart::Field(field.clone()));
                tokenize_value(expected, entity_type, id, locale, path, child)?;
                path.pop();
            }
        }
        Value::Array(values) if !values.is_empty() => {
            for (index, child) in values.iter().enumerate() {
                path.push(PathPart::Index(index));
                tokenize_value(expected, entity_type, id, locale, path, child)?;
                path.pop();
            }
        }
        _ => {
            let (mut kind, destination) = field_disposition(entity_type, path)?;
            if kind == FieldKind::Relation
                && (value.is_null() || value.as_array().is_some_and(Vec::is_empty))
            {
                kind = FieldKind::Structural;
            }
            if kind == FieldKind::Localized && value.as_array().is_some_and(Vec::is_empty) {
                kind = FieldKind::Authoring;
            }
            insert_expected(
                expected,
                ProjectionToken::Field {
                    kind,
                    entity_type: entity_type.to_string(),
                    id: id.to_string(),
                    locale: (kind == FieldKind::Localized).then_some(locale),
                    path: path.clone(),
                },
                destination,
            )?;
        }
    }
    Ok(())
}

fn is_locale_map(object: &serde_json::Map<String, Value>) -> bool {
    object.len() == LOCALES.len()
        && LOCALES
            .iter()
            .all(|locale| object.contains_key(locale.as_str()))
}

fn field_disposition(
    entity_type: &str,
    path: &[PathPart],
) -> Result<(FieldKind, ConsumptionDestination), String> {
    let top = path
        .iter()
        .find_map(|part| match part {
            PathPart::Field(value) => Some(value.as_str()),
            PathPart::Index(_) => None,
        })
        .ok_or_else(|| "canonical field has no path".to_string())?;
    let declared = match entity_type {
        "product" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "typeTermKey"
                | "classificationTermKeys"
                | "species"
                | "regions"
                | "manufacturerId"
                | "activeIngredientIds"
                | "regulatoryIdentifiers"
                | "targetTermKeys"
                | "vaccineProfileTermKeys"
                | "lifeStageTermKeys"
                | "therapeuticScopeTermKeys"
                | "localizedContent"
                | "sections"
                | "contentPath"
                | "media"
        ),
        "manufacturer" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "typeTermKey"
                | "classificationTermKeys"
                | "regions"
                | "website"
                | "localizedContent"
                | "sections"
                | "contentPath"
                | "media"
        ),
        "active_ingredient" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "typeTermKey"
                | "classificationTermKeys"
                | "regions"
                | "nomenclature"
                | "atcVetCode"
                | "localizedContent"
                | "sections"
                | "contentPath"
                | "media"
        ),
        "condition" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "typeTermKey"
                | "classificationTermKeys"
                | "regions"
                | "localizedContent"
                | "sections"
                | "contentPath"
                | "media"
        ),
        "breed" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "species"
                | "originPlaceIds"
                | "sizeTermKey"
                | "averageWeightKg"
                | "averageHeightCm"
                | "localizedContent"
                | "sections"
                | "contentPath"
                | "media"
        ),
        "geo_place" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "placeType"
                | "countryCodes"
                | "parentPlaceId"
                | "centroid"
                | "localizedContent"
        ),
        "taxonomy" => matches!(
            top,
            "schemaVersion" | "entityType" | "id" | "domain" | "purpose" | "terms"
        ),
        "treatment_protocol" => matches!(
            top,
            "schemaVersion"
                | "entityType"
                | "id"
                | "kind"
                | "species"
                | "productIds"
                | "doses"
                | "localizedContent"
        ),
        _ => false,
    };
    if !declared {
        return Err(format!(
            "canonical field {entity_type}.{top} has no consumption disposition"
        ));
    }
    let fields = path
        .iter()
        .filter_map(|part| match part {
            PathPart::Field(value) => Some(value.as_str()),
            PathPart::Index(_) => None,
        })
        .collect::<Vec<_>>();
    if fields
        .iter()
        .any(|field| LOCALES.iter().any(|locale| locale.as_str() == *field))
    {
        return Ok((FieldKind::Localized, ConsumptionDestination::System));
    }
    if matches!(top, "schemaVersion" | "entityType") {
        return Ok((FieldKind::Authoring, ConsumptionDestination::BuildMetadata));
    }
    if top == "contentPath" || fields.contains(&"sectionNumber") || fields.contains(&"sectionKey") {
        return Ok((
            FieldKind::Authoring,
            ConsumptionDestination::CompiledContent,
        ));
    }
    if top == "media" {
        return Ok((FieldKind::Structural, ConsumptionDestination::SystemMedia));
    }
    if fields.iter().any(|field| {
        matches!(
            *field,
            "typeTermKey"
                | "classificationTermKeys"
                | "manufacturerId"
                | "activeIngredientIds"
                | "targetTermKeys"
                | "vaccineProfileTermKeys"
                | "lifeStageTermKeys"
                | "therapeuticScopeTermKeys"
                | "originPlaceIds"
                | "sizeTermKey"
                | "parentPlaceId"
                | "parentKey"
                | "productIds"
        )
    }) {
        return Ok((FieldKind::Relation, ConsumptionDestination::System));
    }
    Ok((FieldKind::Structural, ConsumptionDestination::System))
}

fn insert_expected(
    map: &mut BTreeMap<ProjectionToken, ConsumptionDestination>,
    token: ProjectionToken,
    destination: ConsumptionDestination,
) -> Result<(), String> {
    if map.insert(token.clone(), destination).is_some() {
        Err(format!("duplicate expected projection token {token}"))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ledger() -> ProjectionLedger {
        let token = ProjectionToken::Entity {
            entity_type: "product".into(),
            id: "id".into(),
        };
        ProjectionLedger {
            locale: KnowledgeLocale::EnUs,
            expected: BTreeMap::from([(token, ConsumptionDestination::System)]),
            consumed: BTreeSet::new(),
            unexpected: BTreeSet::new(),
            duplicated: BTreeSet::new(),
        }
    }

    #[test]
    fn detects_missing_unexpected_and_duplicate_tokens() {
        assert!(ledger().finish().is_err());
        let mut duplicate = ledger();
        let token = ProjectionToken::Entity {
            entity_type: "product".into(),
            id: "id".into(),
        };
        duplicate.consume(token.clone()).unwrap();
        assert!(duplicate.consume(token).is_err());
        let mut unexpected = ledger();
        assert!(unexpected
            .consume(ProjectionToken::Entity {
                entity_type: "breed".into(),
                id: "x".into()
            })
            .is_err());
    }
}
