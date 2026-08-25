//! Maps every system row payload to its canonical destination table.

use super::*;

impl SystemRow {
    pub(crate) fn table(&self) -> SystemTable {
        match self {
            Self::TaxonomyRegistry { .. } => SystemTable::TaxonomyRegistry,
            Self::TaxonomyTerm { .. } => SystemTable::TaxonomyTerms,
            Self::GeoPlace { .. } => SystemTable::GeoPlaces,
            Self::Breed { .. } => SystemTable::BreedReferenceItems,
            Self::BreedOrigin { .. } => SystemTable::BreedOriginPlaces,
            Self::Manufacturer { .. } => SystemTable::ManufacturerCatalogItems,
            Self::ActiveIngredient { .. } => SystemTable::ActiveIngredientCatalogItems,
            Self::Condition { .. } => SystemTable::ConditionCatalogItems,
            Self::Product { .. } => SystemTable::ProductCatalogItems,
            Self::EntityTaxonomy { .. } => SystemTable::EntityTaxonomyTerms,
            Self::ProductActiveIngredient { .. } => SystemTable::ProductActiveIngredients,
            Self::TreatmentProtocol { .. } => SystemTable::TreatmentProtocols,
            Self::TreatmentProtocolItem { .. } => SystemTable::TreatmentProtocolItems,
            Self::TreatmentProtocolDose { .. } => SystemTable::TreatmentProtocolDoses,
            Self::SearchTerm { .. } => SystemTable::EntitySearchTerms,
            Self::MediaReference { .. } => SystemTable::EntityMediaReferences,
        }
    }
}
