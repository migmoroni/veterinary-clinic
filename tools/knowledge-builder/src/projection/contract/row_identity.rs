//! Derives stable logical row identities from typed system row payloads.

use super::*;

impl SystemRow {
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
}
