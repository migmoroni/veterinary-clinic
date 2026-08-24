use crate::{
    databases::DatabaseKind,
    ledger::{
        owned_obligations, search_candidates, CompilationOperationId, EntityIdentity,
        ObligationClass, ObligationOwnership, ProjectionObligation, ProjectionOperationId,
        ProjectionTarget, RowEvent, SystemColumn, SystemTable,
    },
    markdown::CompiledDocument,
    media::decode_hex,
    normalization::{normalize_identity_key, normalize_search_text},
    report::BuildContext,
    schemas,
    source::{CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, TaxonomyEntity},
    validation::{ValidatedEntity, ValidatedSource},
};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug)]
pub(crate) struct ProjectionContract {
    pub locale: KnowledgeLocale,
    pub compilation: Vec<CompilationOperation>,
    pub metadata: Vec<MetadataOperation>,
    pub system: Vec<SystemProjectionOperation>,
    pub system_media: Vec<SystemMediaProjectionOperation>,
    pub cas: Vec<CasProjectionOperation>,
    pub expected_obligations: BTreeSet<ProjectionObligation>,
    pub source_facts: ProjectionSourceFacts,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ProjectionSourceFacts {
    pub entities_by_type: BTreeMap<String, usize>,
    pub relation_count: usize,
    pub localized_fragments: usize,
    pub source_files: usize,
}

#[derive(Clone, Debug)]
pub(crate) struct CompilationOperation {
    pub identity: CompilationOperationId,
    pub obligations: BTreeSet<ProjectionObligation>,
}

#[derive(Clone, Debug)]
pub(crate) struct MetadataOperation {
    pub database: DatabaseKind,
    pub row: MetadataRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum MetadataRow {
    Build {
        build_version: u64,
        builder_version: String,
        build_result_schema_version: u32,
        source_digest: Vec<u8>,
        locale: String,
    },
    Release {
        release_id: String,
        generation: u64,
        revision: u64,
        locale: String,
    },
}

#[derive(Clone, Debug)]
pub(crate) struct SystemProjectionOperation {
    pub row: SystemRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) enum SystemRow {
    TaxonomyRegistry {
        id: String,
        domain: String,
        purpose: String,
    },
    TaxonomyTerm {
        table: SystemTable,
        taxonomy_id: Option<String>,
        term_key: String,
        parent_term_key: Option<String>,
        label: String,
        normalized_label: String,
        aliases_json: String,
        sort_order: usize,
    },
    GeoPlace {
        id: String,
        place_type: String,
        parent_place_id: Option<String>,
        country_codes_json: String,
        latitude: Option<f64>,
        longitude: Option<f64>,
        name: String,
        normalized_name: String,
        aliases_json: String,
    },
    Breed {
        id: String,
        species_json: String,
        name: String,
        normalized_name: String,
        aliases_json: String,
        size_term_key: String,
        average_weight_kg_json: String,
        average_height_cm_json: String,
        content_json: String,
    },
    BreedOrigin {
        breed_id: String,
        place_id: String,
        sort_order: usize,
    },
    Manufacturer {
        id: String,
        type_term_key: String,
        name: String,
        normalized_name: String,
        aliases_json: String,
        regions_json: String,
        website: Option<String>,
        content_json: String,
    },
    ActiveIngredient {
        id: String,
        type_term_key: String,
        name: String,
        normalized_name: String,
        aliases_json: String,
        regions_json: String,
        nomenclature_json: String,
        atc_vet_code: Option<String>,
        atc_vet_system: Option<String>,
        denominations_json: String,
        content_json: String,
    },
    Condition {
        id: String,
        type_term_key: String,
        name: String,
        normalized_name: String,
        aliases_json: String,
        regions_json: String,
        content_json: String,
    },
    Product {
        id: String,
        type_term_key: String,
        name: String,
        normalized_name: String,
        species_json: String,
        aliases_json: String,
        manufacturer_id: String,
        regions_json: String,
        regulatory_identifiers_json: String,
        commercial_line: Option<String>,
        presentation_dosage: Option<String>,
        target_species_warnings_json: String,
        content_json: String,
    },
    EntityTaxonomy {
        entity_type: String,
        entity_id: String,
        taxonomy_id: String,
        term_key: String,
        relation_kind: String,
        sort_order: usize,
    },
    ProductActiveIngredient {
        product_id: String,
        active_ingredient_id: String,
        sort_order: usize,
    },
    ProductTerm {
        table: SystemTable,
        product_id: String,
        term_key: String,
        sort_order: usize,
    },
    TreatmentProtocol {
        id: String,
        kind: String,
        name: String,
        normalized_name: String,
        species_json: String,
        observation: Option<String>,
    },
    TreatmentProtocolItem {
        protocol_id: String,
        product_id: String,
        sort_order: usize,
    },
    TreatmentProtocolDose {
        protocol_id: String,
        dose_id: String,
        label: String,
        validity_value: u32,
        validity_unit: String,
        sort_order: usize,
    },
    SearchTerm {
        entity_type: String,
        entity_id: String,
        value: String,
        normalized_value: String,
        provenance: String,
        sort_order: usize,
    },
    MediaReference {
        entity_type: String,
        entity_id: String,
        role: String,
        media_key: String,
        sort_order: usize,
    },
}

impl SystemRow {
    pub(crate) fn table(&self) -> SystemTable {
        match self {
            Self::TaxonomyRegistry {
                id,
                domain,
                purpose,
            } => {
                let _ = (id, domain, purpose);
                SystemTable::TaxonomyRegistry
            }
            Self::TaxonomyTerm {
                table,
                taxonomy_id,
                term_key,
                parent_term_key,
                label,
                normalized_label,
                aliases_json,
                sort_order,
            } => {
                let _ = (
                    taxonomy_id,
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order,
                );
                *table
            }
            Self::GeoPlace {
                id,
                place_type,
                parent_place_id,
                country_codes_json,
                latitude,
                longitude,
                name,
                normalized_name,
                aliases_json,
            } => {
                let _ = (
                    id,
                    place_type,
                    parent_place_id,
                    country_codes_json,
                    latitude,
                    longitude,
                    name,
                    normalized_name,
                    aliases_json,
                );
                SystemTable::GeoPlaces
            }
            Self::Breed {
                id,
                species_json,
                name,
                normalized_name,
                aliases_json,
                size_term_key,
                average_weight_kg_json,
                average_height_cm_json,
                content_json,
            } => {
                let _ = (
                    id,
                    species_json,
                    name,
                    normalized_name,
                    aliases_json,
                    size_term_key,
                    average_weight_kg_json,
                    average_height_cm_json,
                    content_json,
                );
                SystemTable::BreedReferenceItems
            }
            Self::BreedOrigin {
                breed_id,
                place_id,
                sort_order,
            } => {
                let _ = (breed_id, place_id, sort_order);
                SystemTable::BreedOriginPlaces
            }
            Self::Manufacturer {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                website,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    website,
                    content_json,
                );
                SystemTable::ManufacturerCatalogItems
            }
            Self::ActiveIngredient {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                nomenclature_json,
                atc_vet_code,
                atc_vet_system,
                denominations_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    nomenclature_json,
                    atc_vet_code,
                    atc_vet_system,
                    denominations_json,
                    content_json,
                );
                SystemTable::ActiveIngredientCatalogItems
            }
            Self::Condition {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    content_json,
                );
                SystemTable::ConditionCatalogItems
            }
            Self::Product {
                id,
                type_term_key,
                name,
                normalized_name,
                species_json,
                aliases_json,
                manufacturer_id,
                regions_json,
                regulatory_identifiers_json,
                commercial_line,
                presentation_dosage,
                target_species_warnings_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    species_json,
                    aliases_json,
                    manufacturer_id,
                    regions_json,
                    regulatory_identifiers_json,
                    commercial_line,
                    presentation_dosage,
                    target_species_warnings_json,
                    content_json,
                );
                SystemTable::ProductCatalogItems
            }
            Self::EntityTaxonomy {
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                relation_kind,
                sort_order,
            } => {
                let _ = (
                    entity_type,
                    entity_id,
                    taxonomy_id,
                    term_key,
                    relation_kind,
                    sort_order,
                );
                SystemTable::EntityTaxonomyTerms
            }
            Self::ProductActiveIngredient {
                product_id,
                active_ingredient_id,
                sort_order,
            } => {
                let _ = (product_id, active_ingredient_id, sort_order);
                SystemTable::ProductActiveIngredients
            }
            Self::ProductTerm {
                table,
                product_id,
                term_key,
                sort_order,
            } => {
                let _ = (product_id, term_key, sort_order);
                *table
            }
            Self::TreatmentProtocol {
                id,
                kind,
                name,
                normalized_name,
                species_json,
                observation,
            } => {
                let _ = (id, kind, name, normalized_name, species_json, observation);
                SystemTable::TreatmentProtocols
            }
            Self::TreatmentProtocolItem {
                protocol_id,
                product_id,
                sort_order,
            } => {
                let _ = (protocol_id, product_id, sort_order);
                SystemTable::TreatmentProtocolItems
            }
            Self::TreatmentProtocolDose {
                protocol_id,
                dose_id,
                label,
                validity_value,
                validity_unit,
                sort_order,
            } => {
                let _ = (
                    protocol_id,
                    dose_id,
                    label,
                    validity_value,
                    validity_unit,
                    sort_order,
                );
                SystemTable::TreatmentProtocolDoses
            }
            Self::SearchTerm {
                entity_type,
                entity_id,
                value,
                normalized_value,
                provenance,
                sort_order,
            } => {
                let _ = (
                    entity_type,
                    entity_id,
                    value,
                    normalized_value,
                    provenance,
                    sort_order,
                );
                SystemTable::EntitySearchTerms
            }
            Self::MediaReference {
                entity_type,
                entity_id,
                role,
                media_key,
                sort_order,
            } => {
                let _ = (entity_type, entity_id, role, media_key, sort_order);
                SystemTable::EntityMediaReferences
            }
        }
    }

    pub(crate) fn logical_row_id(&self) -> String {
        match self {
            Self::TaxonomyRegistry {
                id,
                domain,
                purpose,
            } => {
                let _ = (domain, purpose);
                id.clone()
            }
            Self::TaxonomyTerm {
                table,
                taxonomy_id,
                term_key,
                parent_term_key,
                label,
                normalized_label,
                aliases_json,
                sort_order,
            } => {
                let _ = (
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order,
                );
                match (table, taxonomy_id) {
                    (SystemTable::TaxonomyTerms, Some(taxonomy_id)) => {
                        format!("{taxonomy_id}/{term_key}")
                    }
                    (
                        SystemTable::ProductTargetTerms
                        | SystemTable::ProductVaccineProfileTerms
                        | SystemTable::ProductLifeStageTerms
                        | SystemTable::ProductTherapeuticScopeTerms,
                        None,
                    ) => term_key.clone(),
                    _ => format!("invalid/{term_key}"),
                }
            }
            Self::GeoPlace {
                id,
                place_type,
                parent_place_id,
                country_codes_json,
                latitude,
                longitude,
                name,
                normalized_name,
                aliases_json,
            } => {
                let _ = (
                    place_type,
                    parent_place_id,
                    country_codes_json,
                    latitude,
                    longitude,
                    name,
                    normalized_name,
                    aliases_json,
                );
                id.clone()
            }
            Self::Breed {
                id,
                species_json,
                name,
                normalized_name,
                aliases_json,
                size_term_key,
                average_weight_kg_json,
                average_height_cm_json,
                content_json,
            } => {
                let _ = (
                    species_json,
                    name,
                    normalized_name,
                    aliases_json,
                    size_term_key,
                    average_weight_kg_json,
                    average_height_cm_json,
                    content_json,
                );
                id.clone()
            }
            Self::BreedOrigin {
                breed_id,
                place_id,
                sort_order,
            } => {
                let _ = sort_order;
                format!("{breed_id}/{place_id}")
            }
            Self::Manufacturer {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                website,
                content_json,
            } => {
                let _ = (
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    website,
                    content_json,
                );
                id.clone()
            }
            Self::ActiveIngredient {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                nomenclature_json,
                atc_vet_code,
                atc_vet_system,
                denominations_json,
                content_json,
            } => {
                let _ = (
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    nomenclature_json,
                    atc_vet_code,
                    atc_vet_system,
                    denominations_json,
                    content_json,
                );
                id.clone()
            }
            Self::Condition {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json,
            } => {
                let _ = (
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    content_json,
                );
                id.clone()
            }
            Self::Product {
                id,
                type_term_key,
                name,
                normalized_name,
                species_json,
                aliases_json,
                manufacturer_id,
                regions_json,
                regulatory_identifiers_json,
                commercial_line,
                presentation_dosage,
                target_species_warnings_json,
                content_json,
            } => {
                let _ = (
                    type_term_key,
                    name,
                    normalized_name,
                    species_json,
                    aliases_json,
                    manufacturer_id,
                    regions_json,
                    regulatory_identifiers_json,
                    commercial_line,
                    presentation_dosage,
                    target_species_warnings_json,
                    content_json,
                );
                id.clone()
            }
            Self::EntityTaxonomy {
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                relation_kind,
                sort_order,
            } => {
                let _ = (taxonomy_id, sort_order);
                format!("{entity_type}/{entity_id}/{relation_kind}/{term_key}")
            }
            Self::ProductActiveIngredient {
                product_id,
                active_ingredient_id,
                sort_order,
            } => {
                let _ = sort_order;
                format!("{product_id}/{active_ingredient_id}")
            }
            Self::ProductTerm {
                table,
                product_id,
                term_key,
                sort_order,
            } => {
                let _ = (table, sort_order);
                format!("{product_id}/{term_key}")
            }
            Self::TreatmentProtocol {
                id,
                kind,
                name,
                normalized_name,
                species_json,
                observation,
            } => {
                let _ = (kind, name, normalized_name, species_json, observation);
                id.clone()
            }
            Self::TreatmentProtocolItem {
                protocol_id,
                product_id,
                sort_order,
            } => {
                let _ = sort_order;
                format!("{protocol_id}/{product_id}")
            }
            Self::TreatmentProtocolDose {
                protocol_id,
                dose_id,
                label,
                validity_value,
                validity_unit,
                sort_order,
            } => {
                let _ = (label, validity_value, validity_unit, sort_order);
                format!("{protocol_id}/{dose_id}")
            }
            Self::SearchTerm {
                entity_type,
                entity_id,
                value,
                normalized_value,
                provenance,
                sort_order,
            } => {
                let _ = (value, normalized_value, provenance);
                format!("{entity_type}/{entity_id}/{sort_order}")
            }
            Self::MediaReference {
                entity_type,
                entity_id,
                role,
                media_key,
                sort_order,
            } => {
                let _ = media_key;
                format!("{entity_type}/{entity_id}/{role}/{sort_order}")
            }
        }
    }

    pub(crate) fn materialized_columns(&self) -> BTreeSet<SystemColumn> {
        use SystemColumn as C;
        match self {
            Self::TaxonomyRegistry {
                id,
                domain,
                purpose,
            } => {
                let _ = (id, domain, purpose);
                BTreeSet::from([C::Id, C::Domain, C::Purpose])
            }
            Self::TaxonomyTerm {
                table,
                taxonomy_id,
                term_key,
                parent_term_key,
                label,
                normalized_label,
                aliases_json,
                sort_order,
            } => {
                let _ = (
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order,
                );
                if *table == SystemTable::TaxonomyTerms {
                    let _ = taxonomy_id;
                    BTreeSet::from([
                        C::TaxonomyId,
                        C::TermKey,
                        C::ParentTermKey,
                        C::Label,
                        C::NormalizedLabel,
                        C::AliasesJson,
                        C::SortOrder,
                    ])
                } else {
                    let _ = taxonomy_id;
                    BTreeSet::from([
                        C::TermKey,
                        C::ParentTermKey,
                        C::Label,
                        C::NormalizedLabel,
                        C::AliasesJson,
                        C::SortOrder,
                    ])
                }
            }
            Self::GeoPlace {
                id,
                place_type,
                parent_place_id,
                country_codes_json,
                latitude,
                longitude,
                name,
                normalized_name,
                aliases_json,
            } => {
                let _ = (
                    id,
                    place_type,
                    parent_place_id,
                    country_codes_json,
                    latitude,
                    longitude,
                    name,
                    normalized_name,
                    aliases_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::PlaceType,
                    C::ParentPlaceId,
                    C::CountryCodesJson,
                    C::Latitude,
                    C::Longitude,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                ])
            }
            Self::Breed {
                id,
                species_json,
                name,
                normalized_name,
                aliases_json,
                size_term_key,
                average_weight_kg_json,
                average_height_cm_json,
                content_json,
            } => {
                let _ = (
                    id,
                    species_json,
                    name,
                    normalized_name,
                    aliases_json,
                    size_term_key,
                    average_weight_kg_json,
                    average_height_cm_json,
                    content_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::SpeciesJson,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::SizeTermKey,
                    C::AverageWeightKgJson,
                    C::AverageHeightCmJson,
                    C::ContentJson,
                ])
            }
            Self::BreedOrigin {
                breed_id,
                place_id,
                sort_order,
            } => {
                let _ = (breed_id, place_id, sort_order);
                BTreeSet::from([C::BreedId, C::PlaceId, C::SortOrder])
            }
            Self::Manufacturer {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                website,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    website,
                    content_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::TypeTermKey,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::RegionsJson,
                    C::Website,
                    C::ContentJson,
                ])
            }
            Self::ActiveIngredient {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                nomenclature_json,
                atc_vet_code,
                atc_vet_system,
                denominations_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    nomenclature_json,
                    atc_vet_code,
                    atc_vet_system,
                    denominations_json,
                    content_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::TypeTermKey,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::RegionsJson,
                    C::NomenclatureJson,
                    C::AtcVetCode,
                    C::AtcVetSystem,
                    C::DenominationsJson,
                    C::ContentJson,
                ])
            }
            Self::Condition {
                id,
                type_term_key,
                name,
                normalized_name,
                aliases_json,
                regions_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    content_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::TypeTermKey,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::RegionsJson,
                    C::ContentJson,
                ])
            }
            Self::Product {
                id,
                type_term_key,
                name,
                normalized_name,
                species_json,
                aliases_json,
                manufacturer_id,
                regions_json,
                regulatory_identifiers_json,
                commercial_line,
                presentation_dosage,
                target_species_warnings_json,
                content_json,
            } => {
                let _ = (
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    species_json,
                    aliases_json,
                    manufacturer_id,
                    regions_json,
                    regulatory_identifiers_json,
                    commercial_line,
                    presentation_dosage,
                    target_species_warnings_json,
                    content_json,
                );
                BTreeSet::from([
                    C::Id,
                    C::TypeTermKey,
                    C::Name,
                    C::NormalizedName,
                    C::SpeciesJson,
                    C::AliasesJson,
                    C::ManufacturerId,
                    C::RegionsJson,
                    C::RegulatoryIdentifiersJson,
                    C::CommercialLine,
                    C::PresentationDosage,
                    C::TargetSpeciesWarningsJson,
                    C::ContentJson,
                ])
            }
            Self::EntityTaxonomy {
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                relation_kind,
                sort_order,
            } => {
                let _ = (
                    entity_type,
                    entity_id,
                    taxonomy_id,
                    term_key,
                    relation_kind,
                    sort_order,
                );
                BTreeSet::from([
                    C::EntityType,
                    C::EntityId,
                    C::TaxonomyId,
                    C::TermKey,
                    C::RelationKind,
                    C::SortOrder,
                ])
            }
            Self::ProductActiveIngredient {
                product_id,
                active_ingredient_id,
                sort_order,
            } => {
                let _ = (product_id, active_ingredient_id, sort_order);
                BTreeSet::from([C::ProductId, C::ActiveIngredientId, C::SortOrder])
            }
            Self::ProductTerm {
                table,
                product_id,
                term_key,
                sort_order,
            } => {
                let _ = (table, product_id, term_key, sort_order);
                BTreeSet::from([C::ProductId, C::TermKey, C::SortOrder])
            }
            Self::TreatmentProtocol {
                id,
                kind,
                name,
                normalized_name,
                species_json,
                observation,
            } => {
                let _ = (id, kind, name, normalized_name, species_json, observation);
                BTreeSet::from([
                    C::Id,
                    C::Kind,
                    C::Name,
                    C::NormalizedName,
                    C::SpeciesJson,
                    C::Observation,
                ])
            }
            Self::TreatmentProtocolItem {
                protocol_id,
                product_id,
                sort_order,
            } => {
                let _ = (protocol_id, product_id, sort_order);
                BTreeSet::from([C::ProtocolId, C::ProductId, C::SortOrder])
            }
            Self::TreatmentProtocolDose {
                protocol_id,
                dose_id,
                label,
                validity_value,
                validity_unit,
                sort_order,
            } => {
                let _ = (
                    protocol_id,
                    dose_id,
                    label,
                    validity_value,
                    validity_unit,
                    sort_order,
                );
                BTreeSet::from([
                    C::ProtocolId,
                    C::DoseId,
                    C::Label,
                    C::ValidityValue,
                    C::ValidityUnit,
                    C::SortOrder,
                ])
            }
            Self::SearchTerm {
                entity_type,
                entity_id,
                value,
                normalized_value,
                provenance,
                sort_order,
            } => {
                let _ = (
                    entity_type,
                    entity_id,
                    value,
                    normalized_value,
                    provenance,
                    sort_order,
                );
                BTreeSet::from([
                    C::EntityType,
                    C::EntityId,
                    C::Value,
                    C::NormalizedValue,
                    C::Provenance,
                    C::SortOrder,
                ])
            }
            Self::MediaReference {
                entity_type,
                entity_id,
                role,
                media_key,
                sort_order,
            } => {
                let _ = (entity_type, entity_id, role, media_key, sort_order);
                BTreeSet::from([
                    C::EntityType,
                    C::EntityId,
                    C::Role,
                    C::MediaKey,
                    C::SortOrder,
                ])
            }
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct SystemMediaProjectionOperation {
    pub row: SystemMediaRow,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: RowEvent,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct SystemMediaRow {
    pub media_key: String,
    pub content_hash: Vec<u8>,
    pub thumbnail: Vec<u8>,
    pub thumbnail_mime_type: String,
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
    pub mime_type: String,
    pub size_bytes: u64,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Debug)]
pub(crate) struct CasProjectionOperation {
    pub content_hash: String,
    pub bytes: Vec<u8>,
    pub obligations: BTreeSet<ProjectionObligation>,
}

impl ProjectionContract {
    pub(crate) fn build(
        source: &ValidatedSource,
        locale: KnowledgeLocale,
        context: &BuildContext,
    ) -> Result<Self, String> {
        let mut claims = owned_obligations(source, locale, context.release.is_some())?;
        let expected_obligations = claims.expected();
        let source_digest = decode_hex(&source.source_digest_sha256)?;
        let mut metadata = Vec::new();
        for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
            let owner = ProjectionOperationId::Metadata {
                database,
                release: false,
            };
            metadata.push(MetadataOperation {
                database,
                row: MetadataRow::Build {
                    build_version: context.build_version,
                    builder_version: env!("CARGO_PKG_VERSION").to_string(),
                    build_result_schema_version: 1,
                    source_digest: source_digest.clone(),
                    locale: locale.to_string(),
                },
                obligations: claims.claim(&owner)?,
                event: RowEvent {
                    database,
                    table: SystemTable::KnowledgeBuildMetadata,
                    row: "1".to_string(),
                    entity: None,
                },
            });
            if let Some(release) = &context.release {
                let owner = ProjectionOperationId::Metadata {
                    database,
                    release: true,
                };
                metadata.push(MetadataOperation {
                    database,
                    row: MetadataRow::Release {
                        release_id: release.release_id.clone(),
                        generation: release.generation,
                        revision: release.revision,
                        locale: locale.to_string(),
                    },
                    obligations: claims.claim(&owner)?,
                    event: RowEvent {
                        database,
                        table: SystemTable::KnowledgeReleaseMetadata,
                        row: "1".to_string(),
                        entity: None,
                    },
                });
            }
        }

        let mut compilation = Vec::new();
        for entry in &source.entities {
            let entity = identity(&entry.source.entity);
            for validation in ["entity_type", "schema_version"] {
                let identity = CompilationOperationId::CanonicalValidation {
                    entity: entity.clone(),
                    validation,
                };
                compilation.push(CompilationOperation {
                    obligations: claims
                        .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                    identity,
                });
            }
            if let Some(document) = entry.editorial.get(&locale) {
                let identity = CompilationOperationId::Document {
                    entity: entity.clone(),
                };
                compilation.push(CompilationOperation {
                    obligations: claims
                        .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                    identity,
                });
                for section in &document.sections {
                    let identity = CompilationOperationId::Section {
                        entity: entity.clone(),
                        section_key: section.section_key.clone(),
                    };
                    compilation.push(CompilationOperation {
                        obligations: claims
                            .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                        identity,
                    });
                }
            }
        }

        let mut system = Vec::new();
        project_taxonomies(source, locale, &mut claims, &mut system)?;
        project_geo_places(source, locale, &mut claims, &mut system)?;
        project_catalog(source, locale, &mut claims, &mut system)?;
        project_media_references(source, locale, &mut claims, &mut system)?;
        project_search(source, locale, &mut claims, &mut system)?;

        let mut system_media = Vec::new();
        let mut cas_hashes = BTreeSet::new();
        for media_key in source
            .media_keys_by_locale
            .get(&locale)
            .into_iter()
            .flatten()
        {
            let asset = source
                .media
                .get(media_key)
                .ok_or_else(|| format!("media key has no source asset: {media_key}"))?;
            let owner = ProjectionOperationId::SystemMediaAsset {
                media_key: media_key.clone(),
            };
            system_media.push(SystemMediaProjectionOperation {
                row: SystemMediaRow {
                    media_key: asset.media_key.clone(),
                    content_hash: decode_hex(&asset.content_hash_sha256)?,
                    thumbnail: asset.thumbnail.clone(),
                    thumbnail_mime_type: asset.thumbnail_mime_type.clone(),
                    thumbnail_width: asset.thumbnail_width,
                    thumbnail_height: asset.thumbnail_height,
                    mime_type: asset.mime_type.clone(),
                    size_bytes: asset.size_bytes,
                    width: asset.width,
                    height: asset.height,
                },
                obligations: claims.claim(&owner)?,
                event: RowEvent {
                    database: DatabaseKind::SystemMedia,
                    table: SystemTable::MediaAssets,
                    row: media_key.clone(),
                    entity: None,
                },
            });
            cas_hashes.insert(asset.content_hash_sha256.clone());
        }
        let mut cas = Vec::new();
        for content_hash in cas_hashes {
            let asset = source
                .media
                .values()
                .find(|asset| asset.content_hash_sha256 == content_hash)
                .ok_or_else(|| format!("CAS hash has no source asset: {content_hash}"))?;
            let owner = ProjectionOperationId::CasObject {
                content_hash: content_hash.clone(),
            };
            cas.push(CasProjectionOperation {
                content_hash,
                bytes: asset.bytes.clone(),
                obligations: claims.claim(&owner)?,
            });
        }
        claims.finish()?;

        let entities_by_type =
            source
                .entities
                .iter()
                .fold(BTreeMap::<String, usize>::new(), |mut result, entry| {
                    *result
                        .entry(entry.source.entity.entity_type().to_string())
                        .or_default() += 1;
                    result
                });
        let localized_fragments = source
            .localized_fragments_by_locale
            .get(&locale)
            .copied()
            .unwrap_or_default();
        let contract = Self {
            locale,
            compilation,
            metadata,
            system,
            system_media,
            cas,
            expected_obligations,
            source_facts: ProjectionSourceFacts {
                entities_by_type,
                relation_count: source.relation_count,
                localized_fragments,
                source_files: source.source_files,
            },
        };
        contract.validate()?;
        Ok(contract)
    }

    pub(crate) fn validate(&self) -> Result<(), String> {
        let mut operation_ids = BTreeSet::new();
        let mut ownership = BTreeSet::new();
        for operation in &self.compilation {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_compilation_operation(operation, self.locale)?;
        }
        for operation in &self.metadata {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_metadata_operation(operation, self.locale)?;
        }
        for operation in &self.system {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_system_operation(operation, self.locale)?;
        }
        for operation in &self.system_media {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_system_media_operation(operation, self.locale)?;
        }
        for operation in &self.cas {
            validate_operation_registration(
                operation.id(),
                &operation.obligations,
                &mut operation_ids,
                &mut ownership,
            )?;
            validate_cas_operation(operation, self.locale)?;
        }
        if ownership != self.expected_obligations {
            return Err("operation obligations do not equal expected obligations".to_string());
        }
        let localized = self
            .expected_obligations
            .iter()
            .filter(|obligation| obligation.class == ObligationClass::LocalizedContent)
            .map(|obligation| &obligation.source)
            .collect::<BTreeSet<_>>()
            .len();
        if localized != self.source_facts.localized_fragments {
            return Err(format!(
                "localized fragment count differs between source and contract for {}: source {}, contract {localized}",
                self.locale, self.source_facts.localized_fragments
            ));
        }
        Ok(())
    }

    pub(crate) fn rows_by_database(&self) -> BTreeMap<String, BTreeMap<String, usize>> {
        let mut system = SystemTable::SYSTEM_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        let mut system_media = SystemTable::SYSTEM_MEDIA_PROJECTABLE
            .into_iter()
            .map(|table| (table.as_str().to_string(), 0usize))
            .collect::<BTreeMap<_, _>>();
        for operation in &self.system {
            *system.get_mut(operation.event.table.as_str()).unwrap() += 1;
        }
        for operation in &self.system_media {
            *system_media
                .get_mut(operation.event.table.as_str())
                .unwrap() += 1;
        }
        BTreeMap::from([
            ("system".to_string(), system),
            ("systemMedia".to_string(), system_media),
        ])
    }

    pub(crate) fn operation_count(&self) -> usize {
        self.compilation.len()
            + self.metadata.len()
            + self.system.len()
            + self.system_media.len()
            + self.cas.len()
    }
}

impl CompilationOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::Compilation(self.identity.clone())
    }
}

impl MetadataOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::Metadata {
            database: self.database,
            release: self.row.is_release(),
        }
    }
}

impl MetadataRow {
    fn is_release(&self) -> bool {
        match self {
            Self::Build {
                build_version,
                builder_version,
                build_result_schema_version,
                source_digest,
                locale,
            } => {
                let _ = (
                    build_version,
                    builder_version,
                    build_result_schema_version,
                    source_digest,
                    locale,
                );
                false
            }
            Self::Release {
                release_id,
                generation,
                revision,
                locale,
            } => {
                let _ = (release_id, generation, revision, locale);
                true
            }
        }
    }
}

impl SystemProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::SystemRow {
            table: self.row.table(),
            row: self.row.logical_row_id(),
        }
    }
}

impl SystemMediaProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::SystemMediaAsset {
            media_key: self.row.media_key.clone(),
        }
    }
}

impl CasProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::CasObject {
            content_hash: self.content_hash.clone(),
        }
    }
}

fn validate_operation_registration(
    id: ProjectionOperationId,
    obligations: &BTreeSet<ProjectionObligation>,
    operation_ids: &mut BTreeSet<ProjectionOperationId>,
    ownership: &mut BTreeSet<ProjectionObligation>,
) -> Result<(), String> {
    if !operation_ids.insert(id.clone()) {
        return Err(format!("duplicate projection operation identity: {id:?}"));
    }
    if obligations.is_empty() {
        return Err(format!(
            "projection operation has no declared owner batch: {id:?}"
        ));
    }
    for obligation in obligations {
        if !ownership.insert(obligation.clone()) {
            return Err(format!(
                "projection obligation belongs to more than one operation: {obligation}"
            ));
        }
    }
    Ok(())
}

fn validate_compilation_operation(
    operation: &CompilationOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    for obligation in &operation.obligations {
        let compatible = match (&operation.identity, &obligation.target) {
            (
                CompilationOperationId::CanonicalValidation { entity, validation },
                ProjectionTarget::CanonicalValidation {
                    entity: target_entity,
                    locale: target_locale,
                    validation: target_validation,
                },
            ) => {
                entity == target_entity
                    && locale == *target_locale
                    && validation == target_validation
            }
            (
                CompilationOperationId::Document { entity },
                ProjectionTarget::CompiledDocument {
                    entity: target_entity,
                    locale: target_locale,
                },
            ) => entity == target_entity && locale == *target_locale,
            (
                CompilationOperationId::Section {
                    entity,
                    section_key,
                },
                ProjectionTarget::CompiledSection {
                    entity: target_entity,
                    locale: target_locale,
                    section_key: target_section,
                },
            ) => {
                entity == target_entity && locale == *target_locale && section_key == target_section
            }
            _ => false,
        };
        if !compatible {
            return Err(format!(
                "compilation operation {:?} cannot materialize target {:?}",
                operation.identity, obligation.target
            ));
        }
    }
    Ok(())
}

fn validate_metadata_operation(
    operation: &MetadataOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let release = operation.row.is_release();
    let expected_table = if release {
        SystemTable::KnowledgeReleaseMetadata
    } else {
        SystemTable::KnowledgeBuildMetadata
    };
    if operation.event.database != operation.database
        || operation.event.table != expected_table
        || operation.event.row != "1"
    {
        return Err("metadata event differs from its operation identity".to_string());
    }
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::BuildMetadata {
                database,
                locale: target_locale,
                release: target_release,
            } if *database == operation.database && *target_locale == locale && *target_release == release
        ) {
            return Err("metadata obligation differs from its operation identity".to_string());
        }
    }
    Ok(())
}

fn validate_system_operation(
    operation: &SystemProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    let table = operation.row.table();
    let row = operation.row.logical_row_id();
    if operation.event.database != DatabaseKind::System
        || operation.event.table != table
        || operation.event.row != row
    {
        return Err(format!(
            "system row event differs from payload identity: {}:{}",
            table.as_str(),
            row
        ));
    }
    let columns = operation.row.materialized_columns();
    for obligation in &operation.obligations {
        let compatible = match &obligation.target {
            ProjectionTarget::TableRow {
                database,
                table: target_table,
                row: target_row,
            } => *database == DatabaseKind::System && *target_table == table && *target_row == row,
            ProjectionTarget::TableColumn {
                database,
                table: target_table,
                row: target_row,
                column,
            } => {
                *database == DatabaseKind::System
                    && *target_table == table
                    && *target_row == row
                    && columns.contains(column)
            }
            ProjectionTarget::SearchTerm {
                entity,
                locale: target_locale,
                provenance,
                occurrence,
            } => match &operation.row {
                SystemRow::SearchTerm {
                    entity_type,
                    entity_id,
                    value,
                    normalized_value,
                    provenance: row_provenance,
                    sort_order,
                } => {
                    let _ = (value, normalized_value);
                    entity.entity_type == *entity_type
                        && entity.id == *entity_id
                        && *target_locale == locale
                        && provenance == row_provenance
                        && *occurrence == *sort_order
                }
                SystemRow::TaxonomyRegistry {
                    id,
                    domain,
                    purpose,
                } => {
                    let _ = (id, domain, purpose);
                    false
                }
                SystemRow::TaxonomyTerm {
                    table,
                    taxonomy_id,
                    term_key,
                    parent_term_key,
                    label,
                    normalized_label,
                    aliases_json,
                    sort_order,
                } => {
                    let _ = (
                        table,
                        taxonomy_id,
                        term_key,
                        parent_term_key,
                        label,
                        normalized_label,
                        aliases_json,
                        sort_order,
                    );
                    false
                }
                SystemRow::GeoPlace {
                    id,
                    place_type,
                    parent_place_id,
                    country_codes_json,
                    latitude,
                    longitude,
                    name,
                    normalized_name,
                    aliases_json,
                } => {
                    let _ = (
                        id,
                        place_type,
                        parent_place_id,
                        country_codes_json,
                        latitude,
                        longitude,
                        name,
                        normalized_name,
                        aliases_json,
                    );
                    false
                }
                SystemRow::Breed {
                    id,
                    species_json,
                    name,
                    normalized_name,
                    aliases_json,
                    size_term_key,
                    average_weight_kg_json,
                    average_height_cm_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        species_json,
                        name,
                        normalized_name,
                        aliases_json,
                        size_term_key,
                        average_weight_kg_json,
                        average_height_cm_json,
                        content_json,
                    );
                    false
                }
                SystemRow::BreedOrigin {
                    breed_id,
                    place_id,
                    sort_order,
                } => {
                    let _ = (breed_id, place_id, sort_order);
                    false
                }
                SystemRow::Manufacturer {
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    website,
                    content_json,
                } => {
                    let _ = (
                        id,
                        type_term_key,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        website,
                        content_json,
                    );
                    false
                }
                SystemRow::ActiveIngredient {
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    nomenclature_json,
                    atc_vet_code,
                    atc_vet_system,
                    denominations_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        type_term_key,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        nomenclature_json,
                        atc_vet_code,
                        atc_vet_system,
                        denominations_json,
                        content_json,
                    );
                    false
                }
                SystemRow::Condition {
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    aliases_json,
                    regions_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        type_term_key,
                        name,
                        normalized_name,
                        aliases_json,
                        regions_json,
                        content_json,
                    );
                    false
                }
                SystemRow::Product {
                    id,
                    type_term_key,
                    name,
                    normalized_name,
                    species_json,
                    aliases_json,
                    manufacturer_id,
                    regions_json,
                    regulatory_identifiers_json,
                    commercial_line,
                    presentation_dosage,
                    target_species_warnings_json,
                    content_json,
                } => {
                    let _ = (
                        id,
                        type_term_key,
                        name,
                        normalized_name,
                        species_json,
                        aliases_json,
                        manufacturer_id,
                        regions_json,
                        regulatory_identifiers_json,
                        commercial_line,
                        presentation_dosage,
                        target_species_warnings_json,
                        content_json,
                    );
                    false
                }
                SystemRow::EntityTaxonomy {
                    entity_type,
                    entity_id,
                    taxonomy_id,
                    term_key,
                    relation_kind,
                    sort_order,
                } => {
                    let _ = (
                        entity_type,
                        entity_id,
                        taxonomy_id,
                        term_key,
                        relation_kind,
                        sort_order,
                    );
                    false
                }
                SystemRow::ProductActiveIngredient {
                    product_id,
                    active_ingredient_id,
                    sort_order,
                } => {
                    let _ = (product_id, active_ingredient_id, sort_order);
                    false
                }
                SystemRow::ProductTerm {
                    table,
                    product_id,
                    term_key,
                    sort_order,
                } => {
                    let _ = (table, product_id, term_key, sort_order);
                    false
                }
                SystemRow::TreatmentProtocol {
                    id,
                    kind,
                    name,
                    normalized_name,
                    species_json,
                    observation,
                } => {
                    let _ = (id, kind, name, normalized_name, species_json, observation);
                    false
                }
                SystemRow::TreatmentProtocolItem {
                    protocol_id,
                    product_id,
                    sort_order,
                } => {
                    let _ = (protocol_id, product_id, sort_order);
                    false
                }
                SystemRow::TreatmentProtocolDose {
                    protocol_id,
                    dose_id,
                    label,
                    validity_value,
                    validity_unit,
                    sort_order,
                } => {
                    let _ = (
                        protocol_id,
                        dose_id,
                        label,
                        validity_value,
                        validity_unit,
                        sort_order,
                    );
                    false
                }
                SystemRow::MediaReference {
                    entity_type,
                    entity_id,
                    role,
                    media_key,
                    sort_order,
                } => {
                    let _ = (entity_type, entity_id, role, media_key, sort_order);
                    false
                }
            },
            ProjectionTarget::CanonicalValidation {
                entity,
                locale,
                validation,
            } => {
                let _ = (entity, locale, validation);
                false
            }
            ProjectionTarget::CompiledDocument { entity, locale } => {
                let _ = (entity, locale);
                false
            }
            ProjectionTarget::CompiledSection {
                entity,
                locale,
                section_key,
            } => {
                let _ = (entity, locale, section_key);
                false
            }
            ProjectionTarget::SystemMediaAsset { locale, media_key } => {
                let _ = (locale, media_key);
                false
            }
            ProjectionTarget::CasObject {
                locale,
                content_hash,
            } => {
                let _ = (locale, content_hash);
                false
            }
            ProjectionTarget::BuildMetadata {
                database,
                locale,
                release,
            } => {
                let _ = (database, locale, release);
                false
            }
        };
        if !compatible {
            return Err(format!(
                "system operation {}:{} cannot materialize target {:?}",
                table.as_str(),
                row,
                obligation.target
            ));
        }
    }
    Ok(())
}

fn validate_system_media_operation(
    operation: &SystemMediaProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    if operation.event.database != DatabaseKind::SystemMedia
        || operation.event.table != SystemTable::MediaAssets
        || operation.event.row != operation.row.media_key
    {
        return Err("system_media event differs from payload identity".to_string());
    }
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::SystemMediaAsset { locale: target_locale, media_key }
                if *target_locale == locale && media_key == &operation.row.media_key
        ) {
            return Err("system_media obligation differs from payload identity".to_string());
        }
    }
    Ok(())
}

fn validate_cas_operation(
    operation: &CasProjectionOperation,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    for obligation in &operation.obligations {
        if !matches!(
            &obligation.target,
            ProjectionTarget::CasObject { locale: target_locale, content_hash }
                if *target_locale == locale && content_hash == &operation.content_hash
        ) {
            return Err("CAS obligation differs from operation identity".to_string());
        }
    }
    Ok(())
}

fn project_taxonomies(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::Taxonomy(taxonomy) = &entry.source.entity else {
            continue;
        };
        push_system(
            operations,
            claims,
            SystemRow::TaxonomyRegistry {
                id: taxonomy.id.clone(),
                domain: taxonomy.domain.clone(),
                purpose: taxonomy.purpose.clone(),
            },
            SystemTable::TaxonomyRegistry,
            taxonomy.id.clone(),
            Some(identity(&entry.source.entity)),
        )?;
        let table = semantic_term_table(&taxonomy.purpose);
        for term in &taxonomy.terms {
            let crate::source::TaxonomyTerm {
                key,
                parent_key,
                order,
                localized_content,
            } = term;
            let label = localized_text(localized_content, "label", locale)?.to_string();
            let row_id = if table == SystemTable::TaxonomyTerms {
                format!("{}/{}", taxonomy.id, key)
            } else {
                key.clone()
            };
            push_system(
                operations,
                claims,
                SystemRow::TaxonomyTerm {
                    table,
                    taxonomy_id: (table == SystemTable::TaxonomyTerms).then(|| taxonomy.id.clone()),
                    term_key: key.clone(),
                    parent_term_key: parent_key.clone(),
                    normalized_label: normalize_search_text(&label),
                    label,
                    aliases_json: json(
                        &localized_list(localized_content, "aliases", locale).unwrap_or_default(),
                    )?,
                    sort_order: usize::try_from(*order)
                        .map_err(|_| "taxonomy sort order exceeds usize".to_string())?,
                },
                table,
                row_id.clone(),
                Some(identity(&entry.source.entity)),
            )?;
        }
    }
    Ok(())
}

fn project_geo_places(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    let mut remaining = source
        .entities
        .iter()
        .filter_map(|entry| match &entry.source.entity {
            CanonicalEntity::GeoPlace(value) => Some((entry, value)),
            _ => None,
        })
        .collect::<Vec<_>>();
    let mut inserted = BTreeSet::new();
    while !remaining.is_empty() {
        let before = remaining.len();
        let mut next = Vec::new();
        for (entry, value) in remaining {
            let crate::source::GeoPlaceEntity {
                schema_version,
                id,
                place_type,
                country_codes,
                parent_place_id,
                centroid,
                localized_content,
            } = value;
            let _ = schema_version;
            if parent_place_id
                .as_ref()
                .is_some_and(|parent| !inserted.contains(parent))
            {
                next.push((entry, value));
                continue;
            }
            let crate::source::Centroid {
                latitude,
                longitude,
            } = centroid;
            let name = localized_text(localized_content, "name", locale)?.to_string();
            push_system(
                operations,
                claims,
                SystemRow::GeoPlace {
                    id: id.clone(),
                    place_type: place_type.clone(),
                    parent_place_id: parent_place_id.clone(),
                    country_codes_json: json(country_codes)?,
                    latitude: *latitude,
                    longitude: *longitude,
                    normalized_name: normalize_identity_key(&name),
                    name,
                    aliases_json: json(
                        &localized_list(localized_content, "aliases", locale).unwrap_or_default(),
                    )?,
                },
                SystemTable::GeoPlaces,
                id.clone(),
                Some(identity(&entry.source.entity)),
            )?;
            inserted.insert(id.clone());
        }
        if next.len() == before {
            return Err("geo_place hierarchy could not be topologically projected".to_string());
        }
        remaining = next;
    }
    Ok(())
}

fn project_catalog(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        match &entry.source.entity {
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
                let _ = (schema_version, sections, content_path, media);
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ManufacturerCatalogItems,
                    SystemRow::Manufacturer {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        website: website.clone(),
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
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
                let crate::source::Nomenclature {
                    scientific_name,
                    cas_number,
                    denomination_standards,
                } = nomenclature;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    scientific_name,
                    cas_number,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                let denominations = denomination_standards
                    .iter()
                    .map(|standard| {
                        localized_text(
                            localized_content,
                            &format!("denomination_{standard}"),
                            locale,
                        )
                        .map(|value| (standard.clone(), value.to_string()))
                    })
                    .collect::<Result<BTreeMap<_, _>, _>>()?;
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ActiveIngredientCatalogItems,
                    SystemRow::ActiveIngredient {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        nomenclature_json: json(nomenclature)?,
                        atc_vet_code: atc_vet_code.clone(),
                        atc_vet_system: optional_localized_text(
                            localized_content,
                            "atcVetSystem",
                            locale,
                        )
                        .map(str::to_string),
                        denominations_json: json(&denominations)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
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
                let _ = (schema_version, sections, content_path, media);
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ConditionCatalogItems,
                    SystemRow::Condition {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        regions_json: json(regions)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
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
                let crate::source::MeasurementRange {
                    male: weight_male,
                    female: weight_female,
                } = average_weight_kg;
                let crate::source::MeasurementRange {
                    male: height_male,
                    female: height_female,
                } = average_height_cm;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    weight_male,
                    weight_female,
                    height_male,
                    height_female,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::BreedReferenceItems,
                    SystemRow::Breed {
                        id: id.clone(),
                        species_json: json(species)?,
                        normalized_name: normalize_identity_key(&name),
                        name,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        size_term_key: size_term_key.clone(),
                        average_weight_kg_json: json(average_weight_kg)?,
                        average_height_cm_json: json(average_height_cm)?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                for (sort_order, place_id) in origin_place_ids.iter().enumerate() {
                    let row_id = format!("{id}/{place_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::BreedOrigin {
                            breed_id: id.clone(),
                            place_id: place_id.clone(),
                            sort_order,
                        },
                        SystemTable::BreedOriginPlaces,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    None,
                    &[],
                    Some(size_term_key),
                )?;
            }
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
                let crate::source::RegulatoryIdentifiers {
                    brazil_mapa,
                    united_states_nada,
                    united_states_anada,
                    gtin_ean,
                } = regulatory_identifiers;
                let _ = (
                    schema_version,
                    sections,
                    content_path,
                    media,
                    brazil_mapa,
                    united_states_nada,
                    united_states_anada,
                    gtin_ean,
                );
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::ProductCatalogItems,
                    SystemRow::Product {
                        id: id.clone(),
                        type_term_key: type_term_key.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        species_json: json(species)?,
                        aliases_json: json(
                            &localized_list(localized_content, "aliases", locale)
                                .unwrap_or_default(),
                        )?,
                        manufacturer_id: manufacturer_id.clone(),
                        regions_json: json(regions)?,
                        regulatory_identifiers_json: json(regulatory_identifiers)?,
                        commercial_line: optional_localized_text(
                            localized_content,
                            "commercialLine",
                            locale,
                        )
                        .map(str::to_string),
                        presentation_dosage: optional_localized_text(
                            localized_content,
                            "presentationDosage",
                            locale,
                        )
                        .map(str::to_string),
                        target_species_warnings_json: json(
                            &localized_list(localized_content, "targetSpeciesWarnings", locale)
                                .unwrap_or_default(),
                        )?,
                        content_json: content_json(entry, locale)?,
                    },
                )?;
                taxonomy_relations(
                    source,
                    operations,
                    claims,
                    &entity,
                    Some(type_term_key),
                    classification_term_keys,
                    None,
                )?;
                for (sort_order, ingredient_id) in active_ingredient_ids.iter().enumerate() {
                    let row_id = format!("{id}/{ingredient_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::ProductActiveIngredient {
                            product_id: id.clone(),
                            active_ingredient_id: ingredient_id.clone(),
                            sort_order,
                        },
                        SystemTable::ProductActiveIngredients,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                for (table, values) in [
                    (SystemTable::ProductTargets, target_term_keys.as_deref()),
                    (
                        SystemTable::ProductVaccineProfiles,
                        vaccine_profile_term_keys.as_deref(),
                    ),
                    (
                        SystemTable::ProductLifeStages,
                        life_stage_term_keys.as_deref(),
                    ),
                    (
                        SystemTable::ProductTherapeuticScopes,
                        therapeutic_scope_term_keys.as_deref(),
                    ),
                ] {
                    for (sort_order, term_key) in values.unwrap_or(&[]).iter().enumerate() {
                        let row_id = format!("{id}/{term_key}");
                        push_system(
                            operations,
                            claims,
                            SystemRow::ProductTerm {
                                table,
                                product_id: id.clone(),
                                term_key: term_key.clone(),
                                sort_order,
                            },
                            table,
                            row_id.clone(),
                            Some(entity.clone()),
                        )?;
                    }
                }
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
                let _ = schema_version;
                let name = localized_text(localized_content, "name", locale)?.to_string();
                push_main(
                    operations,
                    claims,
                    &entity,
                    SystemTable::TreatmentProtocols,
                    SystemRow::TreatmentProtocol {
                        id: id.clone(),
                        kind: kind.clone(),
                        normalized_name: normalize_identity_key(&name),
                        name,
                        species_json: json(species)?,
                        observation: optional_localized_text(
                            localized_content,
                            "observation",
                            locale,
                        )
                        .map(str::to_string),
                    },
                )?;
                for (sort_order, product_id) in product_ids.iter().enumerate() {
                    let row_id = format!("{id}/{product_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::TreatmentProtocolItem {
                            protocol_id: id.clone(),
                            product_id: product_id.clone(),
                            sort_order,
                        },
                        SystemTable::TreatmentProtocolItems,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
                for (sort_order, dose) in doses.iter().enumerate() {
                    let crate::source::ProtocolDose {
                        id: dose_id,
                        validity_value,
                        validity_unit,
                        localized_content,
                    } = dose;
                    let row_id = format!("{id}/{dose_id}");
                    push_system(
                        operations,
                        claims,
                        SystemRow::TreatmentProtocolDose {
                            protocol_id: id.clone(),
                            dose_id: dose_id.clone(),
                            label: localized_text(localized_content, "label", locale)?.to_string(),
                            validity_value: *validity_value,
                            validity_unit: validity_unit.clone(),
                            sort_order,
                        },
                        SystemTable::TreatmentProtocolDoses,
                        row_id.clone(),
                        Some(entity.clone()),
                    )?;
                }
            }
            CanonicalEntity::GeoPlace(_) | CanonicalEntity::Taxonomy(_) => {}
        }
    }
    Ok(())
}

fn taxonomy_relations(
    source: &ValidatedSource,
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &EntityIdentity,
    type_key: Option<&String>,
    classifications: &[String],
    size_key: Option<&String>,
) -> Result<(), String> {
    for (purpose, relation_kind, values) in [
        (
            "type",
            "type",
            type_key.map(std::slice::from_ref).unwrap_or(&[]),
        ),
        ("classification", "classification", classifications),
        (
            "size",
            "size",
            size_key.map(std::slice::from_ref).unwrap_or(&[]),
        ),
    ] {
        if values.is_empty() {
            continue;
        }
        let taxonomy = taxonomy_for(source, &entity.entity_type, purpose)?;
        for (sort_order, term_key) in values.iter().enumerate() {
            let row_id = format!(
                "{}/{}/{relation_kind}/{term_key}",
                entity.entity_type, entity.id
            );
            push_system(
                operations,
                claims,
                SystemRow::EntityTaxonomy {
                    entity_type: entity.entity_type.clone(),
                    entity_id: entity.id.clone(),
                    taxonomy_id: taxonomy.id.clone(),
                    term_key: term_key.clone(),
                    relation_kind: relation_kind.to_string(),
                    sort_order,
                },
                SystemTable::EntityTaxonomyTerms,
                row_id.clone(),
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

fn project_media_references(
    source: &ValidatedSource,
    _locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for entry in &source.entities {
        let entity = identity(&entry.source.entity);
        for reference in &entry.structural_media {
            let row_id = format!(
                "{}/{}/{}/{}",
                entity.entity_type, entity.id, reference.role, reference.sort_order
            );
            push_system(
                operations,
                claims,
                SystemRow::MediaReference {
                    entity_type: entity.entity_type.clone(),
                    entity_id: entity.id.clone(),
                    role: reference.role.to_string(),
                    media_key: reference.media_key.clone(),
                    sort_order: reference.sort_order,
                },
                SystemTable::EntityMediaReferences,
                row_id.clone(),
                Some(entity.clone()),
            )?;
        }
    }
    Ok(())
}

fn project_search(
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    claims: &mut ObligationOwnership,
    operations: &mut Vec<SystemProjectionOperation>,
) -> Result<(), String> {
    for candidate in search_candidates(source, locale)? {
        let row_id = format!("{}/{}", candidate.entity, candidate.occurrence);
        push_system(
            operations,
            claims,
            SystemRow::SearchTerm {
                entity_type: candidate.entity.entity_type.clone(),
                entity_id: candidate.entity.id.clone(),
                normalized_value: normalize_search_text(&candidate.value),
                value: candidate.value,
                provenance: candidate.provenance,
                sort_order: candidate.occurrence,
            },
            SystemTable::EntitySearchTerms,
            row_id,
            Some(candidate.entity),
        )?;
    }
    Ok(())
}

fn push_main(
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    entity: &EntityIdentity,
    table: SystemTable,
    row: SystemRow,
) -> Result<(), String> {
    push_system(
        operations,
        claims,
        row,
        table,
        entity.id.clone(),
        Some(entity.clone()),
    )
}

fn push_system(
    operations: &mut Vec<SystemProjectionOperation>,
    claims: &mut ObligationOwnership,
    row: SystemRow,
    table: SystemTable,
    row_id: String,
    entity: Option<EntityIdentity>,
) -> Result<(), String> {
    let owner = ProjectionOperationId::SystemRow {
        table,
        row: row_id.clone(),
    };
    operations.push(SystemProjectionOperation {
        row,
        obligations: claims.claim(&owner)?,
        event: RowEvent {
            database: DatabaseKind::System,
            table,
            row: row_id,
            entity,
        },
    });
    Ok(())
}

fn identity(entity: &CanonicalEntity) -> EntityIdentity {
    EntityIdentity::new(entity.entity_type(), entity.id())
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

fn semantic_term_table(purpose: &str) -> SystemTable {
    match purpose {
        "target" => SystemTable::ProductTargetTerms,
        "vaccine_profile" => SystemTable::ProductVaccineProfileTerms,
        "life_stage" => SystemTable::ProductLifeStageTerms,
        "therapeutic_scope" => SystemTable::ProductTherapeuticScopeTerms,
        _ => SystemTable::TaxonomyTerms,
    }
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
        LocalizedValue::List(values) => Some(values.get(locale).clone()),
        LocalizedValue::Text(_) => None,
    })
}

fn content_json(entry: &ValidatedEntity, locale: KnowledgeLocale) -> Result<String, String> {
    let empty = CompiledDocument {
        schema_version: 1,
        sections: Vec::new(),
    };
    let content = entry.editorial.get(&locale).unwrap_or(&empty);
    schemas::validate_content(content)?;
    json(content)
}

fn json(value: &impl serde::Serialize) -> Result<String, String> {
    serde_json::to_string(value)
        .map_err(|error| format!("cannot serialize projected JSON: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn product_row() -> SystemRow {
        SystemRow::Product {
            id: "id".to_string(),
            type_term_key: "type".to_string(),
            name: "Name".to_string(),
            normalized_name: "name".to_string(),
            species_json: "[]".to_string(),
            aliases_json: "[]".to_string(),
            manufacturer_id: "manufacturer".to_string(),
            regions_json: "[]".to_string(),
            regulatory_identifiers_json: "{}".to_string(),
            commercial_line: None,
            presentation_dosage: None,
            target_species_warnings_json: "[]".to_string(),
            content_json: r#"{"schemaVersion":1,"sections":[]}"#.to_string(),
        }
    }

    fn product_operation(target: ProjectionTarget) -> SystemProjectionOperation {
        SystemProjectionOperation {
            row: product_row(),
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::Field {
                    entity: EntityIdentity::new("product", "id"),
                    path: "id".to_string(),
                },
                target,
                class: ObligationClass::Authoring,
            }]),
            event: RowEvent {
                database: DatabaseKind::System,
                table: SystemTable::ProductCatalogItems,
                row: "id".to_string(),
                entity: Some(EntityIdentity::new("product", "id")),
            },
        }
    }

    #[test]
    fn system_operation_rejects_incompatible_column_and_identity() {
        let valid = product_operation(ProjectionTarget::TableColumn {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: "id".to_string(),
            column: SystemColumn::Id,
        });
        validate_system_operation(&valid, KnowledgeLocale::EnUs).unwrap();

        let invalid_column = product_operation(ProjectionTarget::TableColumn {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: "id".to_string(),
            column: SystemColumn::Domain,
        });
        assert!(validate_system_operation(&invalid_column, KnowledgeLocale::EnUs).is_err());

        let wrong_row = product_operation(ProjectionTarget::TableColumn {
            database: DatabaseKind::System,
            table: SystemTable::ProductCatalogItems,
            row: "other".to_string(),
            column: SystemColumn::Id,
        });
        assert!(validate_system_operation(&wrong_row, KnowledgeLocale::EnUs).is_err());

        let wrong_table = product_operation(ProjectionTarget::TableColumn {
            database: DatabaseKind::System,
            table: SystemTable::ConditionCatalogItems,
            row: "id".to_string(),
            column: SystemColumn::Id,
        });
        assert!(validate_system_operation(&wrong_table, KnowledgeLocale::EnUs).is_err());

        let mut wrong_event = valid;
        wrong_event.event.row = "other".to_string();
        assert!(validate_system_operation(&wrong_event, KnowledgeLocale::EnUs).is_err());
    }

    #[test]
    fn search_operation_rejects_a_divergent_search_target() {
        let operation = SystemProjectionOperation {
            row: SystemRow::SearchTerm {
                entity_type: "product".to_string(),
                entity_id: "id".to_string(),
                value: "Name".to_string(),
                normalized_value: "name".to_string(),
                provenance: "entity.name".to_string(),
                sort_order: 0,
            },
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::SearchValue {
                    entity: EntityIdentity::new("product", "id"),
                    locale: KnowledgeLocale::EnUs,
                    provenance: "entity.name".to_string(),
                    occurrence: 0,
                },
                target: ProjectionTarget::SearchTerm {
                    entity: EntityIdentity::new("product", "id"),
                    locale: KnowledgeLocale::EnUs,
                    provenance: "different".to_string(),
                    occurrence: 0,
                },
                class: ObligationClass::Authoring,
            }]),
            event: RowEvent {
                database: DatabaseKind::System,
                table: SystemTable::EntitySearchTerms,
                row: "product/id/0".to_string(),
                entity: Some(EntityIdentity::new("product", "id")),
            },
        };
        assert!(validate_system_operation(&operation, KnowledgeLocale::EnUs).is_err());
    }

    #[test]
    fn non_system_operations_reject_divergent_targets() {
        let entity = EntityIdentity::new("condition", "id");
        let compilation = CompilationOperation {
            identity: CompilationOperationId::Section {
                entity: entity.clone(),
                section_key: "about".to_string(),
            },
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::Section {
                    entity: entity.clone(),
                    locale: KnowledgeLocale::EnUs,
                    section_key: "about".to_string(),
                },
                target: ProjectionTarget::CompiledSection {
                    entity: entity.clone(),
                    locale: KnowledgeLocale::EnUs,
                    section_key: "different".to_string(),
                },
                class: ObligationClass::LocalizedContent,
            }]),
        };
        assert!(validate_compilation_operation(&compilation, KnowledgeLocale::EnUs).is_err());

        let metadata = MetadataOperation {
            database: DatabaseKind::System,
            row: MetadataRow::Build {
                build_version: 1,
                builder_version: "0.2.0".to_string(),
                build_result_schema_version: 1,
                source_digest: vec![0; 32],
                locale: "en-US".to_string(),
            },
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::BuildMetadata {
                    database: DatabaseKind::System,
                    locale: KnowledgeLocale::EnUs,
                    release: false,
                },
                target: ProjectionTarget::BuildMetadata {
                    database: DatabaseKind::SystemMedia,
                    locale: KnowledgeLocale::EnUs,
                    release: false,
                },
                class: ObligationClass::Metadata,
            }]),
            event: RowEvent {
                database: DatabaseKind::System,
                table: SystemTable::KnowledgeBuildMetadata,
                row: "1".to_string(),
                entity: None,
            },
        };
        assert!(validate_metadata_operation(&metadata, KnowledgeLocale::EnUs).is_err());

        let media = SystemMediaProjectionOperation {
            row: SystemMediaRow {
                media_key: "condition/id/cover".to_string(),
                content_hash: vec![0; 32],
                thumbnail: vec![1],
                thumbnail_mime_type: "image/jpeg".to_string(),
                thumbnail_width: 1,
                thumbnail_height: 1,
                mime_type: "image/png".to_string(),
                size_bytes: 1,
                width: 1,
                height: 1,
            },
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::MediaAsset {
                    locale: KnowledgeLocale::EnUs,
                    media_key: "condition/id/cover".to_string(),
                },
                target: ProjectionTarget::SystemMediaAsset {
                    locale: KnowledgeLocale::EnUs,
                    media_key: "different".to_string(),
                },
                class: ObligationClass::Media,
            }]),
            event: RowEvent {
                database: DatabaseKind::SystemMedia,
                table: SystemTable::MediaAssets,
                row: "condition/id/cover".to_string(),
                entity: None,
            },
        };
        assert!(validate_system_media_operation(&media, KnowledgeLocale::EnUs).is_err());

        let cas = CasProjectionOperation {
            content_hash: "a".repeat(64),
            bytes: vec![1],
            obligations: BTreeSet::from([ProjectionObligation {
                source: crate::ledger::SourceToken::CasObject {
                    locale: KnowledgeLocale::EnUs,
                    content_hash: "a".repeat(64),
                },
                target: ProjectionTarget::CasObject {
                    locale: KnowledgeLocale::EnUs,
                    content_hash: "b".repeat(64),
                },
                class: ObligationClass::Cas,
            }]),
        };
        assert!(validate_cas_operation(&cas, KnowledgeLocale::EnUs).is_err());
    }

    #[test]
    fn duplicate_operation_identity_is_rejected() {
        let obligation = ProjectionObligation {
            source: crate::ledger::SourceToken::Document {
                entity: EntityIdentity::new("condition", "id"),
                locale: KnowledgeLocale::EnUs,
            },
            target: ProjectionTarget::CompiledDocument {
                entity: EntityIdentity::new("condition", "id"),
                locale: KnowledgeLocale::EnUs,
            },
            class: ObligationClass::Authoring,
        };
        let obligations = BTreeSet::from([obligation.clone()]);
        let operation = CompilationOperation {
            identity: CompilationOperationId::Document {
                entity: EntityIdentity::new("condition", "id"),
            },
            obligations: obligations.clone(),
        };
        let duplicated_owner = CompilationOperation {
            identity: CompilationOperationId::Document {
                entity: EntityIdentity::new("condition", "id"),
            },
            obligations: obligations.clone(),
        };
        let contract = ProjectionContract {
            locale: KnowledgeLocale::EnUs,
            compilation: vec![operation, duplicated_owner],
            metadata: vec![],
            system: vec![],
            system_media: vec![],
            cas: vec![],
            expected_obligations: obligations,
            source_facts: ProjectionSourceFacts {
                entities_by_type: BTreeMap::new(),
                relation_count: 0,
                localized_fragments: 0,
                source_files: 0,
            },
        };
        assert!(contract
            .validate()
            .unwrap_err()
            .contains("duplicate projection operation identity"));
    }
}
