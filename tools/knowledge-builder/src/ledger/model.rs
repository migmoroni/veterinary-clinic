//! Defines the closed identities, operation IDs, source tokens, projection targets,
//! SQLite tables and columns shared by the ledger subsystems.

use crate::{contracts::locale::KnowledgeLocale, databases::DatabaseKind};
use std::fmt;

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
    GeoPlaces,
    LifeReferenceItems,
    LifeOriginPlaces,
    ManufacturerCatalogItems,
    ActiveIngredientCatalogItems,
    ConditionCatalogItems,
    ProductCatalogItems,
    EntityTaxonomyTerms,
    ProductActiveIngredients,
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
    DomainId,
    KingdomId,
    PhylumId,
    ClassId,
    OrderId,
    FamilyId,
    GenusId,
    SpeciesId,
    BreedId,
    VarietyId,
    SizeTermKey,
    StageMetricsJson,
    ApplicableTaxonIdsJson,
    ContentJson,
    LifeId,
    PlaceId,
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
    pub(crate) const ALL: [Self; 59] = [
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
        Self::DomainId,
        Self::KingdomId,
        Self::PhylumId,
        Self::ClassId,
        Self::OrderId,
        Self::FamilyId,
        Self::GenusId,
        Self::SpeciesId,
        Self::BreedId,
        Self::VarietyId,
        Self::SizeTermKey,
        Self::StageMetricsJson,
        Self::ApplicableTaxonIdsJson,
        Self::ContentJson,
        Self::LifeId,
        Self::PlaceId,
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
            Self::DomainId => "domain_id",
            Self::KingdomId => "kingdom_id",
            Self::PhylumId => "phylum_id",
            Self::ClassId => "class_id",
            Self::OrderId => "order_id",
            Self::FamilyId => "family_id",
            Self::GenusId => "genus_id",
            Self::SpeciesId => "species_id",
            Self::BreedId => "breed_id",
            Self::VarietyId => "variety_id",
            Self::SizeTermKey => "size_term_key",
            Self::StageMetricsJson => "stage_metrics_json",
            Self::ApplicableTaxonIdsJson => "applicable_taxon_ids_json",
            Self::ContentJson => "content_json",
            Self::LifeId => "life_id",
            Self::PlaceId => "place_id",
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
    pub(crate) const SYSTEM_PROJECTABLE: [Self; 16] = [
        Self::TaxonomyRegistry,
        Self::TaxonomyTerms,
        Self::GeoPlaces,
        Self::LifeReferenceItems,
        Self::LifeOriginPlaces,
        Self::ManufacturerCatalogItems,
        Self::ActiveIngredientCatalogItems,
        Self::ConditionCatalogItems,
        Self::ProductCatalogItems,
        Self::EntityTaxonomyTerms,
        Self::ProductActiveIngredients,
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
            Self::GeoPlaces => "geo_places",
            Self::LifeReferenceItems => "life_reference_items",
            Self::LifeOriginPlaces => "life_origin_places",
            Self::ManufacturerCatalogItems => "manufacturer_catalog_items",
            Self::ActiveIngredientCatalogItems => "active_ingredient_catalog_items",
            Self::ConditionCatalogItems => "condition_catalog_items",
            Self::ProductCatalogItems => "product_catalog_items",
            Self::EntityTaxonomyTerms => "entity_taxonomy_terms",
            Self::ProductActiveIngredients => "product_active_ingredients",
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
