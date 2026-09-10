//! Binds each system row case to its table, logical identity, and ordered columns.

use super::SystemRow;
use crate::projection::coverage::{RowIdentity, SystemColumn, SystemTable};

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum SystemRowCase {
    TaxonomyRegistry,
    TaxonomyTerm,
    GeoPlace,
    Life,
    LifeOrigin,
    Manufacturer,
    ActiveIngredient,
    Condition,
    Product,
    EntityTaxonomy,
    ProductActiveIngredient,
    TreatmentProtocol,
    TreatmentProtocolItem,
    TreatmentProtocolDose,
    SearchTerm,
    MediaReference,
}

impl SystemRowCase {
    #[cfg(test)]
    pub(crate) const ALL: [Self; 16] = [
        Self::TaxonomyRegistry,
        Self::TaxonomyTerm,
        Self::GeoPlace,
        Self::Life,
        Self::LifeOrigin,
        Self::Manufacturer,
        Self::ActiveIngredient,
        Self::Condition,
        Self::Product,
        Self::EntityTaxonomy,
        Self::ProductActiveIngredient,
        Self::TreatmentProtocol,
        Self::TreatmentProtocolItem,
        Self::TreatmentProtocolDose,
        Self::SearchTerm,
        Self::MediaReference,
    ];
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct SystemRowDescriptor {
    pub case: SystemRowCase,
    pub table: SystemTable,
    pub identity: RowIdentity,
    pub columns: &'static [SystemColumn],
}

impl SystemRow {
    pub(crate) fn descriptor(&self) -> SystemRowDescriptor {
        use SystemColumn as C;

        match self {
            Self::TaxonomyRegistry { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::TaxonomyRegistry,
                table: SystemTable::TaxonomyRegistry,
                identity: RowIdentity::new(id.clone()),
                columns: &[C::Id, C::Domain, C::Purpose],
            },
            Self::TaxonomyTerm {
                taxonomy_id,
                term_key,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::TaxonomyTerm,
                table: SystemTable::TaxonomyTerms,
                identity: RowIdentity::new(format!("{taxonomy_id}/{term_key}")),
                columns: &[
                    C::TaxonomyId,
                    C::TermKey,
                    C::ParentTermKey,
                    C::Label,
                    C::NormalizedLabel,
                    C::AliasesJson,
                    C::SortOrder,
                ],
            },
            Self::GeoPlace { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::GeoPlace,
                table: SystemTable::GeoPlaces,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::PlaceType,
                    C::ParentPlaceId,
                    C::CountryCodesJson,
                    C::Latitude,
                    C::Longitude,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                ],
            },
            Self::Life { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::Life,
                table: SystemTable::LifeReferenceItems,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::SizeTermKey,
                    C::AliasesJson,
                    C::StageMetricsJson,
                    C::ContentJson,
                ],
            },
            Self::LifeOrigin {
                life_id, place_id, ..
            } => SystemRowDescriptor {
                case: SystemRowCase::LifeOrigin,
                table: SystemTable::LifeOriginPlaces,
                identity: RowIdentity::new(format!("{life_id}/{place_id}")),
                columns: &[C::LifeId, C::PlaceId, C::SortOrder],
            },
            Self::Manufacturer { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::Manufacturer,
                table: SystemTable::ManufacturerCatalogItems,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::RegionsJson,
                    C::Website,
                    C::ContentJson,
                ],
            },
            Self::ActiveIngredient { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::ActiveIngredient,
                table: SystemTable::ActiveIngredientCatalogItems,
                identity: RowIdentity::new(id.clone()),
                columns: &[
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
                ],
            },
            Self::Condition { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::Condition,
                table: SystemTable::ConditionCatalogItems,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::Name,
                    C::NormalizedName,
                    C::AliasesJson,
                    C::RegionsJson,
                    C::ContentJson,
                ],
            },
            Self::Product { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::Product,
                table: SystemTable::ProductCatalogItems,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::Name,
                    C::NormalizedName,
                    C::ApplicableTaxonTermKeysJson,
                    C::ApplicableLifeStagesJson,
                    C::TherapeuticSpectrum,
                    C::AliasesJson,
                    C::ManufacturerId,
                    C::RegionsJson,
                    C::RegulatoryIdentifiersJson,
                    C::CommercialLine,
                    C::PresentationDosage,
                    C::TargetSpeciesWarningsJson,
                    C::ContentJson,
                ],
            },
            Self::EntityTaxonomy {
                entity_type,
                entity_id,
                taxonomy_id,
                term_key,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::EntityTaxonomy,
                table: SystemTable::EntityTaxonomyTerms,
                identity: RowIdentity::new(format!(
                    "{entity_type}/{entity_id}/{taxonomy_id}/{term_key}"
                )),
                columns: &[
                    C::EntityType,
                    C::EntityId,
                    C::TaxonomyId,
                    C::TermKey,
                    C::SortOrder,
                ],
            },
            Self::ProductActiveIngredient {
                product_id,
                active_ingredient_id,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::ProductActiveIngredient,
                table: SystemTable::ProductActiveIngredients,
                identity: RowIdentity::new(format!("{product_id}/{active_ingredient_id}")),
                columns: &[C::ProductId, C::ActiveIngredientId, C::SortOrder],
            },
            Self::TreatmentProtocol { id, .. } => SystemRowDescriptor {
                case: SystemRowCase::TreatmentProtocol,
                table: SystemTable::TreatmentProtocols,
                identity: RowIdentity::new(id.clone()),
                columns: &[
                    C::Id,
                    C::Kind,
                    C::Name,
                    C::NormalizedName,
                    C::ApplicableTaxonTermKeysJson,
                    C::Observation,
                ],
            },
            Self::TreatmentProtocolItem {
                protocol_id,
                product_id,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::TreatmentProtocolItem,
                table: SystemTable::TreatmentProtocolItems,
                identity: RowIdentity::new(format!("{protocol_id}/{product_id}")),
                columns: &[C::ProtocolId, C::ProductId, C::SortOrder],
            },
            Self::TreatmentProtocolDose {
                protocol_id,
                dose_id,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::TreatmentProtocolDose,
                table: SystemTable::TreatmentProtocolDoses,
                identity: RowIdentity::new(format!("{protocol_id}/{dose_id}")),
                columns: &[
                    C::ProtocolId,
                    C::DoseId,
                    C::Label,
                    C::ValidityValue,
                    C::ValidityUnit,
                    C::SortOrder,
                ],
            },
            Self::SearchTerm {
                entity_type,
                entity_id,
                sort_order,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::SearchTerm,
                table: SystemTable::EntitySearchTerms,
                identity: RowIdentity::new(format!("{entity_type}/{entity_id}/{sort_order}")),
                columns: &[
                    C::EntityType,
                    C::EntityId,
                    C::Value,
                    C::NormalizedValue,
                    C::Provenance,
                    C::SortOrder,
                ],
            },
            Self::MediaReference {
                entity_type,
                entity_id,
                role,
                sort_order,
                ..
            } => SystemRowDescriptor {
                case: SystemRowCase::MediaReference,
                table: SystemTable::EntityMediaReferences,
                identity: RowIdentity::new(format!(
                    "{entity_type}/{entity_id}/{role}/{sort_order}"
                )),
                columns: &[
                    C::EntityType,
                    C::EntityId,
                    C::Role,
                    C::MediaKey,
                    C::SortOrder,
                ],
            },
        }
    }

    pub(crate) fn table(&self) -> SystemTable {
        self.descriptor().table
    }

    pub(crate) fn materialized_columns(&self) -> &'static [SystemColumn] {
        self.descriptor().columns
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::projection::contract::representative_row;
    use std::collections::BTreeSet;

    #[test]
    fn all_sixteen_descriptors_are_unique_complete_and_ordered() {
        let expected = [
            (
                SystemRowCase::TaxonomyRegistry,
                SystemTable::TaxonomyRegistry,
                "taxonomy-registry",
            ),
            (
                SystemRowCase::TaxonomyTerm,
                SystemTable::TaxonomyTerms,
                "taxonomy-registry/term-taxonomy",
            ),
            (SystemRowCase::GeoPlace, SystemTable::GeoPlaces, "place-br"),
            (
                SystemRowCase::Life,
                SystemTable::LifeReferenceItems,
                "4a178a4e-bd91-46ce-aef6-2c4998f73f65",
            ),
            (
                SystemRowCase::LifeOrigin,
                SystemTable::LifeOriginPlaces,
                "4a178a4e-bd91-46ce-aef6-2c4998f73f65/place-br",
            ),
            (
                SystemRowCase::Manufacturer,
                SystemTable::ManufacturerCatalogItems,
                "manufacturer-one",
            ),
            (
                SystemRowCase::ActiveIngredient,
                SystemTable::ActiveIngredientCatalogItems,
                "ingredient-one",
            ),
            (
                SystemRowCase::Condition,
                SystemTable::ConditionCatalogItems,
                "condition-one",
            ),
            (
                SystemRowCase::Product,
                SystemTable::ProductCatalogItems,
                "product-one",
            ),
            (
                SystemRowCase::EntityTaxonomy,
                SystemTable::EntityTaxonomyTerms,
                "product/product-one/taxonomy-registry/term-taxonomy",
            ),
            (
                SystemRowCase::ProductActiveIngredient,
                SystemTable::ProductActiveIngredients,
                "product-one/ingredient-one",
            ),
            (
                SystemRowCase::TreatmentProtocol,
                SystemTable::TreatmentProtocols,
                "protocol-one",
            ),
            (
                SystemRowCase::TreatmentProtocolItem,
                SystemTable::TreatmentProtocolItems,
                "protocol-one/product-one",
            ),
            (
                SystemRowCase::TreatmentProtocolDose,
                SystemTable::TreatmentProtocolDoses,
                "protocol-one/dose-one",
            ),
            (
                SystemRowCase::SearchTerm,
                SystemTable::EntitySearchTerms,
                "product/product-one/80",
            ),
            (
                SystemRowCase::MediaReference,
                SystemTable::EntityMediaReferences,
                "product/product-one/cover/90",
            ),
        ];
        let mut cases = BTreeSet::new();
        let mut tables = BTreeSet::new();
        let mut identities = BTreeSet::new();
        let mut columns = BTreeSet::new();

        for (case, table, identity) in expected {
            let descriptor = representative_row(case).descriptor();
            assert_eq!(descriptor.case, case);
            assert_eq!(descriptor.table, table);
            assert_eq!(descriptor.identity.to_string(), identity);
            assert!(!descriptor.columns.is_empty());
            assert_eq!(
                descriptor
                    .columns
                    .iter()
                    .copied()
                    .collect::<BTreeSet<_>>()
                    .len(),
                descriptor.columns.len(),
                "descriptor {case:?} repeats a column"
            );
            assert!(cases.insert(descriptor.case));
            assert!(tables.insert(descriptor.table));
            assert!(identities.insert((descriptor.table, descriptor.identity)));
            columns.extend(descriptor.columns.iter().copied());
        }

        assert_eq!(cases, SystemRowCase::ALL.into_iter().collect());
        assert_eq!(
            tables,
            SystemTable::SYSTEM_PROJECTABLE.into_iter().collect()
        );
        assert_eq!(columns, SystemColumn::ALL.into_iter().collect());
    }
}
