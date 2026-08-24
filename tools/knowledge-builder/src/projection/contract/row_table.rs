//! Maps every system row payload to its canonical destination table.

use super::*;

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
}
