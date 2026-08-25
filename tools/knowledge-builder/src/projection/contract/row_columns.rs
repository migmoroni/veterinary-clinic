//! Declares the exact materialized SQLite columns for every typed system row.

use super::*;

impl SystemRow {
    pub(crate) fn materialized_columns(&self) -> BTreeSet<SystemColumn> {
        use SystemColumn as C;
        match self {
            Self::TaxonomyRegistry { .. } => BTreeSet::from([C::Id, C::Domain, C::Purpose]),
            Self::TaxonomyTerm { .. } => BTreeSet::from([
                C::TaxonomyId,
                C::TermKey,
                C::ParentTermKey,
                C::Label,
                C::NormalizedLabel,
                C::AliasesJson,
                C::SortOrder,
            ]),
            Self::GeoPlace { .. } => BTreeSet::from([
                C::Id,
                C::PlaceType,
                C::ParentPlaceId,
                C::CountryCodesJson,
                C::Latitude,
                C::Longitude,
                C::Name,
                C::NormalizedName,
                C::AliasesJson,
            ]),
            Self::Breed { .. } => BTreeSet::from([
                C::Id,
                C::SpeciesJson,
                C::Name,
                C::NormalizedName,
                C::AliasesJson,
                C::AverageWeightKgJson,
                C::AverageHeightCmJson,
                C::ContentJson,
            ]),
            Self::BreedOrigin { .. } => BTreeSet::from([C::BreedId, C::PlaceId, C::SortOrder]),
            Self::Manufacturer { .. } => BTreeSet::from([
                C::Id,
                C::Name,
                C::NormalizedName,
                C::AliasesJson,
                C::RegionsJson,
                C::Website,
                C::ContentJson,
            ]),
            Self::ActiveIngredient { .. } => BTreeSet::from([
                C::Id,
                C::Name,
                C::NormalizedName,
                C::AliasesJson,
                C::RegionsJson,
                C::NomenclatureJson,
                C::AtcVetCode,
                C::AtcVetSystem,
                C::DenominationsJson,
                C::ContentJson,
            ]),
            Self::Condition { .. } => BTreeSet::from([
                C::Id,
                C::Name,
                C::NormalizedName,
                C::AliasesJson,
                C::RegionsJson,
                C::ContentJson,
            ]),
            Self::Product { .. } => BTreeSet::from([
                C::Id,
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
            ]),
            Self::EntityTaxonomy { .. } => BTreeSet::from([
                C::EntityType,
                C::EntityId,
                C::TaxonomyId,
                C::TermKey,
                C::SortOrder,
            ]),
            Self::ProductActiveIngredient { .. } => {
                BTreeSet::from([C::ProductId, C::ActiveIngredientId, C::SortOrder])
            }
            Self::TreatmentProtocol { .. } => BTreeSet::from([
                C::Id,
                C::Kind,
                C::Name,
                C::NormalizedName,
                C::SpeciesJson,
                C::Observation,
            ]),
            Self::TreatmentProtocolItem { .. } => {
                BTreeSet::from([C::ProtocolId, C::ProductId, C::SortOrder])
            }
            Self::TreatmentProtocolDose { .. } => BTreeSet::from([
                C::ProtocolId,
                C::DoseId,
                C::Label,
                C::ValidityValue,
                C::ValidityUnit,
                C::SortOrder,
            ]),
            Self::SearchTerm { .. } => BTreeSet::from([
                C::EntityType,
                C::EntityId,
                C::Value,
                C::NormalizedValue,
                C::Provenance,
                C::SortOrder,
            ]),
            Self::MediaReference { .. } => BTreeSet::from([
                C::EntityType,
                C::EntityId,
                C::Role,
                C::MediaKey,
                C::SortOrder,
            ]),
        }
    }
}
