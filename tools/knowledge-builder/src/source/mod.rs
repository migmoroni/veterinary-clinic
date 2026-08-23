use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    fmt,
    path::{Path, PathBuf},
};

pub const LOCALES: [KnowledgeLocale; 6] = [
    KnowledgeLocale::PtBr,
    KnowledgeLocale::PtPt,
    KnowledgeLocale::GnPy,
    KnowledgeLocale::EnUs,
    KnowledgeLocale::EsEs,
    KnowledgeLocale::FrFr,
];

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Serialize)]
pub enum KnowledgeLocale {
    PtBr,
    PtPt,
    GnPy,
    EnUs,
    EsEs,
    FrFr,
}

impl KnowledgeLocale {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PtBr => "pt-BR",
            Self::PtPt => "pt-PT",
            Self::GnPy => "gn-PY",
            Self::EnUs => "en-US",
            Self::EsEs => "es-ES",
            Self::FrFr => "fr-FR",
        }
    }
}

impl fmt::Display for KnowledgeLocale {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Localized<T> {
    #[serde(rename = "pt-BR")]
    pub pt_br: T,
    #[serde(rename = "pt-PT")]
    pub pt_pt: T,
    #[serde(rename = "gn-PY")]
    pub gn_py: T,
    #[serde(rename = "en-US")]
    pub en_us: T,
    #[serde(rename = "es-ES")]
    pub es_es: T,
    #[serde(rename = "fr-FR")]
    pub fr_fr: T,
}

impl<T> Localized<T> {
    pub fn get(&self, locale: KnowledgeLocale) -> &T {
        match locale {
            KnowledgeLocale::PtBr => &self.pt_br,
            KnowledgeLocale::PtPt => &self.pt_pt,
            KnowledgeLocale::GnPy => &self.gn_py,
            KnowledgeLocale::EnUs => &self.en_us,
            KnowledgeLocale::EsEs => &self.es_es,
            KnowledgeLocale::FrFr => &self.fr_fr,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(untagged)]
pub enum LocalizedValue {
    Text(Localized<String>),
    List(Localized<Vec<String>>),
}

impl LocalizedValue {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::Text(_) => "text",
            Self::List(_) => "list",
        }
    }

    pub fn values(&self, locale: KnowledgeLocale) -> Vec<&str> {
        match self {
            Self::Text(value) => vec![value.get(locale).as_str()],
            Self::List(value) => value.get(locale).iter().map(String::as_str).collect(),
        }
    }

    pub fn text(&self, locale: KnowledgeLocale) -> Option<&str> {
        match self {
            Self::Text(value) => Some(value.get(locale)),
            Self::List(_) => None,
        }
    }

    pub fn list(&self, locale: KnowledgeLocale) -> Option<&[String]> {
        match self {
            Self::List(value) => Some(value.get(locale)),
            Self::Text(_) => None,
        }
    }
}

pub type LocalizedContent = BTreeMap<String, LocalizedValue>;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct SectionDeclaration {
    #[serde(rename = "sectionKey")]
    pub section_key: String,
    #[serde(rename = "sectionNumber")]
    pub section_number: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct MeasurementRange {
    pub male: [f64; 2],
    pub female: [f64; 2],
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Centroid {
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Nomenclature {
    #[serde(rename = "scientificName")]
    pub scientific_name: Option<String>,
    #[serde(rename = "casNumber")]
    pub cas_number: Option<String>,
    #[serde(rename = "denominationStandards")]
    pub denomination_standards: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct RegulatoryIdentifiers {
    #[serde(rename = "brazilMapa")]
    pub brazil_mapa: Option<String>,
    #[serde(rename = "unitedStatesNada")]
    pub united_states_nada: Option<String>,
    #[serde(rename = "unitedStatesAnada")]
    pub united_states_anada: Option<String>,
    #[serde(rename = "gtinEan")]
    pub gtin_ean: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ProductEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "typeTermKey")]
    pub type_term_key: String,
    #[serde(rename = "classificationTermKeys")]
    pub classification_term_keys: Vec<String>,
    pub species: Vec<String>,
    pub regions: Vec<String>,
    #[serde(rename = "manufacturerId")]
    pub manufacturer_id: String,
    #[serde(rename = "activeIngredientIds")]
    pub active_ingredient_ids: Vec<String>,
    #[serde(rename = "regulatoryIdentifiers")]
    pub regulatory_identifiers: RegulatoryIdentifiers,
    #[serde(rename = "targetTermKeys")]
    pub target_term_keys: Option<Vec<String>>,
    #[serde(rename = "vaccineProfileTermKeys")]
    pub vaccine_profile_term_keys: Option<Vec<String>>,
    #[serde(rename = "lifeStageTermKeys")]
    pub life_stage_term_keys: Option<Vec<String>>,
    #[serde(rename = "therapeuticScopeTermKeys")]
    pub therapeutic_scope_term_keys: Option<Vec<String>>,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    #[serde(rename = "contentPath")]
    pub content_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ManufacturerEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "typeTermKey")]
    pub type_term_key: String,
    #[serde(rename = "classificationTermKeys")]
    pub classification_term_keys: Vec<String>,
    pub regions: Vec<String>,
    pub website: Option<String>,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    #[serde(rename = "contentPath")]
    pub content_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ActiveIngredientEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "typeTermKey")]
    pub type_term_key: String,
    #[serde(rename = "classificationTermKeys")]
    pub classification_term_keys: Vec<String>,
    pub regions: Vec<String>,
    pub nomenclature: Nomenclature,
    #[serde(rename = "atcVetCode")]
    pub atc_vet_code: Option<String>,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    #[serde(rename = "contentPath")]
    pub content_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ConditionEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "typeTermKey")]
    pub type_term_key: String,
    #[serde(rename = "classificationTermKeys")]
    pub classification_term_keys: Vec<String>,
    pub regions: Vec<String>,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    #[serde(rename = "contentPath")]
    pub content_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct BreedEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    pub species: Vec<String>,
    #[serde(rename = "originPlaceIds")]
    pub origin_place_ids: Vec<String>,
    #[serde(rename = "sizeTermKey")]
    pub size_term_key: String,
    #[serde(rename = "averageWeightKg")]
    pub average_weight_kg: MeasurementRange,
    #[serde(rename = "averageHeightCm")]
    pub average_height_cm: MeasurementRange,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    #[serde(rename = "contentPath")]
    pub content_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct GeoPlaceEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    #[serde(rename = "placeType")]
    pub place_type: String,
    #[serde(rename = "countryCodes")]
    pub country_codes: Vec<String>,
    #[serde(rename = "parentPlaceId")]
    pub parent_place_id: Option<String>,
    pub centroid: Centroid,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ProtocolDose {
    pub id: String,
    #[serde(rename = "validityValue")]
    pub validity_value: u32,
    #[serde(rename = "validityUnit")]
    pub validity_unit: String,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TreatmentProtocolEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    pub kind: String,
    pub species: Vec<String>,
    #[serde(rename = "productIds")]
    pub product_ids: Vec<String>,
    pub doses: Vec<ProtocolDose>,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TaxonomyTerm {
    pub key: String,
    #[serde(rename = "parentKey")]
    pub parent_key: Option<String>,
    pub order: u32,
    #[serde(rename = "localizedContent")]
    pub localized_content: LocalizedContent,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct TaxonomyEntity {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub id: String,
    pub domain: String,
    pub purpose: String,
    pub terms: Vec<TaxonomyTerm>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "entityType")]
pub enum CanonicalEntity {
    #[serde(rename = "breed")]
    Breed(BreedEntity),
    #[serde(rename = "product")]
    Product(ProductEntity),
    #[serde(rename = "manufacturer")]
    Manufacturer(ManufacturerEntity),
    #[serde(rename = "active_ingredient")]
    ActiveIngredient(ActiveIngredientEntity),
    #[serde(rename = "condition")]
    Condition(ConditionEntity),
    #[serde(rename = "geo_place")]
    GeoPlace(GeoPlaceEntity),
    #[serde(rename = "taxonomy")]
    Taxonomy(TaxonomyEntity),
    #[serde(rename = "treatment_protocol")]
    TreatmentProtocol(TreatmentProtocolEntity),
}

impl CanonicalEntity {
    pub fn entity_type(&self) -> &'static str {
        match self {
            Self::Breed(_) => "breed",
            Self::Product(_) => "product",
            Self::Manufacturer(_) => "manufacturer",
            Self::ActiveIngredient(_) => "active_ingredient",
            Self::Condition(_) => "condition",
            Self::GeoPlace(_) => "geo_place",
            Self::Taxonomy(_) => "taxonomy",
            Self::TreatmentProtocol(_) => "treatment_protocol",
        }
    }

    pub fn id(&self) -> &str {
        match self {
            Self::Breed(value) => &value.id,
            Self::Product(value) => &value.id,
            Self::Manufacturer(value) => &value.id,
            Self::ActiveIngredient(value) => &value.id,
            Self::Condition(value) => &value.id,
            Self::GeoPlace(value) => &value.id,
            Self::Taxonomy(value) => &value.id,
            Self::TreatmentProtocol(value) => &value.id,
        }
    }

    pub fn schema_version(&self) -> u32 {
        match self {
            Self::Breed(value) => value.schema_version,
            Self::Product(value) => value.schema_version,
            Self::Manufacturer(value) => value.schema_version,
            Self::ActiveIngredient(value) => value.schema_version,
            Self::Condition(value) => value.schema_version,
            Self::GeoPlace(value) => value.schema_version,
            Self::Taxonomy(value) => value.schema_version,
            Self::TreatmentProtocol(value) => value.schema_version,
        }
    }

    pub fn localized_content(&self) -> Option<&LocalizedContent> {
        match self {
            Self::Breed(value) => Some(&value.localized_content),
            Self::Product(value) => Some(&value.localized_content),
            Self::Manufacturer(value) => Some(&value.localized_content),
            Self::ActiveIngredient(value) => Some(&value.localized_content),
            Self::Condition(value) => Some(&value.localized_content),
            Self::GeoPlace(value) => Some(&value.localized_content),
            Self::Taxonomy(_) => None,
            Self::TreatmentProtocol(value) => Some(&value.localized_content),
        }
    }

    pub fn sections(&self) -> &[SectionDeclaration] {
        match self {
            Self::Breed(value) => &value.sections,
            Self::Product(value) => &value.sections,
            Self::Manufacturer(value) => &value.sections,
            Self::ActiveIngredient(value) => &value.sections,
            Self::Condition(value) => &value.sections,
            Self::GeoPlace(_) | Self::Taxonomy(_) | Self::TreatmentProtocol(_) => &[],
        }
    }

    pub fn content_path(&self) -> Option<&str> {
        match self {
            Self::Breed(value) => value.content_path.as_deref(),
            Self::Product(value) => value.content_path.as_deref(),
            Self::Manufacturer(value) => value.content_path.as_deref(),
            Self::ActiveIngredient(value) => value.content_path.as_deref(),
            Self::Condition(value) => value.content_path.as_deref(),
            Self::GeoPlace(_) | Self::Taxonomy(_) | Self::TreatmentProtocol(_) => None,
        }
    }
}

#[derive(Clone, Debug)]
pub struct SourceEntry {
    pub manifest_path: PathBuf,
    pub entity_directory: PathBuf,
    pub entity: CanonicalEntity,
}

pub fn deserialize_entity(path: &Path, bytes: &[u8]) -> Result<CanonicalEntity, String> {
    let raw: Value = serde_json::from_slice(bytes)
        .map_err(|error| format!("{}: invalid JSON: {error}", path.display()))?;
    validate_top_level_keys(path, &raw)?;
    serde_json::from_value(raw)
        .map_err(|error| format!("{}: schema violation: {error}", path.display()))
}

fn validate_top_level_keys(path: &Path, raw: &Value) -> Result<(), String> {
    let object = raw
        .as_object()
        .ok_or_else(|| format!("{}: entity manifest must be an object", path.display()))?;
    let entity_type = object
        .get("entityType")
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{}: entityType is required", path.display()))?;
    let (required, optional): (&[&str], &[&str]) = match entity_type {
        "product" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "typeTermKey",
                "classificationTermKeys",
                "species",
                "regions",
                "manufacturerId",
                "activeIngredientIds",
                "regulatoryIdentifiers",
                "localizedContent",
                "sections",
            ],
            &[
                "contentPath",
                "targetTermKeys",
                "vaccineProfileTermKeys",
                "lifeStageTermKeys",
                "therapeuticScopeTermKeys",
            ],
        ),
        "manufacturer" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "typeTermKey",
                "classificationTermKeys",
                "regions",
                "website",
                "localizedContent",
                "sections",
            ],
            &["contentPath"],
        ),
        "active_ingredient" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "typeTermKey",
                "classificationTermKeys",
                "regions",
                "nomenclature",
                "atcVetCode",
                "localizedContent",
                "sections",
            ],
            &["contentPath"],
        ),
        "condition" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "typeTermKey",
                "classificationTermKeys",
                "regions",
                "localizedContent",
                "sections",
            ],
            &["contentPath"],
        ),
        "breed" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "species",
                "originPlaceIds",
                "sizeTermKey",
                "averageWeightKg",
                "averageHeightCm",
                "localizedContent",
                "sections",
            ],
            &["contentPath"],
        ),
        "geo_place" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "placeType",
                "countryCodes",
                "parentPlaceId",
                "centroid",
                "localizedContent",
            ],
            &[],
        ),
        "treatment_protocol" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "kind",
                "species",
                "productIds",
                "doses",
                "localizedContent",
            ],
            &[],
        ),
        "taxonomy" => (
            &[
                "schemaVersion",
                "entityType",
                "id",
                "domain",
                "purpose",
                "terms",
            ],
            &[],
        ),
        _ => {
            return Err(format!(
                "{}: unsupported entityType {entity_type}",
                path.display()
            ))
        }
    };
    for key in required {
        if !object.contains_key(*key) {
            return Err(format!("{}: missing required field {key}", path.display()));
        }
    }
    for key in object.keys() {
        if !required.contains(&key.as_str()) && !optional.contains(&key.as_str()) {
            return Err(format!("{}: unexpected field {key}", path.display()));
        }
    }
    Ok(())
}

pub fn source_schema_fingerprint_input() -> &'static [&'static str] {
    &[
        include_str!("../../schemas/source/common.schema.json"),
        include_str!("../../schemas/source/active_ingredient.schema.json"),
        include_str!("../../schemas/source/breed.schema.json"),
        include_str!("../../schemas/source/condition.schema.json"),
        include_str!("../../schemas/source/geo_place.schema.json"),
        include_str!("../../schemas/source/manufacturer.schema.json"),
        include_str!("../../schemas/source/product.schema.json"),
        include_str!("../../schemas/source/taxonomy.schema.json"),
        include_str!("../../schemas/source/treatment_protocol.schema.json"),
    ]
}
