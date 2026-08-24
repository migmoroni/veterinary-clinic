use crate::{
    databases::DatabaseKind,
    media::sha256_hex,
    source::{
        CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, StructuralMedia,
        TaxonomyEntity,
    },
    validation::{ValidatedEntity, ValidatedSource},
};
use serde::Serialize;
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

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum SystemColumn {
    Id,
    Domain,
    Purpose,
    TaxonomyId,
    TermKey,
    ParentTermKey,
    Label,
    NormalizedLabel,
    AliasesJson,
    SortOrder,
    PlaceType,
    ParentPlaceId,
    CountryCodesJson,
    Latitude,
    Longitude,
    Name,
    NormalizedName,
    SpeciesJson,
    SizeTermKey,
    AverageWeightKgJson,
    AverageHeightCmJson,
    ContentJson,
    BreedId,
    PlaceId,
    TypeTermKey,
    RegionsJson,
    Website,
    NomenclatureJson,
    AtcVetCode,
    AtcVetSystem,
    DenominationsJson,
    ManufacturerId,
    RegulatoryIdentifiersJson,
    CommercialLine,
    PresentationDosage,
    TargetSpeciesWarningsJson,
    EntityType,
    EntityId,
    RelationKind,
    ProductId,
    ActiveIngredientId,
    Kind,
    Observation,
    ProtocolId,
    DoseId,
    ValidityValue,
    ValidityUnit,
    Value,
    NormalizedValue,
    Provenance,
    Role,
    MediaKey,
}

impl SystemColumn {
    #[cfg(test)]
    pub(crate) const ALL: [Self; 52] = [
        Self::Id,
        Self::Domain,
        Self::Purpose,
        Self::TaxonomyId,
        Self::TermKey,
        Self::ParentTermKey,
        Self::Label,
        Self::NormalizedLabel,
        Self::AliasesJson,
        Self::SortOrder,
        Self::PlaceType,
        Self::ParentPlaceId,
        Self::CountryCodesJson,
        Self::Latitude,
        Self::Longitude,
        Self::Name,
        Self::NormalizedName,
        Self::SpeciesJson,
        Self::SizeTermKey,
        Self::AverageWeightKgJson,
        Self::AverageHeightCmJson,
        Self::ContentJson,
        Self::BreedId,
        Self::PlaceId,
        Self::TypeTermKey,
        Self::RegionsJson,
        Self::Website,
        Self::NomenclatureJson,
        Self::AtcVetCode,
        Self::AtcVetSystem,
        Self::DenominationsJson,
        Self::ManufacturerId,
        Self::RegulatoryIdentifiersJson,
        Self::CommercialLine,
        Self::PresentationDosage,
        Self::TargetSpeciesWarningsJson,
        Self::EntityType,
        Self::EntityId,
        Self::RelationKind,
        Self::ProductId,
        Self::ActiveIngredientId,
        Self::Kind,
        Self::Observation,
        Self::ProtocolId,
        Self::DoseId,
        Self::ValidityValue,
        Self::ValidityUnit,
        Self::Value,
        Self::NormalizedValue,
        Self::Provenance,
        Self::Role,
        Self::MediaKey,
    ];

    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Id => "id",
            Self::Domain => "domain",
            Self::Purpose => "purpose",
            Self::TaxonomyId => "taxonomy_id",
            Self::TermKey => "term_key",
            Self::ParentTermKey => "parent_term_key",
            Self::Label => "label",
            Self::NormalizedLabel => "normalized_label",
            Self::AliasesJson => "aliases_json",
            Self::SortOrder => "sort_order",
            Self::PlaceType => "place_type",
            Self::ParentPlaceId => "parent_place_id",
            Self::CountryCodesJson => "country_codes_json",
            Self::Latitude => "latitude",
            Self::Longitude => "longitude",
            Self::Name => "name",
            Self::NormalizedName => "normalized_name",
            Self::SpeciesJson => "species_json",
            Self::SizeTermKey => "size_term_key",
            Self::AverageWeightKgJson => "average_weight_kg_json",
            Self::AverageHeightCmJson => "average_height_cm_json",
            Self::ContentJson => "content_json",
            Self::BreedId => "breed_id",
            Self::PlaceId => "place_id",
            Self::TypeTermKey => "type_term_key",
            Self::RegionsJson => "regions_json",
            Self::Website => "website",
            Self::NomenclatureJson => "nomenclature_json",
            Self::AtcVetCode => "atc_vet_code",
            Self::AtcVetSystem => "atc_vet_system",
            Self::DenominationsJson => "denominations_json",
            Self::ManufacturerId => "manufacturer_id",
            Self::RegulatoryIdentifiersJson => "regulatory_identifiers_json",
            Self::CommercialLine => "commercial_line",
            Self::PresentationDosage => "presentation_dosage",
            Self::TargetSpeciesWarningsJson => "target_species_warnings_json",
            Self::EntityType => "entity_type",
            Self::EntityId => "entity_id",
            Self::RelationKind => "relation_kind",
            Self::ProductId => "product_id",
            Self::ActiveIngredientId => "active_ingredient_id",
            Self::Kind => "kind",
            Self::Observation => "observation",
            Self::ProtocolId => "protocol_id",
            Self::DoseId => "dose_id",
            Self::ValidityValue => "validity_value",
            Self::ValidityUnit => "validity_unit",
            Self::Value => "value",
            Self::NormalizedValue => "normalized_value",
            Self::Provenance => "provenance",
            Self::Role => "role",
            Self::MediaKey => "media_key",
        }
    }
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum CompilationOperationId {
    CanonicalValidation {
        entity: EntityIdentity,
        validation: &'static str,
    },
    Document {
        entity: EntityIdentity,
    },
    Section {
        entity: EntityIdentity,
        section_key: String,
    },
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum ProjectionOperationId {
    Compilation(CompilationOperationId),
    Metadata {
        database: DatabaseKind,
        release: bool,
    },
    SystemRow {
        table: SystemTable,
        row: String,
    },
    SystemMediaAsset {
        media_key: String,
    },
    CasObject {
        content_hash: String,
    },
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
    CanonicalValidation {
        entity: EntityIdentity,
        locale: KnowledgeLocale,
        validation: &'static str,
    },
    TableRow {
        database: DatabaseKind,
        table: SystemTable,
        row: String,
    },
    TableColumn {
        database: DatabaseKind,
        table: SystemTable,
        row: String,
        column: SystemColumn,
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

#[derive(Clone, Debug)]
struct OperationDisposition {
    owner: ProjectionOperationId,
    target: ProjectionTarget,
}

impl OperationDisposition {
    fn column(&self, column: SystemColumn) -> Self {
        let ProjectionTarget::TableRow {
            database,
            table,
            row,
        } = &self.target
        else {
            panic!("only a SQLite row disposition can select a column");
        };
        Self {
            owner: self.owner.clone(),
            target: ProjectionTarget::TableColumn {
                database: *database,
                table: *table,
                row: row.clone(),
                column,
            },
        }
    }
}

#[derive(Clone, Debug, Default)]
pub(crate) struct ObligationOwnership {
    by_owner: BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>,
    expected: BTreeSet<ProjectionObligation>,
}

impl ObligationOwnership {
    pub(crate) fn claim(
        &mut self,
        owner: &ProjectionOperationId,
    ) -> Result<BTreeSet<ProjectionObligation>, String> {
        self.by_owner
            .remove(owner)
            .ok_or_else(|| format!("operation has no declared obligation owner: {owner:?}"))
    }

    pub(crate) fn expected(&self) -> BTreeSet<ProjectionObligation> {
        self.expected.clone()
    }

    pub(crate) fn finish(self) -> Result<(), String> {
        if self.by_owner.is_empty() {
            Ok(())
        } else {
            Err(format!(
                "{} projection owner(s) have no operation",
                self.by_owner.len()
            ))
        }
    }

    fn insert(
        &mut self,
        disposition: OperationDisposition,
        source: SourceToken,
        class: ObligationClass,
    ) -> Result<(), String> {
        let obligation = ProjectionObligation {
            source,
            target: disposition.target,
            class,
        };
        if !self.expected.insert(obligation.clone()) {
            return Err(format!(
                "projection obligation is declared more than once: {obligation}"
            ));
        }
        self.by_owner
            .entry(disposition.owner)
            .or_default()
            .insert(obligation);
        Ok(())
    }
}

pub(crate) fn owned_obligations(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    release: bool,
) -> Result<ObligationOwnership, String> {
    let mut expected = ObligationOwnership::default();
    for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
        insert_obligation(
            &mut expected,
            OperationDisposition {
                owner: ProjectionOperationId::Metadata {
                    database,
                    release: false,
                },
                target: ProjectionTarget::BuildMetadata {
                    database,
                    locale,
                    release: false,
                },
            },
            SourceToken::BuildMetadata {
                database,
                locale,
                release: false,
            },
            ObligationClass::Metadata,
        )?;
        if release {
            insert_obligation(
                &mut expected,
                OperationDisposition {
                    owner: ProjectionOperationId::Metadata {
                        database,
                        release: true,
                    },
                    target: ProjectionTarget::BuildMetadata {
                        database,
                        locale,
                        release: true,
                    },
                },
                SourceToken::BuildMetadata {
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
        let class = if matches!(candidate.source, SourceToken::LocalizedValue { .. }) {
            ObligationClass::LocalizedContent
        } else {
            ObligationClass::Authoring
        };
        insert_obligation(
            &mut expected,
            operation_disposition(
                ProjectionOperationId::SystemRow {
                    table: SystemTable::EntitySearchTerms,
                    row: format!("{}/{}", candidate.entity, candidate.occurrence),
                },
                ProjectionTarget::SearchTerm {
                    entity: candidate.entity.clone(),
                    locale,
                    provenance: candidate.provenance.clone(),
                    occurrence: candidate.occurrence,
                },
            ),
            candidate.source,
            class,
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
            OperationDisposition {
                owner: ProjectionOperationId::SystemMediaAsset {
                    media_key: media_key.clone(),
                },
                target: ProjectionTarget::SystemMediaAsset {
                    locale,
                    media_key: media_key.clone(),
                },
            },
            SourceToken::MediaAsset {
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
            OperationDisposition {
                owner: ProjectionOperationId::CasObject {
                    content_hash: content_hash.clone(),
                },
                target: ProjectionTarget::CasObject {
                    locale,
                    content_hash: content_hash.clone(),
                },
            },
            SourceToken::CasObject {
                locale,
                content_hash: content_hash.clone(),
            },
            ObligationClass::Cas,
        )?;
    }
    Ok(expected)
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
    expected: &mut ObligationOwnership,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    let main = main_row_target(&entry.source.entity);
    insert_obligation(
        expected,
        main.clone(),
        SourceToken::Entity(entity.clone()),
        ObligationClass::Entity,
    )?;
    field(
        expected,
        &entity,
        "entityType",
        canonical_validation_target(&entity, locale, "entity_type"),
        ObligationClass::Authoring,
    )?;
    match &entry.source.entity {
        CanonicalEntity::Product(value) => {
            let crate::source::ProductEntity {
                schema_version,
                id,
                type_term_key,
                classification_term_keys,
                species,
                regions,
                manufacturer_id,
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
            let _ = (schema_version, id, manufacturer_id);
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
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.column(SystemColumn::TypeTermKey),
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
            fields(
                expected,
                &entity,
                "species",
                species,
                main.column(SystemColumn::SpeciesJson),
            )?;
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            field(
                expected,
                &entity,
                "manufacturerId",
                main.column(SystemColumn::ManufacturerId),
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
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesNada",
                regulatory_identifiers.united_states_nada.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.unitedStatesAnada",
                regulatory_identifiers.united_states_anada.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "regulatoryIdentifiers.gtinEan",
                regulatory_identifiers.gtin_ean.as_ref(),
                main.column(SystemColumn::RegulatoryIdentifiersJson),
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
                schema_version,
                id,
                type_term_key,
                classification_term_keys,
                regions,
                website,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            let _ = (schema_version, id);
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
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.column(SystemColumn::TypeTermKey),
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
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "website",
                website.as_ref(),
                main.column(SystemColumn::Website),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::ActiveIngredient(value) => {
            let crate::source::ActiveIngredientEntity {
                schema_version,
                id,
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
            let _ = (schema_version, id);
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
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.column(SystemColumn::TypeTermKey),
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
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.scientificName",
                nomenclature.scientific_name.as_ref(),
                main.column(SystemColumn::NomenclatureJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "nomenclature.casNumber",
                nomenclature.cas_number.as_ref(),
                main.column(SystemColumn::NomenclatureJson),
            )?;
            fields(
                expected,
                &entity,
                "nomenclature.denominationStandards",
                &nomenclature.denomination_standards,
                main.column(SystemColumn::NomenclatureJson),
            )?;
            optional_fields(
                expected,
                &entity,
                "atcVetCode",
                atc_vet_code.as_ref(),
                main.column(SystemColumn::AtcVetCode),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Condition(value) => {
            let crate::source::ConditionEntity {
                schema_version,
                id,
                type_term_key,
                classification_term_keys,
                regions,
                localized_content,
                sections,
                content_path,
                media,
            } = value;
            let _ = (schema_version, id);
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
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "typeTermKey",
                main.column(SystemColumn::TypeTermKey),
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
            fields(
                expected,
                &entity,
                "regions",
                regions,
                main.column(SystemColumn::RegionsJson),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
            structural_media(expected, entry, locale, media.as_ref())?;
        }
        CanonicalEntity::Breed(value) => {
            let crate::source::BreedEntity {
                schema_version,
                id,
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
            let _ = (schema_version, id);
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
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            fields(
                expected,
                &entity,
                "species",
                species,
                main.column(SystemColumn::SpeciesJson),
            )?;
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
                main.column(SystemColumn::SizeTermKey),
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
                            main.column(match name {
                                "averageWeightKg" => SystemColumn::AverageWeightKgJson,
                                "averageHeightCm" => SystemColumn::AverageHeightCmJson,
                                _ => unreachable!(),
                            }),
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
                schema_version,
                id,
                place_type,
                country_codes,
                parent_place_id,
                centroid,
                localized_content,
            } = value;
            let _ = (schema_version, id, place_type);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "placeType",
                main.column(SystemColumn::PlaceType),
                ObligationClass::Authoring,
            )?;
            fields(
                expected,
                &entity,
                "countryCodes",
                country_codes,
                main.column(SystemColumn::CountryCodesJson),
            )?;
            if parent_place_id.is_some() {
                field(
                    expected,
                    &entity,
                    "parentPlaceId",
                    main.column(SystemColumn::ParentPlaceId),
                    ObligationClass::Relation,
                )?;
            }
            optional_fields(
                expected,
                &entity,
                "centroid.latitude",
                centroid.latitude.as_ref(),
                main.column(SystemColumn::Latitude),
            )?;
            optional_fields(
                expected,
                &entity,
                "centroid.longitude",
                centroid.longitude.as_ref(),
                main.column(SystemColumn::Longitude),
            )?;
            localized(expected, &entity, localized_content, locale, main.clone())?;
        }
        CanonicalEntity::TreatmentProtocol(value) => {
            let crate::source::TreatmentProtocolEntity {
                schema_version,
                id,
                kind,
                species,
                product_ids,
                doses,
                localized_content,
            } = value;
            let _ = (schema_version, id, kind);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "kind",
                main.column(SystemColumn::Kind),
                ObligationClass::Authoring,
            )?;
            fields(
                expected,
                &entity,
                "species",
                species,
                main.column(SystemColumn::SpeciesJson),
            )?;
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
                    row.column(SystemColumn::DoseId),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityValue"),
                    row.column(SystemColumn::ValidityValue),
                    ObligationClass::Authoring,
                )?;
                field(
                    expected,
                    &entity,
                    &format!("doses.{position}.validityUnit"),
                    row.column(SystemColumn::ValidityUnit),
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
                schema_version,
                id,
                domain,
                purpose,
                terms,
            } = value;
            let _ = (schema_version, id, domain);
            field(
                expected,
                &entity,
                "schemaVersion",
                canonical_validation_target(&entity, locale, "schema_version"),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "id",
                main.column(SystemColumn::Id),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "domain",
                main.column(SystemColumn::Domain),
                ObligationClass::Authoring,
            )?;
            field(
                expected,
                &entity,
                "purpose",
                main.column(SystemColumn::Purpose),
                ObligationClass::Authoring,
            )?;
            let table = semantic_term_table(purpose);
            for (position, term) in terms.iter().enumerate() {
                let row_id = if table == SystemTable::TaxonomyTerms {
                    format!("{}/{}", entity.id, term.key)
                } else {
                    term.key.clone()
                };
                let row = table_row(DatabaseKind::System, table, row_id);
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.key"),
                    row.column(SystemColumn::TermKey),
                    ObligationClass::Authoring,
                )?;
                if term.parent_key.is_some() {
                    field(
                        expected,
                        &entity,
                        &format!("terms.{position}.parentKey"),
                        row.column(SystemColumn::ParentTermKey),
                        ObligationClass::Relation,
                    )?;
                }
                field(
                    expected,
                    &entity,
                    &format!("terms.{position}.order"),
                    row.column(SystemColumn::SortOrder),
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
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Document {
                    entity: entity.clone(),
                }),
                target: ProjectionTarget::CompiledDocument {
                    entity: entity.clone(),
                    locale,
                },
            },
            SourceToken::Document {
                entity: entity.clone(),
                locale,
            },
            ObligationClass::Authoring,
        )?;
        for section in &document.sections {
            insert_obligation(
                expected,
                OperationDisposition {
                    owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                        entity: entity.clone(),
                        section_key: section.section_key.clone(),
                    }),
                    target: ProjectionTarget::CompiledSection {
                        entity: entity.clone(),
                        locale,
                        section_key: section.section_key.clone(),
                    },
                },
                SourceToken::Section {
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
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                    entity: entity.clone(),
                    section_key: reference.section_key.clone(),
                }),
                target: ProjectionTarget::CompiledSection {
                    entity: entity.clone(),
                    locale,
                    section_key: reference.section_key.clone(),
                },
            },
            SourceToken::MarkdownMediaReference {
                entity: entity.clone(),
                locale,
                section_key: reference.section_key.clone(),
                occurrence: reference.occurrence,
                media_key: reference.media_key.clone(),
            },
            ObligationClass::Media,
        )?;
    }
    Ok(())
}

fn common_authoring(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    sections: &[crate::source::SectionDeclaration],
    content_path: Option<&str>,
    main: &OperationDisposition,
) -> Result<(), String> {
    field(
        expected,
        entity,
        "schemaVersion",
        canonical_validation_target(entity, locale, "schema_version"),
        ObligationClass::Authoring,
    )?;
    if sections.is_empty() {
        field(
            expected,
            entity,
            "sections",
            main.column(SystemColumn::ContentJson),
            ObligationClass::Authoring,
        )?;
    }
    for section in sections {
        let crate::source::SectionDeclaration {
            section_key,
            section_number,
        } = section;
        let target = OperationDisposition {
            owner: ProjectionOperationId::Compilation(CompilationOperationId::Section {
                entity: entity.clone(),
                section_key: section_key.clone(),
            }),
            target: ProjectionTarget::CompiledSection {
                entity: entity.clone(),
                locale,
                section_key: section_key.clone(),
            },
        };
        field(
            expected,
            entity,
            &format!("sections.{section_number}.sectionKey"),
            target.clone(),
            ObligationClass::Authoring,
        )?;
        field(
            expected,
            entity,
            &format!("sections.{section_number}.sectionNumber"),
            target,
            ObligationClass::Authoring,
        )?;
    }
    if content_path.is_some() {
        field(
            expected,
            entity,
            "contentPath",
            OperationDisposition {
                owner: ProjectionOperationId::Compilation(CompilationOperationId::Document {
                    entity: entity.clone(),
                }),
                target: ProjectionTarget::CompiledDocument {
                    entity: entity.clone(),
                    locale,
                },
            },
            ObligationClass::Authoring,
        )?;
    }
    Ok(())
}

fn structural_media(
    expected: &mut ObligationOwnership,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
    media: Option<&StructuralMedia>,
) -> Result<(), String> {
    let entity = identity(&entry.source.entity);
    let Some(media) = media else {
        return Ok(());
    };
    let StructuralMedia { cover, gallery } = media;
    let _ = (cover, gallery);
    for reference in &entry.structural_media {
        let row = format!(
            "{}/{}/{}/{}",
            entity.entity_type, entity.id, reference.role, reference.sort_order
        );
        insert_obligation(
            expected,
            table_row(
                DatabaseKind::System,
                SystemTable::EntityMediaReferences,
                row,
            ),
            SourceToken::StructuralMediaReference {
                entity: entity.clone(),
                locale,
                role: reference.role.to_string(),
                sort_order: reference.sort_order,
                media_key: reference.media_key.clone(),
            },
            ObligationClass::Media,
        )?;
    }
    Ok(())
}

fn localized(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
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
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    content: &LocalizedContent,
    locale: KnowledgeLocale,
    target: OperationDisposition,
    prefix: &str,
) -> Result<(), String> {
    for (field_name, value) in content {
        let values = value.values(locale);
        let localized_path = format!("{prefix}.{field_name}");
        let target = target.column(localized_column(entity, prefix, field_name)?);
        if values.is_empty() {
            field(
                expected,
                entity,
                &localized_path,
                target.clone(),
                ObligationClass::Authoring,
            )?;
        }
        for position in 0..values.len() {
            insert_obligation(
                expected,
                target.clone(),
                SourceToken::LocalizedValue {
                    entity: entity.clone(),
                    field: localized_path.clone(),
                    locale,
                    position,
                },
                ObligationClass::LocalizedContent,
            )?;
        }
    }
    Ok(())
}

fn localized_column(
    entity: &EntityIdentity,
    prefix: &str,
    field: &str,
) -> Result<SystemColumn, String> {
    let column = if prefix.starts_with("terms.") {
        match field {
            "label" => SystemColumn::Label,
            "aliases" => SystemColumn::AliasesJson,
            _ => {
                return Err(format!(
                    "localized taxonomy field has no policy: {prefix}.{field}"
                ))
            }
        }
    } else if prefix.starts_with("doses.") {
        match field {
            "label" => SystemColumn::Label,
            _ => {
                return Err(format!(
                    "localized dose field has no policy: {prefix}.{field}"
                ))
            }
        }
    } else {
        match (entity.entity_type.as_str(), field) {
            ("product", "name")
            | ("manufacturer", "name")
            | ("active_ingredient", "name")
            | ("condition", "name")
            | ("breed", "name")
            | ("geo_place", "name")
            | ("treatment_protocol", "name") => SystemColumn::Name,
            ("product", "aliases")
            | ("manufacturer", "aliases")
            | ("active_ingredient", "aliases")
            | ("condition", "aliases")
            | ("breed", "aliases")
            | ("geo_place", "aliases") => SystemColumn::AliasesJson,
            ("product", "commercialLine") => SystemColumn::CommercialLine,
            ("product", "presentationDosage") => SystemColumn::PresentationDosage,
            ("product", "targetSpeciesWarnings") => SystemColumn::TargetSpeciesWarningsJson,
            ("active_ingredient", "atcVetSystem") => SystemColumn::AtcVetSystem,
            ("active_ingredient", denomination) if denomination.starts_with("denomination_") => {
                SystemColumn::DenominationsJson
            }
            ("treatment_protocol", "observation") => SystemColumn::Observation,
            _ => {
                return Err(format!(
                    "localized field has no projection policy: {}.{prefix}.{field}",
                    entity.entity_type
                ));
            }
        }
    };
    Ok(column)
}

fn field(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    target: OperationDisposition,
    class: ObligationClass,
) -> Result<(), String> {
    insert_obligation(
        expected,
        target,
        SourceToken::Field {
            entity: entity.clone(),
            path: path.to_string(),
        },
        class,
    )
}

fn fields<T>(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    values: &[T],
    target: OperationDisposition,
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
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    path: &str,
    value: Option<&T>,
    target: OperationDisposition,
) -> Result<(), String> {
    if value.is_some() {
        field(expected, entity, path, target, ObligationClass::Authoring)?;
    }
    Ok(())
}

fn relations<F>(
    expected: &mut ObligationOwnership,
    entity: &EntityIdentity,
    field_name: &str,
    values: &[String],
    mut target: F,
) -> Result<(), String>
where
    F: FnMut(usize, &str) -> OperationDisposition,
{
    if values.is_empty() {
        return Ok(());
    }
    for (position, related) in values.iter().enumerate() {
        insert_obligation(
            expected,
            target(position, related),
            SourceToken::Relation {
                entity: entity.clone(),
                field: field_name.to_string(),
                position,
                related: related.clone(),
            },
            ObligationClass::Relation,
        )?;
    }
    Ok(())
}

fn optional_relations(
    expected: &mut ObligationOwnership,
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
    expected: &mut ObligationOwnership,
    disposition: OperationDisposition,
    source: SourceToken,
    class: ObligationClass,
) -> Result<(), String> {
    expected.insert(disposition, source, class)
}

fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
}

fn main_row_target(entity: &CanonicalEntity) -> OperationDisposition {
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

fn table_row(database: DatabaseKind, table: SystemTable, row: String) -> OperationDisposition {
    OperationDisposition {
        owner: ProjectionOperationId::SystemRow {
            table,
            row: row.clone(),
        },
        target: ProjectionTarget::TableRow {
            database,
            table,
            row,
        },
    }
}

fn operation_disposition(
    owner: ProjectionOperationId,
    target: ProjectionTarget,
) -> OperationDisposition {
    OperationDisposition { owner, target }
}

fn canonical_validation_target(
    entity: &EntityIdentity,
    locale: KnowledgeLocale,
    validation: &'static str,
) -> OperationDisposition {
    OperationDisposition {
        owner: ProjectionOperationId::Compilation(CompilationOperationId::CanonicalValidation {
            entity: entity.clone(),
            validation,
        }),
        target: ProjectionTarget::CanonicalValidation {
            entity: entity.clone(),
            locale,
            validation,
        },
    }
}

fn taxonomy_row(entity: &EntityIdentity, kind: &str, term: &str) -> OperationDisposition {
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
}
