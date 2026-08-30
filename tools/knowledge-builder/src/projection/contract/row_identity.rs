//! Derives stable logical row identities from typed system row payloads.

use super::*;

impl SystemRow {
    pub(crate) fn logical_row_id(&self) -> String {
        match self {
            Self::TaxonomyRegistry { id, .. }
            | Self::GeoPlace { id, .. }
            | Self::Life { id, .. }
            | Self::Manufacturer { id, .. }
            | Self::ActiveIngredient { id, .. }
            | Self::Condition { id, .. }
            | Self::Product { id, .. }
            | Self::TreatmentProtocol { id, .. } => id.clone(),
            Self::TaxonomyTerm {
                taxonomy_id,
                term_key,
                ..
            } => format!("{taxonomy_id}/{term_key}"),
            Self::LifeOrigin {
                life_id, place_id, ..
            } => format!("{life_id}/{place_id}"),
            Self::EntityTaxonomy {
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                ..
            } => format!("{entity_type}/{entity_id}/{taxonomy_id}/{term_key}"),
            Self::ProductActiveIngredient {
                product_id,
                active_ingredient_id,
                ..
            } => format!("{product_id}/{active_ingredient_id}"),
            Self::TreatmentProtocolItem {
                protocol_id,
                product_id,
                ..
            } => format!("{protocol_id}/{product_id}"),
            Self::TreatmentProtocolDose {
                protocol_id,
                dose_id,
                ..
            } => format!("{protocol_id}/{dose_id}"),
            Self::SearchTerm {
                entity_type,
                entity_id,
                sort_order,
                ..
            } => format!("{entity_type}/{entity_id}/{sort_order}"),
            Self::MediaReference {
                entity_type,
                entity_id,
                role,
                sort_order,
                ..
            } => format!("{entity_type}/{entity_id}/{role}/{sort_order}"),
        }
    }
}
