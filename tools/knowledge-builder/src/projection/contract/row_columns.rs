//! Declares the exact materialized column set for each typed system row payload.

use super::*;

impl SystemRow {
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
