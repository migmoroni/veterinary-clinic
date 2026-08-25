//! Defines the typed row payloads and operation containers used by projection contracts.

use super::*;

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
        taxonomy_id: String,
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
        name: String,
        normalized_name: String,
        aliases_json: String,
        regions_json: String,
        website: Option<String>,
        content_json: String,
    },
    ActiveIngredient {
        id: String,
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
        name: String,
        normalized_name: String,
        aliases_json: String,
        regions_json: String,
        content_json: String,
    },
    Product {
        id: String,
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
        sort_order: usize,
    },
    ProductActiveIngredient {
        product_id: String,
        active_ingredient_id: String,
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
