use crate::{
    databases::DatabaseKind,
    media::sha256_hex,
    source::{
        CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, StructuralMedia,
        TaxonomyEntity,
    },
    validation::{ValidatedEntity, ValidatedSource},
};
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt,
};

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct EntityIdentity {
    pub entity_type: String,
    pub id: String,
}

impl EntityIdentity {
    pub(crate) fn new(entity_type: impl Into<String>, id: impl Into<String>) -> Self {
        Self {
            entity_type: entity_type.into(),
            id: id.into(),
        }
    }
}

impl fmt::Display for EntityIdentity {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}/{}", self.entity_type, self.id)
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum SystemTable {
    KnowledgeBuildMetadata,
    KnowledgeReleaseMetadata,
    TaxonomyRegistry,
    TaxonomyTerms,
    ProductTargetTerms,
    ProductVaccineProfileTerms,
    ProductLifeStageTerms,
    ProductTherapeuticScopeTerms,
    GeoPlaces,
    BreedReferenceItems,
    BreedOriginPlaces,
    ManufacturerCatalogItems,
    ActiveIngredientCatalogItems,
    ConditionCatalogItems,
    ProductCatalogItems,
    EntityTaxonomyTerms,
    ProductActiveIngredients,
    ProductTargets,
    ProductVaccineProfiles,
    ProductLifeStages,
    ProductTherapeuticScopes,
    TreatmentProtocols,
    TreatmentProtocolItems,
    TreatmentProtocolDoses,
    EntitySearchTerms,
    EntityMediaReferences,
    MediaAssets,
}

impl SystemTable {
    pub(crate) const SYSTEM_PROJECTABLE: [Self; 24] = [
        Self::TaxonomyRegistry,
        Self::TaxonomyTerms,
        Self::ProductTargetTerms,
        Self::ProductVaccineProfileTerms,
        Self::ProductLifeStageTerms,
        Self::ProductTherapeuticScopeTerms,
        Self::GeoPlaces,
        Self::BreedReferenceItems,
        Self::BreedOriginPlaces,
        Self::ManufacturerCatalogItems,
        Self::ActiveIngredientCatalogItems,
        Self::ConditionCatalogItems,
        Self::ProductCatalogItems,
        Self::EntityTaxonomyTerms,
        Self::ProductActiveIngredients,
        Self::ProductTargets,
        Self::ProductVaccineProfiles,
        Self::ProductLifeStages,
        Self::ProductTherapeuticScopes,
        Self::TreatmentProtocols,
        Self::TreatmentProtocolItems,
        Self::TreatmentProtocolDoses,
        Self::EntitySearchTerms,
        Self::EntityMediaReferences,
    ];

    pub(crate) const SYSTEM_MEDIA_PROJECTABLE: [Self; 1] = [Self::MediaAssets];

    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::KnowledgeBuildMetadata => "knowledge_build_metadata",
            Self::KnowledgeReleaseMetadata => "knowledge_release_metadata",
            Self::TaxonomyRegistry => "taxonomy_registry",
            Self::TaxonomyTerms => "taxonomy_terms",
            Self::ProductTargetTerms => "product_target_terms",
            Self::ProductVaccineProfileTerms => "product_vaccine_profile_terms",
            Self::ProductLifeStageTerms => "product_life_stage_terms",
            Self::ProductTherapeuticScopeTerms => "product_therapeutic_scope_terms",
            Self::GeoPlaces => "geo_places",
            Self::BreedReferenceItems => "breed_reference_items",
            Self::BreedOriginPlaces => "breed_origin_places",
            Self::ManufacturerCatalogItems => "manufacturer_catalog_items",
            Self::ActiveIngredientCatalogItems => "active_ingredient_catalog_items",
            Self::ConditionCatalogItems => "condition_catalog_items",
            Self::ProductCatalogItems => "product_catalog_items",
            Self::EntityTaxonomyTerms => "entity_taxonomy_terms",
            Self::ProductActiveIngredients => "product_active_ingredients",
            Self::ProductTargets => "product_targets",
            Self::ProductVaccineProfiles => "product_vaccine_profiles",
            Self::ProductLifeStages => "product_life_stages",
            Self::ProductTherapeuticScopes => "product_therapeutic_scopes",
            Self::TreatmentProtocols => "treatment_protocols",
            Self::TreatmentProtocolItems => "treatment_protocol_items",
            Self::TreatmentProtocolDoses => "treatment_protocol_doses",
            Self::EntitySearchTerms => "entity_search_terms",
            Self::EntityMediaReferences => "entity_media_references",
            Self::MediaAssets => "media_assets",
        }
    }

    pub(crate) fn parse(value: &str) -> Result<Self, String> {
        let table = match value {
            "knowledge_build_metadata" => Self::KnowledgeBuildMetadata,
            "knowledge_release_metadata" => Self::KnowledgeReleaseMetadata,
            "taxonomy_registry" => Self::TaxonomyRegistry,
            "taxonomy_terms" => Self::TaxonomyTerms,
            "product_target_terms" => Self::ProductTargetTerms,
            "product_vaccine_profile_terms" => Self::ProductVaccineProfileTerms,
            "product_life_stage_terms" => Self::ProductLifeStageTerms,
            "product_therapeutic_scope_terms" => Self::ProductTherapeuticScopeTerms,
            "geo_places" => Self::GeoPlaces,
            "breed_reference_items" => Self::BreedReferenceItems,
            "breed_origin_places" => Self::BreedOriginPlaces,
            "manufacturer_catalog_items" => Self::ManufacturerCatalogItems,
            "active_ingredient_catalog_items" => Self::ActiveIngredientCatalogItems,
            "condition_catalog_items" => Self::ConditionCatalogItems,
            "product_catalog_items" => Self::ProductCatalogItems,
            "entity_taxonomy_terms" => Self::EntityTaxonomyTerms,
            "product_active_ingredients" => Self::ProductActiveIngredients,
            "product_targets" => Self::ProductTargets,
            "product_vaccine_profiles" => Self::ProductVaccineProfiles,
            "product_life_stages" => Self::ProductLifeStages,
            "product_therapeutic_scopes" => Self::ProductTherapeuticScopes,
            "treatment_protocols" => Self::TreatmentProtocols,
            "treatment_protocol_items" => Self::TreatmentProtocolItems,
            "treatment_protocol_doses" => Self::TreatmentProtocolDoses,
            "entity_search_terms" => Self::EntitySearchTerms,
            "entity_media_references" => Self::EntityMediaReferences,
            "media_assets" => Self::MediaAssets,
            _ => return Err(format!("unknown projected table {value}")),
        };
        Ok(table)
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ObligationClass {
    Entity,
    Relation,
    LocalizedContent,
    Media,
    Cas,
    Metadata,
    Authoring,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum SourceToken {
    Entity(EntityIdentity),
    Field {
        entity: EntityIdentity,
        path: String,
    },
    Relation {
        entity: EntityIdentity,
        field: String,
        position: usize,
        related: String,
    },
    LocalizedValue {
        entity: EntityIdentity,
        field: String,
        locale: KnowledgeLocale,
        position: usize,
    },
    Document {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
    },
    Section {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        section_key: String,
    },
    StructuralMediaReference {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        role: String,
        sort_order: usize,
        media_key: String,
    },
    MarkdownMediaReference {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        section_key: String,
        occurrence: usize,
        media_key: String,
    },
    SearchValue {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        provenance: String,
        occurrence: usize,
    },
    MediaAsset {
        locale: KnowledgeLocale,
        media_key: String,
    },
    CasObject {
        locale: KnowledgeLocale,
        content_hash: String,
    },
    BuildMetadata {
        database: DatabaseKind,
        locale: KnowledgeLocale,
        release: bool,
    },
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectionTarget {
    TableRow {
        database: DatabaseKind,
        table: SystemTable,
        row: String,
    },
    SearchTerm {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        provenance: String,
        occurrence: usize,
    },
    CompiledDocument {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
    },
    CompiledSection {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        section_key: String,
    },
    SystemMediaAsset {
        locale: KnowledgeLocale,
        media_key: String,
    },
    CasObject {
        locale: KnowledgeLocale,
        content_hash: String,
    },
    BuildMetadata {
        database: DatabaseKind,
        locale: KnowledgeLocale,
        release: bool,
    },
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct ProjectionObligation {
    pub source: SourceToken,
    pub target: ProjectionTarget,
    pub class: ObligationClass,
}

impl fmt::Display for ProjectionObligation {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "{:?}|{:?}|{:?}",
            self.class, self.source, self.target
        )
    }
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct RowEvent {
    pub database: DatabaseKind,
    pub table: SystemTable,
    pub row: String,
    pub entity: Option<EntityIdentity>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct ProjectionJournal {
    targets: Vec<ProjectionTarget>,
    rows: Vec<RowEvent>,
}

impl ProjectionJournal {
    pub(crate) fn record_row(
        &mut self,
        affected_rows: usize,
        database: DatabaseKind,
        table: SystemTable,
        row: impl Into<String>,
        entity: Option<EntityIdentity>,
    ) -> Result<(), String> {
        if affected_rows != 1 {
            return Err(format!(
                "{} insert affected {affected_rows} rows instead of 1",
                table.as_str()
            ));
        }
        let row = row.into();
        let target = ProjectionTarget::TableRow {
            database,
            table,
            row: row.clone(),
        };
        self.targets.push(target);
        self.rows.push(RowEvent {
            database,
            table,
            row,
            entity,
        });
        Ok(())
    }

    pub(crate) fn record_target(&mut self, target: ProjectionTarget) {
        self.targets.push(target);
    }

    pub(crate) fn record_metadata(
        &mut self,
        database: DatabaseKind,
        locale: KnowledgeLocale,
        release: bool,
    ) {
        self.targets.push(ProjectionTarget::BuildMetadata {
            database,
            locale,
            release,
        });
        self.rows.push(RowEvent {
            database,
            table: if release {
                SystemTable::KnowledgeReleaseMetadata
            } else {
                SystemTable::KnowledgeBuildMetadata
            },
            row: "1".to_string(),
            entity: None,
        });
    }

    pub(crate) fn record_search(
        &mut self,
        affected_rows: usize,
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        provenance: String,
        occurrence: usize,
    ) -> Result<(), String> {
        if affected_rows != 1 {
            return Err(format!(
                "entity_search_terms insert affected {affected_rows} rows instead of 1"
            ));
        }
        self.targets.push(ProjectionTarget::SearchTerm {
            entity: entity.clone(),
            locale,
            provenance,
            occurrence,
        });
        self.rows.push(RowEvent {
            database: DatabaseKind::System,
            table: SystemTable::EntitySearchTerms,
            row: format!("{entity}/{occurrence}"),
            entity: Some(entity),
        });
        Ok(())
    }

    pub(crate) fn record_media_asset(
        &mut self,
        affected_rows: usize,
        locale: KnowledgeLocale,
        media_key: String,
    ) -> Result<(), String> {
        if affected_rows != 1 {
            return Err(format!(
                "media_assets insert affected {affected_rows} rows instead of 1"
            ));
        }
        self.targets.push(ProjectionTarget::SystemMediaAsset {
            locale,
            media_key: media_key.clone(),
        });
        self.rows.push(RowEvent {
            database: DatabaseKind::SystemMedia,
            table: SystemTable::MediaAssets,
            row: media_key,
            entity: None,
        });
        Ok(())
    }
}

#[derive(Clone, Debug)]
pub(crate) struct ProjectionLedger {
    locale: KnowledgeLocale,
    expected: BTreeSet<ProjectionObligation>,
    completed: BTreeSet<ProjectionObligation>,
    completed_targets: BTreeSet<ProjectionTarget>,
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
    pub(crate) fn expected(
        source: &ValidatedSource,
        locale: KnowledgeLocale,
        release: bool,
    ) -> Result<Self, String> {
        let mut expected = BTreeSet::new();
        for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
            insert_obligation(
                &mut expected,
                SourceToken::BuildMetadata {
                    database,
                    locale,
                    release: false,
                },
                ProjectionTarget::BuildMetadata {
                    database,
                    locale,
                    release: false,
                },
                ObligationClass::Metadata,
            )?;
            if release {
                insert_obligation(
                    &mut expected,
                    SourceToken::BuildMetadata {
                        database,
                        locale,
                        release: true,
                    },
                    ProjectionTarget::BuildMetadata {
                        database,
                        locale,
                        release: true,
                    },
                    ObligationClass::Metadata,
                )?;
            }
        }
        for entry in &source.entities {
            add_entity_obligations(&mut expected, entry, locale)?;
        }
        for candidate in search_candidates(source, locale)? {
            insert_obligation(
                &mut expected,
                candidate.source,
                ProjectionTarget::SearchTerm {
                    entity: candidate.entity,
                    locale,
                    provenance: candidate.provenance,
                    occurrence: candidate.occurrence,
                },
                ObligationClass::LocalizedContent,
            )?;
        }
        let mut hashes = BTreeSet::new();
        for media_key in source
            .media_keys_by_locale
            .get(&locale)
            .into_iter()
            .flatten()
        {
            insert_obligation(
                &mut expected,
                SourceToken::MediaAsset {
                    locale,
                    media_key: media_key.clone(),
                },
                ProjectionTarget::SystemMediaAsset {
                    locale,
                    media_key: media_key.clone(),
                },
                ObligationClass::Media,
            )?;
            let asset = source
                .media
                .get(media_key)
                .ok_or_else(|| format!("media key has no asset: {media_key}"))?;
            hashes.insert(asset.content_hash_sha256.clone());
        }
        for content_hash in hashes {
            insert_obligation(
                &mut expected,
                SourceToken::CasObject {
                    locale,
                    content_hash: content_hash.clone(),
                },
                ProjectionTarget::CasObject {
                    locale,
                    content_hash,
                },
                ObligationClass::Cas,
            )?;
        }
        Ok(Self {
            locale,
            expected,
            completed: BTreeSet::new(),
            completed_targets: BTreeSet::new(),
            row_events: Vec::new(),
        })
    }

    pub(crate) fn journal(&self) -> ProjectionJournal {
        ProjectionJournal::default()
    }

    pub(crate) fn expected_count(&self) -> usize {
        self.expected.len()
    }

    pub(crate) fn expected_relation_count(&self) -> usize {
        self.expected
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::Relation)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn expected_localized_fragment_count(&self) -> usize {
        self.expected
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len()
    }

    pub(crate) fn expected_evidence_digest(&self) -> String {
        evidence_digest(&self.expected)
    }

    pub(crate) fn commit(&mut self, journal: ProjectionJournal) -> Result<(), String> {
        let mut completed_targets = self.completed_targets.clone();
        let mut completed = self.completed.clone();
        let mut obligations = Vec::new();
        for target in journal.targets {
            if !completed_targets.insert(target.clone()) {
                return Err(format!("duplicated projection target {target:?}"));
            }
            let matching = self
                .expected
                .iter()
                .filter(|obligation| obligation.target == target)
                .cloned()
                .collect::<Vec<_>>();
            if matching.is_empty() {
                return Err(format!("unexpected projection target {target:?}"));
            }
            obligations.extend(matching);
        }
        for obligation in obligations {
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
        self.completed_targets = completed_targets;
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

    pub(crate) fn rows_by_database(&self) -> BTreeMap<String, BTreeMap<String, usize>> {
        let mut system = SystemTable::SYSTEM_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        let mut media = SystemTable::SYSTEM_MEDIA_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        for event in &self.row_events {
            let destination = match event.database {
                DatabaseKind::System => &mut system,
                DatabaseKind::SystemMedia => &mut media,
            };
            if let Some(count) = destination.get_mut(event.table.as_str()) {
                *count += 1;
            }
        }
        BTreeMap::from([
            ("system".to_string(), system),
            ("systemMedia".to_string(), media),
        ])
    }
}

pub(crate) fn evidence_digest(obligations: &BTreeSet<ProjectionObligation>) -> String {
    let bytes = obligations
        .iter()
        .flat_map(|obligation| [obligation.to_string().as_bytes(), b"\n"].concat())
        .collect::<Vec<_>>();
    sha256_hex(&bytes)
}

pub(crate) fn search_candidates(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<Vec<SearchCandidate>, String> {
    let by_identity = source
        .entities
        .iter()
        .map(|entry| {
            (
                (entry.source.entity.entity_type(), entry.source.entity.id()),
                entry,
            )
        })
        .collect::<BTreeMap<_, _>>();
    let mut result = Vec::new();
    for entry in &source.entities {
        let Some(content) = entry.source.entity.localized_content() else {
            continue;
        };
        let entity = identity(&entry.source.entity);
        let mut values = Vec::<(String, String)>::new();
        if let Some(name) = optional_localized_text(content, "name", locale) {
            values.push((name.to_string(), "entity.name".to_string()));
        }
        for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
            values.push((alias, "entity.alias".to_string()));
        }
        match &entry.source.entity {
            CanonicalEntity::Product(product) => {
                if let Some(manufacturer) =
                    by_identity.get(&("manufacturer", product.manufacturer_id.as_str()))
                {
                    append_named_relation(
                        &mut values,
                        &manufacturer.source.entity,
                        locale,
                        "manufacturer",
                    )?;
                }
                for id in &product.active_ingredient_ids {
                    if let Some(ingredient) = by_identity.get(&("active_ingredient", id.as_str())) {
                        append_named_relation(
                            &mut values,
                            &ingredient.source.entity,
                            locale,
                            "activeIngredient",
                        )?;
                        if let CanonicalEntity::ActiveIngredient(ingredient) =
                            &ingredient.source.entity
                        {
                            for standard in &ingredient.nomenclature.denomination_standards {
                                if let Some(value) = optional_localized_text(
                                    &ingredient.localized_content,
                                    &format!("denomination_{standard}"),
                                    locale,
                                ) {
                                    values.push((
                                        value.to_string(),
                                        format!("activeIngredient.denomination.{standard}"),
                                    ));
                                }
                            }
                        }
                    }
                }
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "type")?,
                    std::slice::from_ref(&product.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "classification")?,
                    &product.classification_term_keys,
                    locale,
                    "classification",
                )?;
                for (purpose, keys, provenance) in [
                    ("target", product.target_term_keys.as_deref(), "target"),
                    (
                        "vaccine_profile",
                        product.vaccine_profile_term_keys.as_deref(),
                        "vaccineProfile",
                    ),
                    (
                        "life_stage",
                        product.life_stage_term_keys.as_deref(),
                        "lifeStage",
                    ),
                    (
                        "therapeutic_scope",
                        product.therapeutic_scope_term_keys.as_deref(),
                        "therapeuticScope",
                    ),
                ] {
                    append_taxonomy_values(
                        &mut values,
                        taxonomy_for(source, "product", purpose)?,
                        keys.unwrap_or(&[]),
                        locale,
                        provenance,
                    )?;
                }
            }
            CanonicalEntity::Manufacturer(value) => append_entity_taxonomies(
                &mut values,
                source,
                "manufacturer",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::ActiveIngredient(value) => append_entity_taxonomies(
                &mut values,
                source,
                "active_ingredient",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::Condition(value) => append_entity_taxonomies(
                &mut values,
                source,
                "condition",
                &value.type_term_key,
                &value.classification_term_keys,
                locale,
            )?,
            CanonicalEntity::Breed(value) => append_taxonomy_values(
                &mut values,
                taxonomy_for(source, "breed", "size")?,
                std::slice::from_ref(&value.size_term_key),
                locale,
                "size",
            )?,
            CanonicalEntity::GeoPlace(_) | CanonicalEntity::TreatmentProtocol(_) => {}
            CanonicalEntity::Taxonomy(_) => unreachable!(),
        }
        let mut seen = BTreeSet::new();
        let mut order = 0;
        let mut alias_position = 0;
        for (value, provenance) in values {
            let current_alias_position = (provenance == "entity.alias").then(|| {
                let position = alias_position;
                alias_position += 1;
                position
            });
            let normalized = crate::normalization::normalize_search_text(&value);
            if !seen.insert((provenance.clone(), normalized)) {
                continue;
            }
            let source_token = match provenance.as_str() {
                "entity.name" => SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: "localizedContent.name".to_string(),
                    locale,
                    position: 0,
                },
                "entity.alias" => SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: "localizedContent.aliases".to_string(),
                    locale,
                    position: current_alias_position.expect("entity alias has a position"),
                },
                _ => SourceToken::SearchValue {
                    entity: entity.clone(),
                    locale,
                    provenance: provenance.clone(),
                    occurrence: order,
                },
            };
            result.push(SearchCandidate {
                entity: entity.clone(),
                value,
                provenance: provenance.clone(),
                occurrence: order,
                source: source_token,
            });
            order += 1;
        }
    }
    Ok(result)
}

fn add_entity_obligations(
    expected: &mut BTreeSet<ProjectionObligation>,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    let main = main_row_target(&entry.source.entity);
    insert_obligation(
        expected,
        SourceToken::Entity(entity.clone()),
        main.clone(),
        ObligationClass::Entity,
    )?;
    field(
        expected,
        &entity,
        "entityType",
        metadata_target(locale),
        ObligationClass::Authoring,
    )?;
    match &entry.source.entity {
        CanonicalEntity::Product(value) => {
            let crate::source::ProductEntity {
                schema_version: _,
                id: _,
                type_term_key,
                classification_term_keys,
                species,
                regions,
                manufacturer_id: _,
                active_ingredient_ids,
                regulatory_identifiers,
                target_term_keys,
                vaccine_profile_term_keys,
                life_stage_term_keys,
                therapeutic_scope_term_keys,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, "type", key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, "classification", key),
            )?;
            fields(expected, &entity, "species", species, main.clone())?;
            fields(expected, &entity, "regions", regions, main.clone())?;
            field(
                expected,
                &entity,
                "manufacturerId",
                main.clone(),
                ObligationClass::Relation,
            )?;
            relations(
                expected,
                &entity,
                "activeIngredientIds",
                active_ingredient_ids,
                |_, id| {
                    table_row(
                        DatabaseKind::System,
                        SystemTable::ProductActiveIngredients,
                        format!("{}/{id}", entity.id),
                    )
                },
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.brazilMapa",
                regulatory_identifiers.brazil_mapa.as_ref(),
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesNada",
                regulatory_identifiers.united_states_nada.as_ref(),
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesAnada",
                regulatory_identifiers.united_states_anada.as_ref(),
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.gtinEan",
                regulatory_identifiers.gtin_ean.as_ref(),
                main.clone(),
            )?;
            optional_relations(
                expected,
                &entity,
                "targetTermKeys",
                target_term_keys.as_deref(),
                SystemTable::ProductTargets,
            )?;
            optional_relations(
                expected,
                &entity,
                "vaccineProfileTermKeys",
                vaccine_profile_term_keys.as_deref(),
                SystemTable::ProductVaccineProfiles,
            )?;
            optional_relations(
                expected,
                &entity,
                "lifeStageTermKeys",
                life_stage_term_keys.as_deref(),
                SystemTable::ProductLifeStages,
            )?;
            optional_relations(
                expected,
                &entity,
                "therapeuticScopeTermKeys",
                therapeutic_scope_term_keys.as_deref(),
                SystemTable::ProductTherapeuticScopes,
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Manufacturer(value) => {
            let crate::source::ManufacturerEntity {
                schema_version: _,
                id: _,
                type_term_key,
                classification_term_keys,
                regions,
                website,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, "type", key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, "classification", key),
            )?;
            fields(expected, &entity, "regions", regions, main.clone())?;
            optional_fields(expected, &entity, "website", website.as_ref(), main.clone())?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::ActiveIngredient(value) => {
            let crate::source::ActiveIngredientEntity {
                schema_version: _,
                id: _,
                type_term_key,
                classification_term_keys,
                regions,
                nomenclature,
                atc_vet_code,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, "type", key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, "classification", key),
            )?;
            fields(expected, &entity, "regions", regions, main.clone())?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.scientificName",
                nomenclature.scientific_name.as_ref(),
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.casNumber",
                nomenclature.cas_number.as_ref(),
                main.clone(),
            )?;
            fields(
                expected,
                &entity,
                "nomenclature.denominationStandards",
                &nomenclature.denomination_standards,
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "atcVetCode",
                atc_vet_code.as_ref(),
                main.clone(),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Condition(value) => {
            let crate::source::ConditionEntity {
                schema_version: _,
                id: _,
                type_term_key,
                classification_term_keys,
                regions,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "typeTermKey",
                std::slice::from_ref(type_term_key),
                |_, key| taxonomy_row(&entity, "type", key),
            )?;
            relations(
                expected,
                &entity,
                "classificationTermKeys",
                classification_term_keys,
                |_, key| taxonomy_row(&entity, "classification", key),
            )?;
            fields(expected, &entity, "regions", regions, main.clone())?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Breed(value) => {
            let crate::source::BreedEntity {
                schema_version: _,
                id: _,
                species,
                origin_place_ids,
                size_term_key,
                average_weight_kg,
                average_height_cm,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            common_authoring(
                expected,
                &entity,
                locale,
                sections,
                content_path.as_deref(),
                &main,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            fields(expected, &entity, "species", species, main.clone())?;
            relations(
                expected,
                &entity,
                "originPlaceIds",
                origin_place_ids,
                |_, id| {
                    table_row(
                        DatabaseKind::System,
                        SystemTable::BreedOriginPlaces,
                        format!("{}/{id}", entity.id),
                    )
                },
            )?;
            field(
                expected,
                &entity,
                "sizeTermKey",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            relations(
                expected,
                &entity,
                "sizeTermKey",
                std::slice::from_ref(size_term_key),
                |_, key| taxonomy_row(&entity, "size", key),
            )?;
            for (name, range) in [
                ("averageWeightKg", average_weight_kg),
                ("averageHeightCm", average_height_cm),
            ] {
                for (sex, values) in [("male", range.male), ("female", range.female)] {
                    for index in 0..values.len() {
                        field(
                            expected,
                            &entity,
                            &format!("{name}.{sex}.{index}"),
                            main.clone(),
                            ObligationClass::Authoring,
                        )?;
                    }
                }
            }
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::GeoPlace(value) => {
            let crate::source::GeoPlaceEntity {
                schema_version: _,
                id: _,
                place_type: _,
                country_codes,
                parent_place_id,
                centroid,
                localized_content,
            } = value;
            field(
                expected,
                &entity,
                "schemaVersion",
                metadata_target(locale),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "placeType",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            fields(
                expected,
                &entity,
                "countryCodes",
                country_codes,
                main.clone(),
            )?;
            if parent_place_id.is_some() {
                field(
                    expected,
                    &entity,
                    "parentPlaceId",
                    main.clone(),
                    ObligationClass::Relation,
                )?;
            }
            optional_fields(
                expected,
                &entity,
                "centroid.latitude",
                centroid.latitude.as_ref(),
                main.clone(),
            )?;
            optional_fields(
                expected,
                &entity,
                "centroid.longitude",
                centroid.longitude.as_ref(),
                main.clone(),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
        }
        CanonicalEntity::TreatmentProtocol(value) => {
            let crate::source::TreatmentProtocolEntity {
                schema_version: _,
                id: _,
                kind: _,
                species,
                product_ids,
                doses,
                localized_content,
            } = value;
            field(
                expected,
                &entity,
                "schemaVersion",
                metadata_target(locale),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "kind",
                main.clone(),
                ObligationClass::Authoring,
            )?;
            fields(expected, &entity, "species", species, main.clone())?;
            relations(expected, &entity, "productIds", product_ids, |_, id| {
                table_row(
                    DatabaseKind::System,
                    SystemTable::TreatmentProtocolItems,
                    format!("{}/{id}", entity.id),
                )
            })?;
            for (position, dose) in doses.iter().enumerate() {
                let row = table_row(
                    DatabaseKind::System,
                    SystemTable::TreatmentProtocolDoses,
                    format!("{}/{}", entity.id, dose.id),
                );
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.id"),
                    row.clone(),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityValue"),
                    row.clone(),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityUnit"),
                    row.clone(),
                    ObligationClass::Authoring,
                )?;
                localized_with_prefix(
                    expected,
                    &entity,
                    &dose.localized_content,
                    locale,
                    row,
                    &format!("doses.{position}.localizedContent"),
                )?;
            }
            localized(expected, &entity, localized_content, locale, main.clone())?;
        }
        CanonicalEntity::Taxonomy(value) => {
            let crate::source::TaxonomyEntity {
                schema_version: _,
                id: _,
                domain: _,
                purpose,
                terms,
            } = value;
            field(
                expected,
                &entity,
                "schemaVersion",
                metadata_target(locale),
                ObligationClass::Authoring,
            )?;
            for name in ["id", "domain", "purpose"] {
                field(
                    expected,
                    &entity,
                    name,
                    main.clone(),
                    ObligationClass::Authoring,
                )?;
            }
            let table = semantic_term_table(purpose);
            for (position, term) in terms.iter().enumerate() {
                let row = table_row(
                    DatabaseKind::System,
                    table,
                    format!("{}/{}", entity.id, term.key),
                );
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.key"),
                    row.clone(),
                    ObligationClass::Authoring,
                )?;
                if term.parent_key.is_some() {
                    field(
                        expected,
                        &entity,
                        &format!("terms.{position}.parentKey"),
                        row.clone(),
                        ObligationClass::Relation,
                    )?;
                }
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.order"),
                    row.clone(),
                    ObligationClass::Authoring,
                )?;
                localized_with_prefix(
                    expected,
                    &entity,
                    &term.localized_content,
                    locale,
                    row,
                    &format!("terms.{position}.localizedContent"),
                )?;
            }
        }
    }
    for (document_locale, document) in &entry.editorial {
        if *document_locale != locale {
            continue;
        }
        insert_obligation(
            expected,
            SourceToken::Document {
                entity: entity.clone(),
                locale,
            },
            ProjectionTarget::CompiledDocument {
                entity: entity.clone(),
                locale,
            },
            ObligationClass::LocalizedContent,
        )?;
        for section in &document.sections {
            insert_obligation(
                expected,
                SourceToken::Section {
                    entity: entity.clone(),
                    locale,
                    section_key: section.section_key.clone(),
                },
                ProjectionTarget::CompiledSection {
                    entity: entity.clone(),
                    locale,
                    section_key: section.section_key.clone(),
                },
                ObligationClass::LocalizedContent,
            )?;
        }
    }
    for reference in entry.markdown_media.get(&locale).into_iter().flatten() {
        insert_obligation(
            expected,
            SourceToken::MarkdownMediaReference {
                entity: entity.clone(),
                locale,
                section_key: reference.section_key.clone(),
                occurrence: reference.occurrence,
                media_key: reference.media_key.clone(),
            },
            ProjectionTarget::CompiledSection {
                entity: entity.clone(),
                locale,
                section_key: reference.section_key.clone(),
            },
            ObligationClass::Media,
        )?;
    }
    Ok(())
}

fn common_authoring(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    sections: &[crate::source::SectionDeclaration],
    content_path: Option<&str>,
    main: &ProjectionTarget,
) -> Result<(), String> {
    field(
        expected,
        entity,
        "schemaVersion",
        metadata_target(locale),
        ObligationClass::Authoring,
    )?;
    if sections.is_empty() {
        field(
            expected,
            entity,
            "sections",
            main.clone(),
            ObligationClass::Authoring,
        )?;
    }
    for section in sections {
        let target = ProjectionTarget::CompiledSection {
            entity: entity.clone(),
            locale,
            section_key: section.section_key.clone(),
        };
        field(
            expected,
            entity,
            &format!("sections.{}.sectionKey", section.section_number),
            target.clone(),
            ObligationClass::Authoring,
        )?;
        field(
            expected,
            entity,
            &format!("sections.{}.sectionNumber", section.section_number),
            target,
            ObligationClass::Authoring,
        )?;
    }
    if content_path.is_some() {
        field(
            expected,
            entity,
            "contentPath",
            ProjectionTarget::CompiledDocument {
                entity: entity.clone(),
                locale,
            },
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

fn structural_media(
    expected: &mut BTreeSet<ProjectionObligation>,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
    media: Option<&StructuralMedia>,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    if media.is_none() {
        return Ok(());
    }
    for reference in &entry.structural_media {
        let row = format!(
            "{}/{}/{}/{}",
            entity.entity_type, entity.id, reference.role, reference.sort_order
        );
        insert_obligation(
            expected,
            SourceToken::StructuralMediaReference {
                entity: entity.clone(),
                locale,
                role: reference.role.to_string(),
                sort_order: reference.sort_order,
                media_key: reference.media_key.clone(),
            },
            table_row(
                DatabaseKind::System,
                SystemTable::EntityMediaReferences,
                row,
            ),
            ObligationClass::Media,
        )?;
    }
    Ok(())
}

fn localized(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: ProjectionTarget,
) -> Result<(), String> {
    localized_with_prefix(
        expected,
        entity,
        content,
        locale,
        target,
        "localizedContent",
    )
}

fn localized_with_prefix(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: ProjectionTarget,
    prefix: &str,
) -> Result<(), String> {
    for (field_name, value) in content {
        let values = value.values(locale);
        if values.is_empty() {
            insert_obligation(
                expected,
                SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: format!("{prefix}.{field_name}"),
                    locale,
                    position: 0,
                },
                target.clone(),
                ObligationClass::LocalizedContent,
            )?;
        } else {
            for position in 0..values.len() {
                insert_obligation(
                    expected,
                    SourceToken::LocalizedValue {
                        entity: entity.clone(),
                        field: format!("{prefix}.{field_name}"),
                        locale,
                        position,
                    },
                    target.clone(),
                    ObligationClass::LocalizedContent,
                )?;
            }
        }
    }
    Ok(())
}

fn field(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    path: &str,
    target: ProjectionTarget,
    class: ObligationClass,
) -> Result<(), String> {
    insert_obligation(
        expected,
        SourceToken::Field {
            entity: entity.clone(),
            path: path.to_string(),
        },
        target,
        class,
    )
}

fn fields<T>(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    path: &str,
    values: &[T],
    target: ProjectionTarget,
) -> Result<(), String> {
    if values.is_empty() {
        return field(expected, entity, path, target, ObligationClass::Authoring);
    }
    for index in 0..values.len() {
        field(
            expected,
            entity,
            &format!("{path}.{index}"),
            target.clone(),
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

fn optional_fields<T>(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    path: &str,
    value: Option<&T>,
    target: ProjectionTarget,
) -> Result<(), String> {
    if value.is_some() {
        field(expected, entity, path, target, ObligationClass::Authoring)?;
    }
    Ok(())
}

fn relations<F>(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    field_name: &str,
    values: &[String],
    mut target: F,
) -> Result<(), String>
where
    F: FnMut(usize, &str) -> ProjectionTarget,
{
    if values.is_empty() {
        return Ok(());
    }
    for (position, related) in values.iter().enumerate() {
        insert_obligation(
            expected,
            SourceToken::Relation {
                entity: entity.clone(),
                field: field_name.to_string(),
                position,
                related: related.clone(),
            },
            target(position, related),
            ObligationClass::Relation,
        )?;
    }
    Ok(())
}

fn optional_relations(
    expected: &mut BTreeSet<ProjectionObligation>,
    entity: &EntityIdentity,
    field_name: &str,
    values: Option<&[String]>,
    table: SystemTable,
) -> Result<(), String> {
    relations(
        expected,
        entity,
        field_name,
        values.unwrap_or(&[]),
        |_, related| {
            table_row(
                DatabaseKind::System,
                table,
                format!("{}/{related}", entity.id),
            )
        },
    )
}

fn insert_obligation(
    expected: &mut BTreeSet<ProjectionObligation>,
    source: SourceToken,
    target: ProjectionTarget,
    class: ObligationClass,
) -> Result<(), String> {
    let obligation = ProjectionObligation {
        source,
        target,
        class,
    };
    if expected.insert(obligation.clone()) {
        Ok(())
    } else {
        Err(format!(
            "duplicate expected projection obligation {obligation}"
        ))
    }
}

fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
}

fn main_row_target(entity: &CanonicalEntity) -> ProjectionTarget {
    let table = match entity {
        CanonicalEntity::Breed(_) => SystemTable::BreedReferenceItems,
        CanonicalEntity::Product(_) => SystemTable::ProductCatalogItems,
        CanonicalEntity::Manufacturer(_) => SystemTable::ManufacturerCatalogItems,
        CanonicalEntity::ActiveIngredient(_) => SystemTable::ActiveIngredientCatalogItems,
        CanonicalEntity::Condition(_) => SystemTable::ConditionCatalogItems,
        CanonicalEntity::GeoPlace(_) => SystemTable::GeoPlaces,
        CanonicalEntity::Taxonomy(_) => SystemTable::TaxonomyRegistry,
        CanonicalEntity::TreatmentProtocol(_) => SystemTable::TreatmentProtocols,
    };
    table_row(DatabaseKind::System, table, entity.id().to_string())
}

fn table_row(database: DatabaseKind, table: SystemTable, row: String) -> ProjectionTarget {
    ProjectionTarget::TableRow {
        database,
        table,
        row,
    }
}

fn metadata_target(locale: KnowledgeLocale) -> ProjectionTarget {
    ProjectionTarget::BuildMetadata {
        database: DatabaseKind::System,
        locale,
        release: false,
    }
}

fn taxonomy_row(entity: &EntityIdentity, kind: &str, term: &str) -> ProjectionTarget {
    table_row(
        DatabaseKind::System,
        SystemTable::EntityTaxonomyTerms,
        format!("{}/{}/{kind}/{term}", entity.entity_type, entity.id),
    )
}

fn semantic_term_table(purpose: &str) -> SystemTable {
    match purpose {
        "target" => SystemTable::ProductTargetTerms,
        "vaccine_profile" => SystemTable::ProductVaccineProfileTerms,
        "life_stage" => SystemTable::ProductLifeStageTerms,
        "therapeutic_scope" => SystemTable::ProductTherapeuticScopeTerms,
        _ => SystemTable::TaxonomyTerms,
    }
}

fn taxonomy_for<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a TaxonomyEntity, String> {
    source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))
}

fn append_entity_taxonomies(
    values: &mut Vec<(String, String)>,
    source: &ValidatedSource,
    domain: &str,
    type_key: &String,
    classifications: &[String],
    locale: KnowledgeLocale,
) -> Result<(), String> {
    append_taxonomy_values(
        values,
        taxonomy_for(source, domain, "type")?,
        std::slice::from_ref(type_key),
        locale,
        "type",
    )?;
    append_taxonomy_values(
        values,
        taxonomy_for(source, domain, "classification")?,
        classifications,
        locale,
        "classification",
    )
}

fn append_named_relation(
    values: &mut Vec<(String, String)>,
    entity: &CanonicalEntity,
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    let content = entity
        .localized_content()
        .ok_or_else(|| "related entity has no localized content".to_string())?;
    values.push((
        localized_text(content, "name", locale)?.to_string(),
        format!("{prefix}.name"),
    ));
    for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
        values.push((alias, format!("{prefix}.alias")));
    }
    Ok(())
}

fn append_taxonomy_values(
    values: &mut Vec<(String, String)>,
    taxonomy: &TaxonomyEntity,
    keys: &[String],
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    for key in keys {
        let term = taxonomy
            .terms
            .iter()
            .find(|term| &term.key == key)
            .ok_or_else(|| format!("unresolved taxonomy term {key}"))?;
        values.push((
            localized_text(&term.localized_content, "label", locale)?.to_string(),
            format!("{prefix}.label:{key}"),
        ));
        for alias in localized_list(&term.localized_content, "aliases", locale).unwrap_or_default()
        {
            values.push((alias, format!("{prefix}.alias:{key}")));
        }
    }
    Ok(())
}

fn localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Result<&'a str, String> {
    optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))
}

fn optional_localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<&'a str> {
    content.get(field).and_then(|value| value.text(locale))
}

fn localized_list(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<Vec<String>> {
    content.get(field).and_then(|value| match value {
        LocalizedValue::List(value) => Some(value.get(locale).clone()),
        LocalizedValue::Text(_) => None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn obligation(target: ProjectionTarget) -> ProjectionObligation {
        ProjectionObligation {
            source: SourceToken::Entity(EntityIdentity::new("product", "id")),
            target,
            class: ObligationClass::Entity,
        }
    }

    fn ledger() -> ProjectionLedger {
        let target = table_row(
            DatabaseKind::System,
            SystemTable::ProductCatalogItems,
            "id".to_string(),
        );
        ProjectionLedger {
            locale: KnowledgeLocale::EnUs,
            expected: BTreeSet::from([obligation(target)]),
            completed: BTreeSet::new(),
            completed_targets: BTreeSet::new(),
            row_events: Vec::new(),
        }
    }

    #[test]
    fn journal_detects_missing_unexpected_and_duplicate_evidence() {
        assert!(ledger().finish().is_err());
        let target = table_row(
            DatabaseKind::System,
            SystemTable::ProductCatalogItems,
            "id".to_string(),
        );
        let mut complete = ledger();
        let mut journal = complete.journal();
        journal.record_target(target.clone());
        complete.commit(journal).unwrap();
        assert_eq!(complete.finish().unwrap().completed_count(), 1);

        let mut duplicate = ledger();
        let mut first = duplicate.journal();
        first.record_target(target.clone());
        duplicate.commit(first).unwrap();
        let mut second = duplicate.journal();
        second.record_target(target);
        assert!(duplicate.commit(second).is_err());

        let mut unexpected = ledger();
        let mut journal = unexpected.journal();
        journal.record_target(ProjectionTarget::CasObject {
            locale: KnowledgeLocale::EnUs,
            content_hash: "0".repeat(64),
        });
        assert!(unexpected.commit(journal).is_err());
    }

    #[test]
    fn rejected_journal_publishes_no_partial_evidence() {
        let target = table_row(
            DatabaseKind::System,
            SystemTable::ProductCatalogItems,
            "id".to_string(),
        );
        let mut ledger = ledger();
        let mut rejected = ledger.journal();
        rejected.record_target(target.clone());
        rejected.record_target(target.clone());
        assert!(ledger.commit(rejected).is_err());

        let mut valid = ledger.journal();
        valid.record_target(target);
        ledger.commit(valid).unwrap();
        assert_eq!(ledger.finish().unwrap().completed_count(), 1);
    }

    #[test]
    fn row_evidence_is_not_published_until_journal_commit() {
        let mut ledger = ledger();
        let mut rolled_back = ledger.journal();
        rolled_back
            .record_row(
                1,
                DatabaseKind::System,
                SystemTable::ProductCatalogItems,
                "id",
                Some(EntityIdentity::new("product", "id")),
            )
            .unwrap();
        drop(rolled_back);
        assert!(ledger.clone().finish().is_err());
        let mut committed = ledger.journal();
        committed
            .record_row(
                1,
                DatabaseKind::System,
                SystemTable::ProductCatalogItems,
                "id",
                Some(EntityIdentity::new("product", "id")),
            )
            .unwrap();
        ledger.commit(committed).unwrap();
        assert_eq!(ledger.finish().unwrap().row_event_count(), 1);
    }

    #[test]
    fn row_event_rejects_divergent_insert_count() {
        let mut journal = ProjectionJournal::default();
        assert!(journal
            .record_row(
                0,
                DatabaseKind::System,
                SystemTable::ProductCatalogItems,
                "id",
                None,
            )
            .is_err());
    }

    #[test]
    fn one_source_value_requires_each_concrete_destination() {
        let entity = EntityIdentity::new("product", "id");
        let source = SourceToken::LocalizedValue {
            entity: entity.clone(),
            field: "localizedContent.name".to_string(),
            locale: KnowledgeLocale::EnUs,
            position: 0,
        };
        let row = table_row(
            DatabaseKind::System,
            SystemTable::ProductCatalogItems,
            "id".to_string(),
        );
        let search = ProjectionTarget::SearchTerm {
            entity,
            locale: KnowledgeLocale::EnUs,
            provenance: "entity.name".to_string(),
            occurrence: 0,
        };
        let mut ledger = ProjectionLedger {
            locale: KnowledgeLocale::EnUs,
            expected: BTreeSet::from([
                ProjectionObligation {
                    source: source.clone(),
                    target: row.clone(),
                    class: ObligationClass::LocalizedContent,
                },
                ProjectionObligation {
                    source,
                    target: search,
                    class: ObligationClass::LocalizedContent,
                },
            ]),
            completed: BTreeSet::new(),
            completed_targets: BTreeSet::new(),
            row_events: Vec::new(),
        };
        let mut journal = ledger.journal();
        journal.record_target(row);
        ledger.commit(journal).unwrap();
        assert!(ledger.finish().is_err());
    }

    #[test]
    fn an_asset_does_not_mask_an_omitted_media_reference() {
        let entity = EntityIdentity::new("condition", "id");
        let asset = ProjectionTarget::SystemMediaAsset {
            locale: KnowledgeLocale::EnUs,
            media_key: "condition/id/media/cover.png".to_string(),
        };
        let reference = table_row(
            DatabaseKind::System,
            SystemTable::EntityMediaReferences,
            "condition/id/cover/0".to_string(),
        );
        let mut ledger = ProjectionLedger {
            locale: KnowledgeLocale::EnUs,
            expected: BTreeSet::from([
                ProjectionObligation {
                    source: SourceToken::MediaAsset {
                        locale: KnowledgeLocale::EnUs,
                        media_key: "condition/id/media/cover.png".to_string(),
                    },
                    target: asset.clone(),
                    class: ObligationClass::Media,
                },
                ProjectionObligation {
                    source: SourceToken::StructuralMediaReference {
                        entity,
                        locale: KnowledgeLocale::EnUs,
                        role: "cover".to_string(),
                        sort_order: 0,
                        media_key: "condition/id/media/cover.png".to_string(),
                    },
                    target: reference,
                    class: ObligationClass::Media,
                },
            ]),
            completed: BTreeSet::new(),
            completed_targets: BTreeSet::new(),
            row_events: Vec::new(),
        };
        let mut journal = ledger.journal();
        journal.record_target(asset);
        ledger.commit(journal).unwrap();
        assert!(ledger.finish().is_err());
    }
}
