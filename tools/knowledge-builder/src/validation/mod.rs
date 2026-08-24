use crate::{
    markdown::{compile_document, CompiledDocument, CompiledMediaReference},
    media::{resolve_media, sha256_hex, MediaAsset},
    normalization::normalize_search_text,
    source::{
        deserialize_entity, source_schema_fingerprint_input, CanonicalEntity, KnowledgeLocale,
        LocalizedContent, LocalizedValue, SourceEntry, TaxonomyEntity, LOCALES,
    },
};
use serde::Serialize;
use serde_json::Value;
use std::{
    collections::{BTreeMap, BTreeSet},
    fmt, fs,
    path::{Path, PathBuf},
};

#[derive(Clone, Debug, Serialize)]
pub struct Diagnostic {
    pub path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub section: Option<String>,
    pub message: String,
}

impl Diagnostic {
    fn source(path: &Path, message: impl Into<String>) -> Self {
        Self {
            path: path.display().to_string(),
            entity: None,
            field: None,
            locale: None,
            section: None,
            message: message.into(),
        }
    }

    fn entity(entry: &SourceEntry, field: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            path: entry.manifest_path.display().to_string(),
            entity: Some(format!(
                "{}:{}",
                entry.entity.entity_type(),
                entry.entity.id()
            )),
            field: Some(field.into()),
            locale: None,
            section: None,
            message: message.into(),
        }
    }

    fn editorial(
        path: &Path,
        entry: &SourceEntry,
        locale: KnowledgeLocale,
        message: impl Into<String>,
    ) -> Self {
        Self {
            path: path.display().to_string(),
            entity: Some(format!(
                "{}:{}",
                entry.entity.entity_type(),
                entry.entity.id()
            )),
            field: Some("sections".to_string()),
            locale: Some(locale.to_string()),
            section: None,
            message: message.into(),
        }
    }
}

#[derive(Clone, Debug)]
pub struct ValidationError {
    pub diagnostics: Vec<Diagnostic>,
}

impl fmt::Display for ValidationError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(
            formatter,
            "knowledge source validation failed with {} diagnostic(s)",
            self.diagnostics.len()
        )?;
        for diagnostic in &self.diagnostics {
            write!(formatter, "{}", diagnostic.path)?;
            if let Some(entity) = &diagnostic.entity {
                write!(formatter, " [{entity}]")?;
            }
            if let Some(field) = &diagnostic.field {
                write!(formatter, " field={field}")?;
            }
            if let Some(locale) = &diagnostic.locale {
                write!(formatter, " locale={locale}")?;
            }
            if let Some(section) = &diagnostic.section {
                write!(formatter, " section={section}")?;
            }
            writeln!(formatter, ": {}", diagnostic.message)?;
        }
        Ok(())
    }
}

impl std::error::Error for ValidationError {}

#[derive(Clone, Debug)]
pub(crate) struct ValidatedEntity {
    pub source: SourceEntry,
    pub editorial: BTreeMap<KnowledgeLocale, CompiledDocument>,
    pub structural_media: Vec<ValidatedMediaReference>,
    pub markdown_media: BTreeMap<KnowledgeLocale, Vec<CompiledMediaReference>>,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct ValidatedMediaReference {
    pub role: &'static str,
    pub sort_order: usize,
    pub media_key: String,
}

#[derive(Clone, Debug)]
pub struct ValidatedSource {
    pub(crate) entities: Vec<ValidatedEntity>,
    pub(crate) taxonomies: BTreeMap<(String, String), TaxonomyEntity>,
    pub(crate) media: BTreeMap<String, MediaAsset>,
    pub(crate) media_keys_by_locale: BTreeMap<KnowledgeLocale, BTreeSet<String>>,
    pub(crate) source_digest_sha256: String,
    pub(crate) relation_count: usize,
    pub(crate) localized_fragments_by_locale: BTreeMap<KnowledgeLocale, usize>,
    pub(crate) source_files: usize,
}

impl ValidatedSource {
    pub fn entity_count(&self) -> usize {
        self.entities.len()
    }

    pub fn relation_count(&self) -> usize {
        self.relation_count
    }

    pub fn localized_fragment_count(&self) -> usize {
        self.localized_fragments_by_locale.values().sum()
    }

    pub fn source_digest_sha256(&self) -> &str {
        &self.source_digest_sha256
    }
}

pub fn validate_source(source_root: &Path) -> Result<ValidatedSource, ValidationError> {
    let mut diagnostics = Vec::new();
    let source_root = match fs::canonicalize(source_root) {
        Ok(path) if path.is_dir() => path,
        Ok(path) => {
            return Err(ValidationError {
                diagnostics: vec![Diagnostic::source(&path, "source must be a directory")],
            })
        }
        Err(error) => {
            return Err(ValidationError {
                diagnostics: vec![Diagnostic::source(
                    source_root,
                    format!("cannot resolve source directory: {error}"),
                )],
            })
        }
    };
    let files = match discover_files(&source_root, &mut diagnostics) {
        Ok(files) => files,
        Err(error) => {
            diagnostics.push(Diagnostic::source(&source_root, error));
            return Err(ValidationError { diagnostics });
        }
    };
    let entity_paths = files
        .iter()
        .filter(|path| path.file_name().is_some_and(|name| name == "entity.json"))
        .cloned()
        .collect::<Vec<_>>();
    if entity_paths.is_empty() {
        diagnostics.push(Diagnostic::source(
            &source_root,
            "no entity.json manifests were discovered",
        ));
    }
    let mut entries = Vec::new();
    for path in entity_paths {
        match fs::read(&path)
            .map_err(|error| format!("cannot read manifest: {error}"))
            .and_then(|bytes| {
                if String::from_utf8_lossy(&bytes).contains("searchConcept") {
                    return Err("generic searchConcept values are forbidden".to_string());
                }
                deserialize_entity(&path, &bytes)
            }) {
            Ok(entity) => entries.push(SourceEntry {
                entity_directory: path.parent().unwrap_or(&source_root).to_path_buf(),
                manifest_path: path,
                entity,
            }),
            Err(error) => diagnostics.push(Diagnostic::source(&path, error)),
        }
    }
    entries.sort_by(|left, right| {
        (left.entity.entity_type(), left.entity.id())
            .cmp(&(right.entity.entity_type(), right.entity.id()))
    });
    let mut identities = BTreeSet::new();
    for entry in &entries {
        let identity = (entry.entity.entity_type(), entry.entity.id());
        if !identities.insert(identity) {
            diagnostics.push(Diagnostic::entity(entry, "id", "duplicate entity identity"));
        }
        validate_entity_shape(entry, &mut diagnostics);
    }

    let taxonomies = collect_taxonomies(&entries, &mut diagnostics);
    validate_references(&entries, &taxonomies, &mut diagnostics);
    validate_alias_ownership(&entries, &taxonomies, &mut diagnostics);

    let mut referenced_markdown = BTreeSet::new();
    let mut media = BTreeMap::new();
    let mut media_keys_by_locale = LOCALES
        .into_iter()
        .map(|locale| (locale, BTreeSet::new()))
        .collect::<BTreeMap<_, _>>();
    let mut validated_entities = Vec::with_capacity(entries.len());
    for entry in entries {
        let mut editorial = BTreeMap::new();
        let mut markdown_media = BTreeMap::new();
        let mut structural_media = Vec::new();
        if let Some(declaration) = entry.entity.structural_media() {
            let mut declared_paths = Vec::new();
            if let Some(cover) = &declaration.cover {
                declared_paths.push(("cover", 0usize, cover));
            }
            for (index, gallery) in declaration.gallery.iter().enumerate() {
                if declaration.cover.as_ref() == Some(gallery) {
                    diagnostics.push(Diagnostic::entity(
                        &entry,
                        "media.gallery",
                        "cover must not be repeated in gallery",
                    ));
                }
                declared_paths.push(("gallery", index, gallery));
            }
            for (role, sort_order, relative_path) in declared_paths {
                let source_path = entry.entity_directory.join(relative_path);
                match resolve_media(
                    &entry.entity_directory,
                    entry.entity.entity_type(),
                    entry.entity.id(),
                    &source_path,
                ) {
                    Ok(asset) => {
                        for keys in media_keys_by_locale.values_mut() {
                            keys.insert(asset.media_key.clone());
                        }
                        structural_media.push(ValidatedMediaReference {
                            role,
                            sort_order,
                            media_key: asset.media_key.clone(),
                        });
                        if let Some(previous) = media.insert(asset.media_key.clone(), asset.clone())
                        {
                            if previous.content_hash_sha256 != asset.content_hash_sha256 {
                                diagnostics.push(Diagnostic::entity(
                                    &entry,
                                    "media",
                                    format!("media key collision: {}", asset.media_key),
                                ));
                            }
                        }
                    }
                    Err(error) => diagnostics.push(Diagnostic::entity(&entry, "media", error)),
                }
            }
        }
        if !entry.entity.sections().is_empty() {
            let content_directory = resolve_content_directory(&entry);
            match content_directory.and_then(|directory| exact_content_files(&directory)) {
                Ok(paths) => {
                    for (locale, path) in paths {
                        referenced_markdown.insert(path.clone());
                        match compile_document(
                            &path,
                            &entry.entity_directory,
                            entry.entity.entity_type(),
                            entry.entity.id(),
                            entry.entity.sections(),
                        ) {
                            Ok(compiled) => {
                                for asset in compiled.media {
                                    media_keys_by_locale
                                        .get_mut(&locale)
                                        .expect("all locales are registered")
                                        .insert(asset.media_key.clone());
                                    if let Some(previous) =
                                        media.insert(asset.media_key.clone(), asset.clone())
                                    {
                                        if previous.content_hash_sha256 != asset.content_hash_sha256
                                            || previous.relative_path != asset.relative_path
                                        {
                                            diagnostics.push(Diagnostic::editorial(
                                                &path,
                                                &entry,
                                                locale,
                                                format!("media key collision: {}", asset.media_key),
                                            ));
                                        }
                                    }
                                }
                                markdown_media.insert(locale, compiled.media_references);
                                editorial.insert(locale, compiled.document);
                            }
                            Err(error) => diagnostics
                                .push(Diagnostic::editorial(&path, &entry, locale, error)),
                        }
                    }
                }
                Err(error) => diagnostics.push(Diagnostic::entity(&entry, "contentPath", error)),
            }
        }
        validated_entities.push(ValidatedEntity {
            source: entry,
            editorial,
            structural_media,
            markdown_media,
        });
    }
    validate_file_coverage(
        &source_root,
        &files,
        &referenced_markdown,
        &media,
        &mut diagnostics,
    );

    if !diagnostics.is_empty() {
        return Err(ValidationError { diagnostics });
    }

    let relation_count = relation_count(&validated_entities);
    let localized_fragments_by_locale = localized_fragment_counts(&validated_entities);
    let source_digest_sha256 =
        logical_digest(&validated_entities, &media).map_err(|message| ValidationError {
            diagnostics: vec![Diagnostic::source(&source_root, message)],
        })?;
    let source_files = validated_entities.len()
        + referenced_markdown.len()
        + media
            .values()
            .map(|asset| asset.source_path.as_path())
            .collect::<BTreeSet<_>>()
            .len();
    Ok(ValidatedSource {
        entities: validated_entities,
        taxonomies,
        media,
        media_keys_by_locale,
        source_digest_sha256,
        relation_count,
        localized_fragments_by_locale,
        source_files,
    })
}

fn discover_files(root: &Path, diagnostics: &mut Vec<Diagnostic>) -> Result<Vec<PathBuf>, String> {
    fn visit(
        directory: &Path,
        files: &mut Vec<PathBuf>,
        diagnostics: &mut Vec<Diagnostic>,
    ) -> Result<(), String> {
        let mut entries = fs::read_dir(directory)
            .map_err(|error| format!("cannot read {}: {error}", directory.display()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("cannot enumerate {}: {error}", directory.display()))?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let file_type = entry
                .file_type()
                .map_err(|error| format!("cannot inspect {}: {error}", path.display()))?;
            if file_type.is_symlink() {
                diagnostics.push(Diagnostic::source(&path, "symlinks are forbidden"));
            } else if file_type.is_dir() {
                if path.file_name().is_some_and(|value| value == "localized") {
                    diagnostics.push(Diagnostic::source(
                        &path,
                        "localized directories are forbidden",
                    ));
                }
                visit(&path, files, diagnostics)?;
            } else if file_type.is_file() {
                files.push(path);
            } else {
                diagnostics.push(Diagnostic::source(&path, "special files are forbidden"));
            }
        }
        Ok(())
    }
    let mut files = Vec::new();
    visit(root, &mut files, diagnostics)?;
    files.sort();
    Ok(files)
}

fn validate_entity_shape(entry: &SourceEntry, diagnostics: &mut Vec<Diagnostic>) {
    if entry.entity.schema_version() != 1 {
        diagnostics.push(Diagnostic::entity(
            entry,
            "schemaVersion",
            "schemaVersion must be 1",
        ));
    }
    if entry.entity.id().trim() != entry.entity.id() || entry.entity.id().is_empty() {
        diagnostics.push(Diagnostic::entity(
            entry,
            "id",
            "id must be non-empty and trimmed",
        ));
    }
    if matches!(
        entry.entity,
        CanonicalEntity::Product(_)
            | CanonicalEntity::Manufacturer(_)
            | CanonicalEntity::ActiveIngredient(_)
            | CanonicalEntity::Condition(_)
            | CanonicalEntity::TreatmentProtocol(_)
    ) && !is_uuid_v4(entry.entity.id())
    {
        diagnostics.push(Diagnostic::entity(
            entry,
            "id",
            "id must be a lowercase UUIDv4",
        ));
    }
    validate_localized_schema(entry, diagnostics);
    validate_sections(entry, diagnostics);

    match &entry.entity {
        CanonicalEntity::Product(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            validate_unique_texts(
                entry,
                "activeIngredientIds",
                &value.active_ingredient_ids,
                false,
                diagnostics,
            );
            for (field, values) in [
                ("targetTermKeys", value.target_term_keys.as_ref()),
                (
                    "vaccineProfileTermKeys",
                    value.vaccine_profile_term_keys.as_ref(),
                ),
                ("lifeStageTermKeys", value.life_stage_term_keys.as_ref()),
                (
                    "therapeuticScopeTermKeys",
                    value.therapeutic_scope_term_keys.as_ref(),
                ),
            ] {
                if let Some(values) = values {
                    validate_unique_texts(entry, field, values, true, diagnostics);
                }
            }
        }
        CanonicalEntity::Manufacturer(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            if value
                .website
                .as_deref()
                .is_some_and(|value| !value.starts_with("https://"))
            {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "website",
                    "website must use https",
                ));
            }
        }
        CanonicalEntity::ActiveIngredient(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
            validate_unique_texts(
                entry,
                "nomenclature.denominationStandards",
                &value.nomenclature.denomination_standards,
                false,
                diagnostics,
            );
            for standard in &value.nomenclature.denomination_standards {
                if !value
                    .localized_content
                    .contains_key(&format!("denomination_{standard}"))
                {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent",
                        format!("missing denomination_{standard}"),
                    ));
                }
            }
        }
        CanonicalEntity::Condition(value) => {
            validate_unique_texts(
                entry,
                "classificationTermKeys",
                &value.classification_term_keys,
                false,
                diagnostics,
            );
            validate_unique_texts(entry, "regions", &value.regions, false, diagnostics);
        }
        CanonicalEntity::Breed(value) => {
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(
                entry,
                "originPlaceIds",
                &value.origin_place_ids,
                true,
                diagnostics,
            );
            validate_range(
                entry,
                "averageWeightKg.male",
                value.average_weight_kg.male,
                diagnostics,
            );
            validate_range(
                entry,
                "averageWeightKg.female",
                value.average_weight_kg.female,
                diagnostics,
            );
            validate_range(
                entry,
                "averageHeightCm.male",
                value.average_height_cm.male,
                diagnostics,
            );
            validate_range(
                entry,
                "averageHeightCm.female",
                value.average_height_cm.female,
                diagnostics,
            );
        }
        CanonicalEntity::GeoPlace(value) => {
            validate_unique_texts(
                entry,
                "countryCodes",
                &value.country_codes,
                false,
                diagnostics,
            );
            let centroid_is_valid = match (value.centroid.latitude, value.centroid.longitude) {
                (Some(latitude), Some(longitude)) => {
                    (-90.0..=90.0).contains(&latitude) && (-180.0..=180.0).contains(&longitude)
                }
                (None, None) => true,
                _ => false,
            };
            if !centroid_is_valid {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "centroid",
                    "centroid is out of range",
                ));
            }
        }
        CanonicalEntity::TreatmentProtocol(value) => {
            if !matches!(value.kind.as_str(), "vaccine" | "antiparasitic") {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "kind",
                    "unsupported protocol kind",
                ));
            }
            validate_unique_texts(entry, "species", &value.species, true, diagnostics);
            validate_species(entry, &value.species, diagnostics);
            validate_unique_texts(entry, "productIds", &value.product_ids, true, diagnostics);
            let mut dose_ids = BTreeSet::new();
            for dose in &value.doses {
                if !dose_ids.insert(&dose.id) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "doses",
                        format!("duplicate dose {}", dose.id),
                    ));
                }
                if dose.validity_value == 0
                    || !matches!(dose.validity_unit.as_str(), "days" | "months" | "years")
                {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "doses",
                        format!("invalid dose {} validity", dose.id),
                    ));
                }
                validate_localized_content(
                    entry,
                    &dose.localized_content,
                    &["label"],
                    &[],
                    &["label"],
                    &format!("doses.{}.localizedContent", dose.id),
                    diagnostics,
                );
            }
        }
        CanonicalEntity::Taxonomy(value) => validate_taxonomy(entry, value, diagnostics),
    }
}

fn validate_localized_schema(entry: &SourceEntry, diagnostics: &mut Vec<Diagnostic>) {
    let Some(content) = entry.entity.localized_content() else {
        return;
    };
    match &entry.entity {
        CanonicalEntity::Product(_) => validate_localized_content(
            entry,
            content,
            &["name", "aliases"],
            &[
                "commercialLine",
                "presentationDosage",
                "targetSpeciesWarnings",
            ],
            &["name", "commercialLine", "presentationDosage"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::Manufacturer(_)
        | CanonicalEntity::Condition(_)
        | CanonicalEntity::Breed(_)
        | CanonicalEntity::GeoPlace(_) => validate_localized_content(
            entry,
            content,
            &["name", "aliases"],
            &[],
            &["name"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::ActiveIngredient(_) => {
            let dynamic = content
                .keys()
                .filter(|key| key.starts_with("denomination_"))
                .map(String::as_str)
                .collect::<Vec<_>>();
            let mut optional = vec!["atcVetSystem"];
            optional.extend(dynamic);
            let mut text = vec!["name", "atcVetSystem"];
            text.extend(
                content
                    .keys()
                    .filter(|key| key.starts_with("denomination_"))
                    .map(String::as_str),
            );
            validate_localized_content(
                entry,
                content,
                &["name", "aliases"],
                &optional,
                &text,
                "localizedContent",
                diagnostics,
            );
        }
        CanonicalEntity::TreatmentProtocol(_) => validate_localized_content(
            entry,
            content,
            &["name"],
            &["observation"],
            &["name", "observation"],
            "localizedContent",
            diagnostics,
        ),
        CanonicalEntity::Taxonomy(_) => {}
    }
}

fn validate_localized_content(
    entry: &SourceEntry,
    content: &LocalizedContent,
    required: &[&str],
    optional: &[&str],
    text_fields: &[&str],
    prefix: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for field in required {
        if !content.contains_key(*field) {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                "required localized field is missing",
            ));
        }
    }
    for (field, value) in content {
        if !required.contains(&field.as_str()) && !optional.contains(&field.as_str()) {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                "unsupported localized field",
            ));
            continue;
        }
        let expects_text = text_fields.contains(&field.as_str());
        if (expects_text && !matches!(value, LocalizedValue::Text(_)))
            || (!expects_text && !matches!(value, LocalizedValue::List(_)))
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                format!("{prefix}.{field}"),
                format!(
                    "expected {}, found {}",
                    if expects_text { "text" } else { "list" },
                    value.kind()
                ),
            ));
            continue;
        }
        for locale in LOCALES {
            let values = value.values(locale);
            let mut unique = BTreeSet::new();
            for item in &values {
                if !is_simple_text(item) {
                    diagnostics.push(Diagnostic {
                        path: entry.manifest_path.display().to_string(),
                        entity: Some(format!(
                            "{}:{}",
                            entry.entity.entity_type(),
                            entry.entity.id()
                        )),
                        field: Some(format!("{prefix}.{field}")),
                        locale: Some(locale.to_string()),
                        section: None,
                        message: "value must be non-empty trimmed simple text".to_string(),
                    });
                }
                if !unique.insert(*item) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        format!("{prefix}.{field}"),
                        format!("duplicate localized item for {locale}: {item}"),
                    ));
                }
            }
        }
    }
}

fn validate_sections(entry: &SourceEntry, diagnostics: &mut Vec<Diagnostic>) {
    let sections = entry.entity.sections();
    if sections.is_empty() {
        if entry.entity.content_path().is_some() {
            diagnostics.push(Diagnostic::entity(
                entry,
                "contentPath",
                "contentPath must be omitted without sections",
            ));
        }
        return;
    }
    if entry.entity.content_path().is_none() {
        diagnostics.push(Diagnostic::entity(
            entry,
            "contentPath",
            "contentPath is required for entities with sections",
        ));
    }
    let allowed: &[&str] = match entry.entity {
        CanonicalEntity::Product(_) => &[
            "about",
            "presentations",
            "indications",
            "administration",
            "interactions",
            "pharmacology",
            "studies",
            "videos",
            "distributors",
            "references",
        ],
        CanonicalEntity::Manufacturer(_) => &["about", "portfolio", "support", "references"],
        CanonicalEntity::ActiveIngredient(_) => &["about", "uses", "safety", "references"],
        CanonicalEntity::Condition(_) => &[
            "about",
            "clinicalSigns",
            "diagnosis",
            "management",
            "prevention",
            "references",
        ],
        CanonicalEntity::Breed(_) => &[
            "characteristics",
            "morphology",
            "behavior",
            "diseases",
            "references",
        ],
        _ => &[],
    };
    let mut keys = BTreeSet::new();
    for (index, section) in sections.iter().enumerate() {
        if section.section_number != u32::try_from(index + 1).unwrap_or(u32::MAX) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "sections",
                "sectionNumber must be contiguous and ordered",
            ));
        }
        if !allowed.contains(&section.section_key.as_str()) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "sections",
                format!("unsupported sectionKey {}", section.section_key),
            ));
        }
        if !keys.insert(&section.section_key) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "sections",
                format!("duplicate sectionKey {}", section.section_key),
            ));
        }
    }
}

fn validate_taxonomy(
    entry: &SourceEntry,
    taxonomy: &TaxonomyEntity,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if taxonomy.purpose.contains("search") {
        diagnostics.push(Diagnostic::entity(
            entry,
            "purpose",
            "generic search taxonomy is forbidden",
        ));
    }
    let mut keys = BTreeSet::new();
    for (index, term) in taxonomy.terms.iter().enumerate() {
        if term.order != u32::try_from(index).unwrap_or(u32::MAX) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} order must equal its array position", term.key),
            ));
        }
        if !keys.insert(&term.key) {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("duplicate term key {}", term.key),
            ));
        }
        validate_localized_content(
            entry,
            &term.localized_content,
            &["label"],
            &["aliases"],
            &["label"],
            &format!("terms.{}.localizedContent", term.key),
            diagnostics,
        );
        if term
            .localized_content
            .get("aliases")
            .is_some_and(|aliases| {
                LOCALES
                    .iter()
                    .all(|locale| aliases.values(*locale).is_empty())
            })
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} aliases field must be omitted when empty", term.key),
            ));
        }
    }
    for term in &taxonomy.terms {
        if term
            .parent_key
            .as_ref()
            .is_some_and(|parent| !keys.contains(parent))
        {
            diagnostics.push(Diagnostic::entity(
                entry,
                "terms",
                format!("term {} has unresolved parent", term.key),
            ));
        }
        let mut visited = BTreeSet::from([term.key.as_str()]);
        let mut parent = term.parent_key.as_deref();
        while let Some(key) = parent {
            if !visited.insert(key) {
                diagnostics.push(Diagnostic::entity(
                    entry,
                    "terms",
                    format!("term {} has a parent cycle", term.key),
                ));
                break;
            }
            parent = taxonomy
                .terms
                .iter()
                .find(|candidate| candidate.key == key)
                .and_then(|candidate| candidate.parent_key.as_deref());
        }
    }
}

fn collect_taxonomies(
    entries: &[SourceEntry],
    diagnostics: &mut Vec<Diagnostic>,
) -> BTreeMap<(String, String), TaxonomyEntity> {
    let mut result = BTreeMap::new();
    for entry in entries {
        let CanonicalEntity::Taxonomy(taxonomy) = &entry.entity else {
            continue;
        };
        let key = (taxonomy.domain.clone(), taxonomy.purpose.clone());
        if result.insert(key.clone(), taxonomy.clone()).is_some() {
            diagnostics.push(Diagnostic::entity(
                entry,
                "purpose",
                format!("duplicate taxonomy owner {}:{}", key.0, key.1),
            ));
        }
    }
    result
}

fn validate_references(
    entries: &[SourceEntry],
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let identities = entries
        .iter()
        .map(|entry| (entry.entity.entity_type(), entry.entity.id()))
        .collect::<BTreeSet<_>>();
    for entry in entries {
        match &entry.entity {
            CanonicalEntity::Product(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "product",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "product",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
                require_identity(
                    entry,
                    &identities,
                    "manufacturer",
                    &value.manufacturer_id,
                    "manufacturerId",
                    diagnostics,
                );
                for id in &value.active_ingredient_ids {
                    require_identity(
                        entry,
                        &identities,
                        "active_ingredient",
                        id,
                        "activeIngredientIds",
                        diagnostics,
                    );
                }
                for (purpose, field, values) in [
                    (
                        "target",
                        "targetTermKeys",
                        value.target_term_keys.as_deref(),
                    ),
                    (
                        "vaccine_profile",
                        "vaccineProfileTermKeys",
                        value.vaccine_profile_term_keys.as_deref(),
                    ),
                    (
                        "life_stage",
                        "lifeStageTermKeys",
                        value.life_stage_term_keys.as_deref(),
                    ),
                    (
                        "therapeutic_scope",
                        "therapeuticScopeTermKeys",
                        value.therapeutic_scope_term_keys.as_deref(),
                    ),
                ] {
                    require_terms(
                        entry,
                        taxonomies,
                        "product",
                        purpose,
                        values.unwrap_or(&[]),
                        field,
                        diagnostics,
                    );
                }
            }
            CanonicalEntity::Manufacturer(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "manufacturer",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "manufacturer",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::ActiveIngredient(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "active_ingredient",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "active_ingredient",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::Condition(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "condition",
                    "type",
                    &value.type_term_key,
                    "typeTermKey",
                    diagnostics,
                );
                require_terms(
                    entry,
                    taxonomies,
                    "condition",
                    "classification",
                    &value.classification_term_keys,
                    "classificationTermKeys",
                    diagnostics,
                );
            }
            CanonicalEntity::Breed(value) => {
                require_term(
                    entry,
                    taxonomies,
                    "breed",
                    "size",
                    &value.size_term_key,
                    "sizeTermKey",
                    diagnostics,
                );
                for id in &value.origin_place_ids {
                    require_identity(
                        entry,
                        &identities,
                        "geo_place",
                        id,
                        "originPlaceIds",
                        diagnostics,
                    );
                }
            }
            CanonicalEntity::GeoPlace(value) => {
                if let Some(id) = &value.parent_place_id {
                    require_identity(
                        entry,
                        &identities,
                        "geo_place",
                        id,
                        "parentPlaceId",
                        diagnostics,
                    );
                }
            }
            CanonicalEntity::TreatmentProtocol(value) => {
                for id in &value.product_ids {
                    require_identity(entry, &identities, "product", id, "productIds", diagnostics);
                }
            }
            CanonicalEntity::Taxonomy(_) => {}
        }
    }
}

fn require_term(
    entry: &SourceEntry,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    domain: &str,
    purpose: &str,
    key: &str,
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let taxonomy = taxonomies.get(&(domain.to_string(), purpose.to_string()));
    if !taxonomy.is_some_and(|value| value.terms.iter().any(|term| term.key == key)) {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            format!("unresolved or cross-domain taxonomy term {key}"),
        ));
    }
}

fn require_terms(
    entry: &SourceEntry,
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    domain: &str,
    purpose: &str,
    keys: &[String],
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for key in keys {
        require_term(entry, taxonomies, domain, purpose, key, field, diagnostics);
    }
}

fn require_identity(
    entry: &SourceEntry,
    identities: &BTreeSet<(&str, &str)>,
    entity_type: &str,
    id: &str,
    field: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if !identities.contains(&(entity_type, id)) {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            format!("unresolved {entity_type} id {id}"),
        ));
    }
}

fn validate_alias_ownership(
    entries: &[SourceEntry],
    taxonomies: &BTreeMap<(String, String), TaxonomyEntity>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    for locale in LOCALES {
        let mut owners = BTreeMap::<String, String>::new();
        for entry in entries {
            let Some(content) = entry.entity.localized_content() else {
                continue;
            };
            let Some(aliases) = content.get("aliases").and_then(|value| value.list(locale)) else {
                continue;
            };
            for alias in aliases {
                let normalized = normalize_search_text(alias);
                let identity = format!("{}:{}", entry.entity.entity_type(), entry.entity.id());
                if let Some(previous) = owners.insert(normalized.clone(), identity.clone()) {
                    if previous != identity {
                        diagnostics.push(Diagnostic::entity(
                            entry,
                            "localizedContent.aliases",
                            format!("alias {alias} is also owned by {previous}"),
                        ));
                    }
                }
            }
        }
        let taxonomy_values = taxonomies
            .values()
            .flat_map(|taxonomy| taxonomy.terms.iter())
            .flat_map(|term| {
                term.localized_content
                    .values()
                    .flat_map(move |value| value.values(locale))
            })
            .map(normalize_search_text)
            .collect::<BTreeSet<_>>();
        for (alias, owner) in owners {
            if taxonomy_values.contains(&alias) {
                if let Some(entry) = entries.iter().find(|entry| {
                    format!("{}:{}", entry.entity.entity_type(), entry.entity.id()) == owner
                }) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent.aliases",
                        "entity-owned alias duplicates a taxonomy value",
                    ));
                }
            }
        }
        let by_identity = entries
            .iter()
            .map(|entry| ((entry.entity.entity_type(), entry.entity.id()), entry))
            .collect::<BTreeMap<_, _>>();
        for entry in entries {
            let CanonicalEntity::Product(product) = &entry.entity else {
                continue;
            };
            let aliases = localized_list_values(&product.localized_content, "aliases", locale);
            let related = product
                .active_ingredient_ids
                .iter()
                .filter_map(|id| by_identity.get(&("active_ingredient", id.as_str())))
                .flat_map(|ingredient| {
                    let content = ingredient
                        .entity
                        .localized_content()
                        .expect("active ingredients are localized");
                    let mut values = localized_list_values(content, "aliases", locale);
                    if let Some(name) = content.get("name").and_then(|value| value.text(locale)) {
                        values.push(name.to_string());
                    }
                    values
                })
                .map(|value| normalize_search_text(&value))
                .collect::<BTreeSet<_>>();
            for alias in aliases {
                if related.contains(&normalize_search_text(&alias)) {
                    diagnostics.push(Diagnostic::entity(
                        entry,
                        "localizedContent.aliases",
                        format!("product alias duplicates a related active ingredient in {locale}: {alias}"),
                    ));
                }
            }
        }
    }
}

fn localized_list_values(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Vec<String> {
    content
        .get(field)
        .and_then(|value| value.list(locale))
        .map(<[String]>::to_vec)
        .unwrap_or_default()
}

fn exact_content_files(directory: &Path) -> Result<Vec<(KnowledgeLocale, PathBuf)>, String> {
    let mut actual = fs::read_dir(directory)
        .map_err(|error| format!("missing content directory {}: {error}", directory.display()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("cannot enumerate {}: {error}", directory.display()))?;
    actual.sort_by_key(|entry| entry.file_name());
    let actual_names = actual
        .iter()
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect::<Vec<_>>();
    let mut expected_names = LOCALES
        .iter()
        .map(|locale| format!("{locale}.md"))
        .collect::<Vec<_>>();
    expected_names.sort();
    if actual_names != expected_names {
        return Err(format!("content directory must contain exactly the six locale documents; found {actual_names:?}"));
    }
    Ok(LOCALES
        .into_iter()
        .map(|locale| (locale, directory.join(format!("{locale}.md"))))
        .collect())
}

fn resolve_content_directory(entry: &SourceEntry) -> Result<PathBuf, String> {
    let content_path = entry
        .entity
        .content_path()
        .ok_or_else(|| "contentPath is required".to_string())?;
    if content_path.trim() != content_path || content_path.is_empty() {
        return Err("contentPath must be non-empty and trimmed".to_string());
    }
    let relative = Path::new(content_path);
    if relative.is_absolute()
        || relative.components().any(|component| {
            matches!(
                component,
                std::path::Component::ParentDir
                    | std::path::Component::RootDir
                    | std::path::Component::Prefix(_)
            )
        })
    {
        return Err("contentPath must be a relative path inside the entity".to_string());
    }
    let candidate = entry.entity_directory.join(relative);
    let entity_root = fs::canonicalize(&entry.entity_directory)
        .map_err(|error| format!("cannot resolve entity directory: {error}"))?;
    let resolved = fs::canonicalize(&candidate)
        .map_err(|error| format!("cannot resolve contentPath {content_path}: {error}"))?;
    if !resolved.starts_with(entity_root) {
        return Err("contentPath escapes the entity directory".to_string());
    }
    let metadata = fs::symlink_metadata(&candidate)
        .map_err(|error| format!("cannot inspect contentPath {content_path}: {error}"))?;
    if metadata.file_type().is_symlink() || !resolved.is_dir() {
        return Err("contentPath must resolve to a regular directory without symlinks".to_string());
    }
    Ok(resolved)
}

fn validate_file_coverage(
    root: &Path,
    files: &[PathBuf],
    referenced_markdown: &BTreeSet<PathBuf>,
    media: &BTreeMap<String, MediaAsset>,
    diagnostics: &mut Vec<Diagnostic>,
) {
    let referenced_media = media
        .values()
        .map(|asset| asset.source_path.clone())
        .collect::<BTreeSet<_>>();
    for file in files {
        if file.extension().is_some_and(|extension| extension == "md")
            && file != &root.join("README.md")
            && !referenced_markdown.contains(file)
        {
            diagnostics.push(Diagnostic::source(
                file,
                "Markdown document is not declared by an entity",
            ));
        }
        if file
            .components()
            .any(|component| component.as_os_str() == "media")
        {
            let canonical = fs::canonicalize(file).unwrap_or_else(|_| file.clone());
            if !referenced_media.contains(&canonical) {
                diagnostics.push(Diagnostic::source(
                    file,
                    "media source file is not referenced",
                ));
            }
        }
    }
}

fn logical_digest(
    entities: &[ValidatedEntity],
    media: &BTreeMap<String, MediaAsset>,
) -> Result<String, String> {
    let mut logical_entities = Vec::with_capacity(entities.len());
    let mut editorial = BTreeMap::new();
    for entry in entities {
        let mut value =
            serde_json::to_value(&entry.source.entity).map_err(|error| error.to_string())?;
        if let Some(object) = value.as_object_mut() {
            object.remove("contentPath");
            if let Some(sections) = object.get_mut("sections").and_then(Value::as_array_mut) {
                for section in sections {
                    section
                        .as_object_mut()
                        .map(|section| section.remove("sectionNumber"));
                }
            }
        }
        logical_entities.push(value);
        if !entry.editorial.is_empty() {
            editorial.insert(
                format!(
                    "{}:{}",
                    entry.source.entity.entity_type(),
                    entry.source.entity.id()
                ),
                entry
                    .editorial
                    .iter()
                    .map(|(locale, document)| (locale.to_string(), document))
                    .collect::<BTreeMap<_, _>>(),
            );
        }
    }
    let schemas = source_schema_fingerprint_input()
        .iter()
        .map(|schema| {
            serde_json::from_str::<Value>(schema)
                .map_err(|error| format!("invalid embedded source schema: {error}"))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let media = media
        .values()
        .map(|asset| {
            serde_json::json!({
                "mediaKey": asset.media_key,
                "contentHash": asset.content_hash_sha256,
                "mimeType": asset.mime_type,
                "sizeBytes": asset.size_bytes,
                "width": asset.width,
                "height": asset.height,
            })
        })
        .collect::<Vec<_>>();
    let model = serde_json::json!({
        "schemaVersion": 1,
        "sourceSchemas": schemas,
        "entities": logical_entities,
        "editorial": editorial,
        "media": media,
    });
    serde_json::to_vec(&model)
        .map(|bytes| sha256_hex(&bytes))
        .map_err(|error| error.to_string())
}

fn localized_fragment_counts(entities: &[ValidatedEntity]) -> BTreeMap<KnowledgeLocale, usize> {
    LOCALES
        .into_iter()
        .map(|locale| {
            let mut count = 0;
            for entry in entities {
                if let Some(content) = entry.source.entity.localized_content() {
                    count += content
                        .values()
                        .map(|value| value.values(locale).len())
                        .sum::<usize>();
                }
                match &entry.source.entity {
                    CanonicalEntity::Taxonomy(taxonomy) => {
                        for term in &taxonomy.terms {
                            count += term
                                .localized_content
                                .values()
                                .map(|value| value.values(locale).len())
                                .sum::<usize>();
                        }
                    }
                    CanonicalEntity::TreatmentProtocol(protocol) => {
                        for dose in &protocol.doses {
                            count += dose
                                .localized_content
                                .values()
                                .map(|value| value.values(locale).len())
                                .sum::<usize>();
                        }
                    }
                    _ => {}
                }
                count += entry
                    .editorial
                    .get(&locale)
                    .map_or(0, |document| document.sections.len());
            }
            (locale, count)
        })
        .collect()
}

fn relation_count(entities: &[ValidatedEntity]) -> usize {
    entities
        .iter()
        .map(|entry| match &entry.source.entity {
            CanonicalEntity::Product(value) => {
                2 + value.classification_term_keys.len()
                    + value.active_ingredient_ids.len()
                    + value.target_term_keys.as_ref().map_or(0, Vec::len)
                    + value.vaccine_profile_term_keys.as_ref().map_or(0, Vec::len)
                    + value.life_stage_term_keys.as_ref().map_or(0, Vec::len)
                    + value
                        .therapeutic_scope_term_keys
                        .as_ref()
                        .map_or(0, Vec::len)
            }
            CanonicalEntity::Manufacturer(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::ActiveIngredient(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::Condition(value) => 1 + value.classification_term_keys.len(),
            CanonicalEntity::Breed(value) => 1 + value.origin_place_ids.len(),
            CanonicalEntity::GeoPlace(value) => usize::from(value.parent_place_id.is_some()),
            CanonicalEntity::Taxonomy(value) => value
                .terms
                .iter()
                .filter(|term| term.parent_key.is_some())
                .count(),
            CanonicalEntity::TreatmentProtocol(value) => value.product_ids.len(),
        })
        .sum()
}

fn validate_unique_texts(
    entry: &SourceEntry,
    field: &str,
    values: &[String],
    require_nonempty: bool,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if require_nonempty && values.is_empty() {
        diagnostics.push(Diagnostic::entity(entry, field, "array must not be empty"));
    }
    let mut unique = BTreeSet::new();
    for value in values {
        if value.trim() != value || value.is_empty() {
            diagnostics.push(Diagnostic::entity(
                entry,
                field,
                "array values must be non-empty and trimmed",
            ));
        }
        if !unique.insert(value) {
            diagnostics.push(Diagnostic::entity(
                entry,
                field,
                format!("duplicate value {value}"),
            ));
        }
    }
}

fn validate_species(entry: &SourceEntry, species: &[String], diagnostics: &mut Vec<Diagnostic>) {
    for value in species {
        if !matches!(value.as_str(), "canine" | "feline") {
            diagnostics.push(Diagnostic::entity(
                entry,
                "species",
                format!("unsupported species {value}"),
            ));
        }
    }
}

fn validate_range(
    entry: &SourceEntry,
    field: &str,
    range: [f64; 2],
    diagnostics: &mut Vec<Diagnostic>,
) {
    if !range[0].is_finite() || !range[1].is_finite() || range[0] <= 0.0 || range[0] > range[1] {
        diagnostics.push(Diagnostic::entity(
            entry,
            field,
            "measurement range must be finite, positive and ordered",
        ));
    }
}

fn is_simple_text(value: &str) -> bool {
    !value.is_empty()
        && value.trim() == value
        && !value.chars().any(|character| character.is_control())
        && !value.contains('\n')
        && !value.contains("![")
        && !value.contains("](")
        && !value.contains("<script")
}

fn is_uuid_v4(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23].iter().all(|index| bytes[*index] == b'-')
        && bytes.iter().enumerate().all(|(index, byte)| {
            [8, 13, 18, 23].contains(&index) || matches!(*byte, b'0'..=b'9' | b'a'..=b'f')
        })
        && bytes[14] == b'4'
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uuid_v4_validation_is_strict() {
        assert!(is_uuid_v4("42ecd4a0-c4b3-4276-8122-693460cfe6a6"));
        assert!(!is_uuid_v4("42ECD4A0-C4B3-4276-8122-693460CFE6A6"));
        assert!(!is_uuid_v4("42ecd4a0-c4b3-1276-8122-693460cfe6a6"));
    }
}
