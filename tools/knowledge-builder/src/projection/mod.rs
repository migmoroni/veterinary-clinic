use crate::{
    databases::{self, DatabaseKind, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION},
    markdown::CompiledDocument,
    media::{cas_relative_path, decode_hex, sha256_hex},
    report::{
        self, BuildContext, BuildResult, CasResult, DatabaseArtifact, LocaleArtifacts,
        LocaleProjection, MediaProjection, ProjectionReport, ProjectionResult, ProjectionSource,
        TypeProjection,
    },
    source::{
        CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, TaxonomyEntity, LOCALES,
    },
    validation::{normalize_search, ValidatedEntity, ValidatedSource},
};
use rusqlite::{params, Connection, Transaction};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    io::Write,
    path::{Path, PathBuf},
};

type RowsByType = BTreeMap<String, BTreeMap<String, usize>>;

pub fn build_artifacts(
    source: &ValidatedSource,
    output: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    fs::create_dir_all(output).map_err(|error| {
        format!(
            "cannot create output directory {}: {error}",
            output.display()
        )
    })?;
    let versions_root = output.join("versions");
    fs::create_dir_all(&versions_root)
        .map_err(|error| format!("cannot create versions directory: {error}"))?;
    let final_version = versions_root.join(context.build_version.to_string());
    if final_version.exists() {
        return reuse_or_reject_existing(source, output, &final_version, context);
    }

    let staging_version = versions_root.join(format!(".{}.staging", context.build_version));
    let staging_cas = output.join(format!(".cas-{}.staging", context.build_version));
    remove_stale_staging(&staging_version)?;
    remove_stale_staging(&staging_cas)?;
    fs::create_dir_all(&staging_version)
        .map_err(|error| format!("cannot create version staging directory: {error}"))?;
    fs::create_dir_all(&staging_cas)
        .map_err(|error| format!("cannot create CAS staging directory: {error}"))?;

    let result = build_in_staging(source, output, &staging_version, &staging_cas, context);
    match result {
        Ok(result) => {
            commit_cas(&staging_cas, &output.join("CAS/system"))?;
            fs::rename(&staging_version, &final_version).map_err(|error| {
                format!(
                    "cannot atomically finalize version {}: {error}",
                    context.build_version
                )
            })?;
            if staging_cas.exists() {
                fs::remove_dir_all(&staging_cas)
                    .map_err(|error| format!("cannot remove CAS staging directory: {error}"))?;
            }
            verify_result(output, &result)?;
            Ok(result)
        }
        Err(error) => {
            let _ = fs::remove_dir_all(&staging_version);
            let _ = fs::remove_dir_all(&staging_cas);
            Err(error)
        }
    }
}

fn build_in_staging(
    source: &ValidatedSource,
    output: &Path,
    staging_version: &Path,
    staging_cas: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    let source_digest = decode_hex(&source.source_digest_sha256)?;
    let mut locale_artifacts = BTreeMap::new();
    let mut locale_rows = BTreeMap::new();
    let mut checksum_entries = BTreeMap::new();
    let mut system_fingerprint = None;
    let mut media_fingerprint = None;
    let mut all_cas_hashes = BTreeSet::new();

    for locale in LOCALES {
        let locale_directory = staging_version.join("locales").join(locale.as_str());
        fs::create_dir_all(&locale_directory)
            .map_err(|error| format!("cannot create locale directory {locale}: {error}"))?;
        let system_path = locale_directory.join("veterinary_clinic_system.db");
        let system_media_path = locale_directory.join("veterinary_clinic_system_media.db");

        let mut system = databases::create(&system_path, DatabaseKind::System)?;
        databases::insert_metadata(&system, context, locale, &source_digest)?;
        let rows = project_system(&mut system, source, locale)?;
        let current_system_fingerprint = databases::finalize(system, &system_path)?;
        assert_shared_fingerprint(
            &mut system_fingerprint,
            &current_system_fingerprint,
            "system",
            locale,
        )?;

        let mut system_media = databases::create(&system_media_path, DatabaseKind::SystemMedia)?;
        databases::insert_metadata(&system_media, context, locale, &source_digest)?;
        let locale_hashes = project_system_media(&mut system_media, source, locale)?;
        let current_media_fingerprint = databases::finalize(system_media, &system_media_path)?;
        assert_shared_fingerprint(
            &mut media_fingerprint,
            &current_media_fingerprint,
            "system_media",
            locale,
        )?;

        for hash in &locale_hashes {
            all_cas_hashes.insert(hash.clone());
        }
        let locale_cas_digest = set_digest(&locale_hashes);
        let system_relative =
            artifact_database_path(context.build_version, locale, "veterinary_clinic_system.db");
        let media_relative = artifact_database_path(
            context.build_version,
            locale,
            "veterinary_clinic_system_media.db",
        );
        let system_artifact = database_artifact(
            &system_path,
            system_relative.clone(),
            current_system_fingerprint,
        )?;
        let media_artifact = database_artifact(
            &system_media_path,
            media_relative.clone(),
            current_media_fingerprint,
        )?;
        checksum_entries.insert(system_relative, system_artifact.checksum_sha256.clone());
        checksum_entries.insert(media_relative, media_artifact.checksum_sha256.clone());
        locale_artifacts.insert(
            locale.to_string(),
            LocaleArtifacts {
                system: system_artifact,
                system_media: media_artifact,
                cas_set_digest_sha256: locale_cas_digest,
            },
        );
        locale_rows.insert(locale, rows);
    }

    stage_cas_objects(source, staging_cas, &all_cas_hashes)?;
    for hash in &all_cas_hashes {
        let relative = format!(
            "CAS/system/{}",
            report::normalized_relative_path(&cas_relative_path(hash)?)?
        );
        checksum_entries.insert(relative, hash.clone());
    }

    let projection_report = projection_report(source, &locale_rows);
    let projection_path = staging_version.join("projection-report.json");
    let projection_bytes = report::write_json(&projection_path, &projection_report)?;
    let projection_checksum = sha256_hex(&projection_bytes);
    let projection_relative = format!("versions/{}/projection-report.json", context.build_version);

    let checksum_path = staging_version.join("checksums.sha256");
    let checksum_contents = checksum_entries
        .iter()
        .map(|(path, checksum)| format!("{checksum}  {path}\n"))
        .collect::<String>();
    fs::write(&checksum_path, checksum_contents.as_bytes())
        .map_err(|error| format!("cannot write checksums.sha256: {error}"))?;

    let result = BuildResult {
        schema_version: 1,
        builder_version: env!("CARGO_PKG_VERSION").to_string(),
        build_version: context.build_version,
        release: context.release.clone(),
        source_digest_sha256: source.source_digest_sha256.clone(),
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
        locales: locale_artifacts,
        cas: CasResult {
            algorithm: "sha256".to_string(),
            hash_encoding: "lowercase_hex".to_string(),
            root: "CAS/system".to_string(),
            layout: "sha256_hex_2_2_bin".to_string(),
            path_pattern: "{hash[0..2]}/{hash[2..4]}/{hash}.bin".to_string(),
            object_count: all_cas_hashes.len(),
            set_digest_sha256: set_digest(&all_cas_hashes),
        },
        projection: ProjectionResult {
            report_path: projection_relative,
            checksum_sha256: projection_checksum,
        },
        checksum_file: format!("versions/{}/checksums.sha256", context.build_version),
    };
    report::write_json(&staging_version.join("build-result.json"), &result)?;
    verify_staging(output, staging_version, staging_cas, &result)?;
    Ok(result)
}

fn project_system(
    connection: &mut Connection,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<RowsByType, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system projection: {error}"))?;
    let mut rows = initial_rows_by_type(source);
    project_taxonomies(&transaction, source, locale, &mut rows)?;
    project_geo_places(&transaction, source, locale, &mut rows)?;
    project_named_entities(&transaction, source, locale, &mut rows)?;
    project_breeds(&transaction, source, locale, &mut rows)?;
    project_products(&transaction, source, locale, &mut rows)?;
    project_protocols(&transaction, source, locale, &mut rows)?;
    project_search(&transaction, source, locale, &mut rows)?;
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system projection: {error}"))?;
    Ok(rows)
}

fn project_taxonomies(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    for entity in &source.entities {
        let CanonicalEntity::Taxonomy(taxonomy) = &entity.source.entity else {
            continue;
        };
        transaction
            .execute(
                "INSERT INTO taxonomy_registry (id, domain, purpose) VALUES (?1, ?2, ?3)",
                params![taxonomy.id, taxonomy.domain, taxonomy.purpose],
            )
            .map_err(|error| format!("cannot project taxonomy {}: {error}", taxonomy.id))?;
        add_row(rows, "taxonomy", "taxonomy_registry", 1);
        let semantic_table = semantic_term_table(&taxonomy.purpose);
        for term in &taxonomy.terms {
            let label = localized_text(&term.localized_content, "label", locale)?;
            let aliases =
                localized_list(&term.localized_content, "aliases", locale).unwrap_or_default();
            let aliases_json = json(&aliases)?;
            if let Some(table) = semantic_table {
                let sql = format!("INSERT INTO {table} (term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)");
                transaction
                    .execute(
                        &sql,
                        params![
                            term.key,
                            term.parent_key,
                            label,
                            normalize_search(label),
                            aliases_json,
                            term.order
                        ],
                    )
                    .map_err(|error| {
                        format!(
                            "cannot project semantic taxonomy term {}:{}: {error}",
                            taxonomy.id, term.key
                        )
                    })?;
                add_row(rows, "taxonomy", table, 1);
            } else {
                transaction.execute(
                    "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![taxonomy.id, term.key, term.parent_key, label, normalize_search(label), aliases_json, term.order],
                ).map_err(|error| format!("cannot project taxonomy term {}:{}: {error}", taxonomy.id, term.key))?;
                add_row(rows, "taxonomy", "taxonomy_terms", 1);
            }
        }
    }
    Ok(())
}

fn project_geo_places(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    let mut remaining = source
        .entities
        .iter()
        .filter_map(|entry| match &entry.source.entity {
            CanonicalEntity::GeoPlace(value) => Some(value),
            _ => None,
        })
        .collect::<Vec<_>>();
    let mut inserted = BTreeSet::new();
    while !remaining.is_empty() {
        let before = remaining.len();
        let mut next = Vec::new();
        for value in remaining {
            if value
                .parent_place_id
                .as_ref()
                .is_some_and(|parent| !inserted.contains(parent))
            {
                next.push(value);
                continue;
            }
            let name = localized_text(&value.localized_content, "name", locale)?;
            let aliases =
                localized_list(&value.localized_content, "aliases", locale).unwrap_or_default();
            transaction.execute(
                "INSERT INTO geo_places (id, place_type, parent_place_id, country_codes_json, latitude, longitude, name, normalized_name, aliases_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![value.id, value.place_type, value.parent_place_id, json(&value.country_codes)?, value.centroid.latitude, value.centroid.longitude, name, normalize_search(name), json(&aliases)?],
            ).map_err(|error| format!("cannot project geo_place {}: {error}", value.id))?;
            inserted.insert(value.id.clone());
            add_row(rows, "geo_place", "geo_places", 1);
        }
        if next.len() == before {
            return Err("geo_place hierarchy could not be topologically projected".to_string());
        }
        remaining = next;
    }
    Ok(())
}

fn project_named_entities(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    for entry in &source.entities {
        match &entry.source.entity {
            CanonicalEntity::Manufacturer(value) => {
                let name = localized_text(&value.localized_content, "name", locale)?;
                transaction.execute(
                    "INSERT INTO manufacturer_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![value.id, value.type_term_key, name, normalize_search(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, value.website, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project manufacturer {}: {error}", value.id))?;
                add_row(rows, "manufacturer", "manufacturer_catalog_items", 1);
                project_taxonomy_relations(
                    transaction,
                    source,
                    "manufacturer",
                    &value.id,
                    TaxonomyRelations {
                        type_key: Some(&value.type_term_key),
                        classifications: &value.classification_term_keys,
                        size_key: None,
                    },
                    rows,
                )?;
            }
            CanonicalEntity::ActiveIngredient(value) => {
                let name = localized_text(&value.localized_content, "name", locale)?;
                let denominations = value
                    .nomenclature
                    .denomination_standards
                    .iter()
                    .map(|standard| {
                        localized_text(
                            &value.localized_content,
                            &format!("denomination_{standard}"),
                            locale,
                        )
                        .map(|value| (standard.clone(), value.to_string()))
                    })
                    .collect::<Result<BTreeMap<_, _>, _>>()?;
                transaction.execute(
                    "INSERT INTO active_ingredient_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, nomenclature_json, atc_vet_code, atc_vet_system, denominations_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
                    params![value.id, value.type_term_key, name, normalize_search(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, json(&value.nomenclature)?, value.atc_vet_code, optional_localized_text(&value.localized_content, "atcVetSystem", locale), json(&denominations)?, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project active ingredient {}: {error}", value.id))?;
                add_row(
                    rows,
                    "active_ingredient",
                    "active_ingredient_catalog_items",
                    1,
                );
                project_taxonomy_relations(
                    transaction,
                    source,
                    "active_ingredient",
                    &value.id,
                    TaxonomyRelations {
                        type_key: Some(&value.type_term_key),
                        classifications: &value.classification_term_keys,
                        size_key: None,
                    },
                    rows,
                )?;
            }
            CanonicalEntity::Condition(value) => {
                let name = localized_text(&value.localized_content, "name", locale)?;
                transaction.execute(
                    "INSERT INTO condition_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![value.id, value.type_term_key, name, normalize_search(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project condition {}: {error}", value.id))?;
                add_row(rows, "condition", "condition_catalog_items", 1);
                project_taxonomy_relations(
                    transaction,
                    source,
                    "condition",
                    &value.id,
                    TaxonomyRelations {
                        type_key: Some(&value.type_term_key),
                        classifications: &value.classification_term_keys,
                        size_key: None,
                    },
                    rows,
                )?;
            }
            _ => {}
        }
    }
    Ok(())
}

fn project_breeds(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::Breed(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO breed_reference_items (id, species_json, name, normalized_name, aliases_json, size_term_key, average_weight_kg_json, average_height_cm_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![value.id, json(&value.species)?, name, normalize_search(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, value.size_term_key, json(&value.average_weight_kg)?, json(&value.average_height_cm)?, content_json(entry, locale)?],
        ).map_err(|error| format!("cannot project breed {}: {error}", value.id))?;
        add_row(rows, "breed", "breed_reference_items", 1);
        for (order, place_id) in value.origin_place_ids.iter().enumerate() {
            transaction.execute("INSERT INTO breed_origin_places (breed_id, place_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, place_id, order])
                .map_err(|error| format!("cannot project breed origin {} -> {}: {error}", value.id, place_id))?;
            add_row(rows, "breed", "breed_origin_places", 1);
        }
        project_taxonomy_relations(
            transaction,
            source,
            "breed",
            &value.id,
            TaxonomyRelations {
                type_key: None,
                classifications: &[],
                size_key: Some(&value.size_term_key),
            },
            rows,
        )?;
    }
    Ok(())
}

fn project_products(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::Product(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO product_catalog_items (id, type_term_key, name, normalized_name, species_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![value.id, value.type_term_key, name, normalize_search(name), json(&value.species)?, json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, value.manufacturer_id, json(&value.regions)?, json(&value.regulatory_identifiers)?, optional_localized_text(&value.localized_content, "commercialLine", locale), optional_localized_text(&value.localized_content, "presentationDosage", locale), json(&localized_list(&value.localized_content, "targetSpeciesWarnings", locale).unwrap_or_default())?, content_json(entry, locale)?],
        ).map_err(|error| format!("cannot project product {}: {error}", value.id))?;
        add_row(rows, "product", "product_catalog_items", 1);
        project_taxonomy_relations(
            transaction,
            source,
            "product",
            &value.id,
            TaxonomyRelations {
                type_key: Some(&value.type_term_key),
                classifications: &value.classification_term_keys,
                size_key: None,
            },
            rows,
        )?;
        for (order, ingredient_id) in value.active_ingredient_ids.iter().enumerate() {
            transaction.execute("INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, ingredient_id, order])
                .map_err(|error| format!("cannot project product ingredient {} -> {}: {error}", value.id, ingredient_id))?;
            add_row(rows, "product", "product_active_ingredients", 1);
        }
        for (table, values) in [
            ("product_targets", value.target_term_keys.as_deref()),
            (
                "product_vaccine_profiles",
                value.vaccine_profile_term_keys.as_deref(),
            ),
            ("product_life_stages", value.life_stage_term_keys.as_deref()),
            (
                "product_therapeutic_scopes",
                value.therapeutic_scope_term_keys.as_deref(),
            ),
        ] {
            for (order, term) in values.unwrap_or(&[]).iter().enumerate() {
                let sql = format!(
                    "INSERT INTO {table} (product_id, term_key, sort_order) VALUES (?1, ?2, ?3)"
                );
                transaction
                    .execute(&sql, params![value.id, term, order])
                    .map_err(|error| {
                        format!("cannot project {table} {} -> {}: {error}", value.id, term)
                    })?;
                add_row(rows, "product", table, 1);
            }
        }
    }
    Ok(())
}

fn project_protocols(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::TreatmentProtocol(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO treatment_protocols (id, kind, name, normalized_name, species_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![value.id, value.kind, name, normalize_search(name), json(&value.species)?, optional_localized_text(&value.localized_content, "observation", locale)],
        ).map_err(|error| format!("cannot project protocol {}: {error}", value.id))?;
        add_row(rows, "treatment_protocol", "treatment_protocols", 1);
        for (order, product_id) in value.product_ids.iter().enumerate() {
            transaction.execute("INSERT INTO treatment_protocol_items (protocol_id, product_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, product_id, order])
                .map_err(|error| format!("cannot project protocol item {} -> {}: {error}", value.id, product_id))?;
            add_row(rows, "treatment_protocol", "treatment_protocol_items", 1);
        }
        for (order, dose) in value.doses.iter().enumerate() {
            transaction.execute("INSERT INTO treatment_protocol_doses (protocol_id, dose_id, label, validity_value, validity_unit, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![value.id, dose.id, localized_text(&dose.localized_content, "label", locale)?, dose.validity_value, dose.validity_unit, order])
                .map_err(|error| format!("cannot project protocol dose {} -> {}: {error}", value.id, dose.id))?;
            add_row(rows, "treatment_protocol", "treatment_protocol_doses", 1);
        }
    }
    Ok(())
}

struct TaxonomyRelations<'a> {
    type_key: Option<&'a str>,
    classifications: &'a [String],
    size_key: Option<&'a str>,
}

fn project_taxonomy_relations(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    entity_type: &str,
    entity_id: &str,
    relations: TaxonomyRelations<'_>,
    rows: &mut RowsByType,
) -> Result<(), String> {
    if let Some(type_key) = relations.type_key {
        let taxonomy = taxonomy_for(source, entity_type, "type")?;
        insert_entity_taxonomy(
            transaction,
            entity_type,
            entity_id,
            &taxonomy.id,
            type_key,
            "type",
            0,
        )?;
        add_row(rows, entity_type, "entity_taxonomy_terms", 1);
    }
    if !relations.classifications.is_empty() {
        let taxonomy = taxonomy_for(source, entity_type, "classification")?;
        for (order, term) in relations.classifications.iter().enumerate() {
            insert_entity_taxonomy(
                transaction,
                entity_type,
                entity_id,
                &taxonomy.id,
                term,
                "classification",
                order,
            )?;
            add_row(rows, entity_type, "entity_taxonomy_terms", 1);
        }
    }
    if let Some(size_key) = relations.size_key {
        let taxonomy = taxonomy_for(source, entity_type, "size")?;
        insert_entity_taxonomy(
            transaction,
            entity_type,
            entity_id,
            &taxonomy.id,
            size_key,
            "size",
            0,
        )?;
        add_row(rows, entity_type, "entity_taxonomy_terms", 1);
    }
    Ok(())
}

fn insert_entity_taxonomy(
    transaction: &Transaction<'_>,
    entity_type: &str,
    entity_id: &str,
    taxonomy_id: &str,
    term: &str,
    kind: &str,
    order: usize,
) -> Result<(), String> {
    transaction.execute(
        "INSERT INTO entity_taxonomy_terms (entity_type, entity_id, taxonomy_id, term_key, relation_kind, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![entity_type, entity_id, taxonomy_id, term, kind, order],
    ).map(|_| ()).map_err(|error| format!("cannot project taxonomy relation {entity_type}:{entity_id} -> {term}: {error}"))
}

fn project_search(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
) -> Result<(), String> {
    let by_identity = source
        .entities
        .iter()
        .map(|entry| {
            (
                (entry.source.entity.entity_type(), entry.source.entity.id()),
                entry,
            )
        })
        .collect::<BTreeMap<_, _>>();
    for entry in &source.entities {
        let Some(content) = entry.source.entity.localized_content() else {
            continue;
        };
        let mut values = Vec::<(String, String)>::new();
        if let Some(name) = optional_localized_text(content, "name", locale) {
            values.push((name.to_string(), "entity.name".to_string()));
        }
        for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
            values.push((alias, "entity.alias".to_string()));
        }
        match &entry.source.entity {
            CanonicalEntity::Product(product) => {
                if let Some(manufacturer) =
                    by_identity.get(&("manufacturer", product.manufacturer_id.as_str()))
                {
                    append_named_relation(
                        &mut values,
                        &manufacturer.source.entity,
                        locale,
                        "manufacturer",
                    )?;
                }
                for id in &product.active_ingredient_ids {
                    if let Some(ingredient) = by_identity.get(&("active_ingredient", id.as_str())) {
                        append_named_relation(
                            &mut values,
                            &ingredient.source.entity,
                            locale,
                            "activeIngredient",
                        )?;
                        if let CanonicalEntity::ActiveIngredient(ingredient) =
                            &ingredient.source.entity
                        {
                            for standard in &ingredient.nomenclature.denomination_standards {
                                if let Some(value) = optional_localized_text(
                                    &ingredient.localized_content,
                                    &format!("denomination_{standard}"),
                                    locale,
                                ) {
                                    values.push((
                                        value.to_string(),
                                        format!("activeIngredient.denomination.{standard}"),
                                    ));
                                }
                            }
                        }
                    }
                }
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "type")?,
                    std::slice::from_ref(&product.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "product", "classification")?,
                    &product.classification_term_keys,
                    locale,
                    "classification",
                )?;
                for (purpose, keys, provenance) in [
                    ("target", product.target_term_keys.as_deref(), "target"),
                    (
                        "vaccine_profile",
                        product.vaccine_profile_term_keys.as_deref(),
                        "vaccineProfile",
                    ),
                    (
                        "life_stage",
                        product.life_stage_term_keys.as_deref(),
                        "lifeStage",
                    ),
                    (
                        "therapeutic_scope",
                        product.therapeutic_scope_term_keys.as_deref(),
                        "therapeuticScope",
                    ),
                ] {
                    append_taxonomy_values(
                        &mut values,
                        taxonomy_for(source, "product", purpose)?,
                        keys.unwrap_or(&[]),
                        locale,
                        provenance,
                    )?;
                }
            }
            CanonicalEntity::Manufacturer(value) => {
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "manufacturer", "type")?,
                    std::slice::from_ref(&value.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "manufacturer", "classification")?,
                    &value.classification_term_keys,
                    locale,
                    "classification",
                )?;
            }
            CanonicalEntity::ActiveIngredient(value) => {
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "active_ingredient", "type")?,
                    std::slice::from_ref(&value.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "active_ingredient", "classification")?,
                    &value.classification_term_keys,
                    locale,
                    "classification",
                )?;
            }
            CanonicalEntity::Condition(value) => {
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "condition", "type")?,
                    std::slice::from_ref(&value.type_term_key),
                    locale,
                    "type",
                )?;
                append_taxonomy_values(
                    &mut values,
                    taxonomy_for(source, "condition", "classification")?,
                    &value.classification_term_keys,
                    locale,
                    "classification",
                )?;
            }
            CanonicalEntity::Breed(value) => append_taxonomy_values(
                &mut values,
                taxonomy_for(source, "breed", "size")?,
                std::slice::from_ref(&value.size_term_key),
                locale,
                "size",
            )?,
            CanonicalEntity::GeoPlace(_) | CanonicalEntity::TreatmentProtocol(_) => {}
            CanonicalEntity::Taxonomy(_) => unreachable!(),
        }
        let mut seen = BTreeSet::new();
        let mut order = 0;
        for (value, provenance) in values {
            let normalized = normalize_search(&value);
            if !seen.insert((provenance.clone(), normalized.clone())) {
                continue;
            }
            transaction.execute(
                "INSERT INTO entity_search_terms (entity_type, entity_id, value, normalized_value, provenance, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![entry.source.entity.entity_type(), entry.source.entity.id(), value, normalized, provenance, order],
            ).map_err(|error| format!("cannot project search value for {}:{}: {error}", entry.source.entity.entity_type(), entry.source.entity.id()))?;
            add_row(
                rows,
                entry.source.entity.entity_type(),
                "entity_search_terms",
                1,
            );
            order += 1;
        }
    }
    Ok(())
}

fn append_named_relation(
    values: &mut Vec<(String, String)>,
    entity: &CanonicalEntity,
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    let content = entity
        .localized_content()
        .ok_or_else(|| "related entity has no localized content".to_string())?;
    values.push((
        localized_text(content, "name", locale)?.to_string(),
        format!("{prefix}.name"),
    ));
    for alias in localized_list(content, "aliases", locale).unwrap_or_default() {
        values.push((alias, format!("{prefix}.alias")));
    }
    Ok(())
}

fn append_taxonomy_values(
    values: &mut Vec<(String, String)>,
    taxonomy: &TaxonomyEntity,
    keys: &[String],
    locale: KnowledgeLocale,
    prefix: &str,
) -> Result<(), String> {
    for key in keys {
        let term = taxonomy
            .terms
            .iter()
            .find(|term| &term.key == key)
            .ok_or_else(|| format!("unresolved taxonomy term {key}"))?;
        values.push((
            localized_text(&term.localized_content, "label", locale)?.to_string(),
            format!("{prefix}.label:{key}"),
        ));
        for alias in localized_list(&term.localized_content, "aliases", locale).unwrap_or_default()
        {
            values.push((alias, format!("{prefix}.alias:{key}")));
        }
    }
    Ok(())
}

fn project_system_media(
    connection: &mut Connection,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
) -> Result<BTreeSet<String>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system_media projection: {error}"))?;
    let mut hashes = BTreeSet::new();
    for key in source
        .media_keys_by_locale
        .get(&locale)
        .into_iter()
        .flatten()
    {
        let asset = source
            .media
            .get(key)
            .ok_or_else(|| format!("media key has no source asset: {key}"))?;
        let hash = decode_hex(&asset.content_hash_sha256)?;
        transaction.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![asset.media_key, hash, asset.thumbnail, asset.mime_type, asset.size_bytes, asset.width, asset.height],
        ).map_err(|error| format!("cannot project media asset {}: {error}", asset.media_key))?;
        hashes.insert(asset.content_hash_sha256.clone());
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system_media projection: {error}"))?;
    Ok(hashes)
}

fn projection_report(
    source: &ValidatedSource,
    locale_rows: &BTreeMap<KnowledgeLocale, RowsByType>,
) -> ProjectionReport {
    let entities_by_type = source
        .entities
        .iter()
        .fold(BTreeMap::new(), |mut result, entry| {
            *result
                .entry(entry.source.entity.entity_type().to_string())
                .or_insert(0) += 1;
            result
        });
    let localized_fragments = source
        .localized_fragments_by_locale
        .iter()
        .map(|(locale, count)| (locale.to_string(), *count))
        .collect::<BTreeMap<_, _>>();
    let locales = locale_rows
        .iter()
        .map(|(locale, rows)| {
            let projected_by_type = entities_by_type
                .iter()
                .map(|(entity_type, entities)| {
                    (
                        entity_type.clone(),
                        TypeProjection {
                            entities: *entities,
                            rows_by_table: rows.get(entity_type).cloned().unwrap_or_default(),
                        },
                    )
                })
                .collect();
            (
                *locale,
                LocaleProjection {
                    projected_by_type,
                    resolved_relation_count: source.relation_count,
                    consumed_localized_fragments: *source
                        .localized_fragments_by_locale
                        .get(locale)
                        .unwrap_or(&0),
                    unconsumed_entities: Vec::new(),
                    unconsumed_localized_fragments: Vec::new(),
                    unresolved_relations: Vec::new(),
                },
            )
        })
        .map(|(locale, projection)| (locale.to_string(), projection))
        .collect();
    let unique_hashes = source
        .media
        .values()
        .map(|asset| asset.content_hash_sha256.as_str())
        .collect::<BTreeSet<_>>()
        .len();
    ProjectionReport {
        schema_version: 1,
        source: ProjectionSource {
            entities_by_type,
            relation_count: source.relation_count,
            localized_fragments_by_locale: localized_fragments,
            source_files: source.source_files,
        },
        locales,
        media: MediaProjection {
            source_files: source
                .media
                .values()
                .map(|asset| asset.source_path.as_path())
                .collect::<BTreeSet<_>>()
                .len(),
            referenced_media_keys: source.media.len(),
            unique_content_hashes: unique_hashes,
            missing_source_paths: Vec::new(),
            unreferenced_source_paths: Vec::new(),
        },
    }
}

fn stage_cas_objects(
    source: &ValidatedSource,
    staging: &Path,
    hashes: &BTreeSet<String>,
) -> Result<(), String> {
    for hash in hashes {
        let asset = source
            .media
            .values()
            .find(|asset| &asset.content_hash_sha256 == hash)
            .ok_or_else(|| format!("CAS hash has no source asset: {hash}"))?;
        if sha256_hex(&asset.bytes) != *hash {
            return Err(format!(
                "source media hash changed during build: {}",
                asset.source_path.display()
            ));
        }
        let path = staging.join(cas_relative_path(hash)?);
        let parent = path
            .parent()
            .ok_or_else(|| "invalid CAS staging path".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("cannot create CAS staging directory: {error}"))?;
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&path)
            .map_err(|error| {
                format!(
                    "cannot create CAS staging object {}: {error}",
                    path.display()
                )
            })?;
        file.write_all(&asset.bytes)
            .map_err(|error| format!("cannot write CAS staging object: {error}"))?;
        file.sync_all()
            .map_err(|error| format!("cannot sync CAS staging object: {error}"))?;
    }
    Ok(())
}

fn commit_cas(staging: &Path, final_root: &Path) -> Result<(), String> {
    fs::create_dir_all(final_root).map_err(|error| format!("cannot create CAS/system: {error}"))?;
    let files = recursive_files(staging)?;
    for staged in files {
        let relative = staged
            .strip_prefix(staging)
            .map_err(|_| "invalid staged CAS path".to_string())?;
        let final_path = final_root.join(relative);
        if let Some(parent) = final_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("cannot create CAS fragment directory: {error}"))?;
        }
        if final_path.exists() {
            let expected = final_path
                .file_stem()
                .and_then(|value| value.to_str())
                .ok_or_else(|| "invalid CAS object name".to_string())?;
            let bytes = fs::read(&final_path)
                .map_err(|error| format!("cannot verify existing CAS object: {error}"))?;
            if sha256_hex(&bytes) != expected {
                return Err(format!(
                    "existing CAS object is corrupt: {}",
                    final_path.display()
                ));
            }
            fs::remove_file(&staged)
                .map_err(|error| format!("cannot discard duplicate staged CAS object: {error}"))?;
        } else {
            fs::rename(&staged, &final_path).map_err(|error| {
                format!("cannot commit CAS object {}: {error}", final_path.display())
            })?;
        }
    }
    Ok(())
}

fn verify_staging(
    _output: &Path,
    staging_version: &Path,
    staging_cas: &Path,
    result: &BuildResult,
) -> Result<(), String> {
    for locale in result.locales.values() {
        verify_staged_artifact(staging_version, &locale.system, result.build_version)?;
        verify_staged_artifact(staging_version, &locale.system_media, result.build_version)?;
    }
    for hash in result.cas_hashes_from_staging(staging_cas)? {
        let path = staging_cas.join(cas_relative_path(&hash)?);
        let bytes =
            fs::read(&path).map_err(|error| format!("cannot verify staged CAS object: {error}"))?;
        if sha256_hex(&bytes) != hash {
            return Err(format!("staged CAS checksum mismatch: {}", path.display()));
        }
    }
    let projection = fs::read(staging_version.join("projection-report.json"))
        .map_err(|error| format!("cannot verify projection report: {error}"))?;
    if sha256_hex(&projection) != result.projection.checksum_sha256 {
        return Err("projection report checksum mismatch".to_string());
    }
    let checksum_entries = read_checksum_entries(&staging_version.join("checksums.sha256"))?;
    if checksum_entries.len() != 12 + result.cas.object_count {
        return Err("checksums.sha256 does not cover exactly the twelve databases and referenced CAS objects".to_string());
    }
    for (relative, checksum) in checksum_entries {
        let path = if let Some(suffix) =
            relative.strip_prefix(&format!("versions/{}/", result.build_version))
        {
            staging_version.join(suffix)
        } else if let Some(suffix) = relative.strip_prefix("CAS/system/") {
            staging_cas.join(suffix)
        } else {
            return Err(format!("unexpected path in checksums.sha256: {relative}"));
        };
        verify_file_checksum(&path, &checksum)?;
    }
    Ok(())
}

trait StagedCasHashes {
    fn cas_hashes_from_staging(&self, staging: &Path) -> Result<Vec<String>, String>;
}

impl StagedCasHashes for BuildResult {
    fn cas_hashes_from_staging(&self, staging: &Path) -> Result<Vec<String>, String> {
        recursive_files(staging)?
            .into_iter()
            .map(|path| {
                path.file_stem()
                    .and_then(|value| value.to_str())
                    .map(str::to_string)
                    .ok_or_else(|| "invalid staged CAS filename".to_string())
            })
            .collect()
    }
}

fn verify_staged_artifact(
    staging_version: &Path,
    artifact: &DatabaseArtifact,
    build_version: u64,
) -> Result<(), String> {
    let prefix = format!("versions/{build_version}/");
    let suffix = artifact
        .path
        .strip_prefix(&prefix)
        .ok_or_else(|| format!("artifact path is outside version: {}", artifact.path))?;
    let path = staging_version.join(suffix);
    verify_file_checksum(&path, &artifact.checksum_sha256)
}

fn reuse_or_reject_existing(
    source: &ValidatedSource,
    output: &Path,
    final_version: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    let result_path = final_version.join("build-result.json");
    let bytes = fs::read(&result_path).map_err(|error| {
        format!(
            "build version {} already exists without a readable build-result.json: {error}",
            context.build_version
        )
    })?;
    let result: BuildResult = serde_json::from_slice(&bytes)
        .map_err(|error| format!("existing build-result.json is invalid: {error}"))?;
    if result.build_version != context.build_version
        || result.release != context.release
        || result.source_digest_sha256 != source.source_digest_sha256
    {
        return Err(format!(
            "build version {} already exists with divergent content or context",
            context.build_version
        ));
    }
    verify_result(output, &result)?;
    Ok(result)
}

fn verify_result(output: &Path, result: &BuildResult) -> Result<(), String> {
    for artifacts in result.locales.values() {
        verify_final_artifact(output, &artifacts.system)?;
        verify_final_artifact(output, &artifacts.system_media)?;
    }
    let projection_path = safe_artifact_path(output, &result.projection.report_path)?;
    verify_file_checksum(&projection_path, &result.projection.checksum_sha256)?;
    let checksum_path = safe_artifact_path(output, &result.checksum_file)?;
    let checksum_entries = read_checksum_entries(&checksum_path)?;
    if checksum_entries.len() != 12 + result.cas.object_count {
        return Err("checksums.sha256 coverage differs from build-result.json".to_string());
    }
    let mut cas_hashes = BTreeSet::new();
    for (relative, checksum) in checksum_entries {
        let path = safe_artifact_path(output, &relative)?;
        verify_file_checksum(&path, &checksum)?;
        if let Some(cas_path) = relative.strip_prefix("CAS/system/") {
            let expected_path = report::normalized_relative_path(&cas_relative_path(&checksum)?)?;
            if cas_path != expected_path {
                return Err(format!(
                    "CAS path does not match its content hash: {relative}"
                ));
            }
            cas_hashes.insert(checksum);
        }
    }
    if cas_hashes.len() != result.cas.object_count
        || set_digest(&cas_hashes) != result.cas.set_digest_sha256
    {
        return Err("CAS set does not match build-result.json".to_string());
    }
    Ok(())
}

fn read_checksum_entries(path: &Path) -> Result<BTreeMap<String, String>, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("cannot read checksum file {}: {error}", path.display()))?;
    let mut result = BTreeMap::new();
    for (index, line) in contents.lines().enumerate() {
        let (checksum, relative) = line
            .split_once("  ")
            .ok_or_else(|| format!("{}:{}: invalid checksum line", path.display(), index + 1))?;
        decode_hex(checksum)?;
        if report::normalized_relative_path(Path::new(relative))? != relative {
            return Err(format!(
                "{}:{}: non-canonical artifact path",
                path.display(),
                index + 1
            ));
        }
        if result
            .insert(relative.to_string(), checksum.to_string())
            .is_some()
        {
            return Err(format!(
                "{}:{}: duplicate checksum path",
                path.display(),
                index + 1
            ));
        }
    }
    Ok(result)
}

fn verify_final_artifact(output: &Path, artifact: &DatabaseArtifact) -> Result<(), String> {
    let path = safe_artifact_path(output, &artifact.path)?;
    verify_file_checksum(&path, &artifact.checksum_sha256)?;
    let connection = Connection::open_with_flags(&path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("cannot open finalized database {}: {error}", path.display()))?;
    databases::verify(&connection, &path)?;
    let fingerprint = databases::schema_fingerprint(&connection)?;
    if fingerprint != artifact.schema_fingerprint_sha256 {
        return Err(format!(
            "schema fingerprint mismatch for {}",
            path.display()
        ));
    }
    Ok(())
}

fn safe_artifact_path(output: &Path, relative: &str) -> Result<PathBuf, String> {
    let path = Path::new(relative);
    if report::normalized_relative_path(path)? != relative {
        return Err(format!("artifact path is not canonical: {relative}"));
    }
    Ok(output.join(path))
}

fn verify_file_checksum(path: &Path, expected: &str) -> Result<(), String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read artifact {}: {error}", path.display()))?;
    let actual = sha256_hex(&bytes);
    if actual != expected {
        return Err(format!("artifact checksum mismatch for {}", path.display()));
    }
    Ok(())
}

fn database_artifact(
    path: &Path,
    relative: String,
    fingerprint: String,
) -> Result<DatabaseArtifact, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read database artifact {}: {error}", path.display()))?;
    Ok(DatabaseArtifact {
        path: relative,
        size_bytes: u64::try_from(bytes.len()).map_err(|_| "database size overflow".to_string())?,
        checksum_sha256: sha256_hex(&bytes),
        schema_fingerprint_sha256: fingerprint,
    })
}

fn artifact_database_path(build_version: u64, locale: KnowledgeLocale, filename: &str) -> String {
    format!("versions/{build_version}/locales/{locale}/{filename}")
}

fn assert_shared_fingerprint(
    expected: &mut Option<String>,
    current: &str,
    kind: &str,
    locale: KnowledgeLocale,
) -> Result<(), String> {
    if let Some(expected) = expected {
        if expected != current {
            return Err(format!(
                "{kind} schema fingerprint differs for locale {locale}"
            ));
        }
    } else {
        *expected = Some(current.to_string());
    }
    Ok(())
}

fn set_digest(values: &BTreeSet<String>) -> String {
    sha256_hex(
        values
            .iter()
            .flat_map(|value| [value.as_bytes(), b"\n"].concat())
            .collect::<Vec<_>>()
            .as_slice(),
    )
}

fn remove_stale_staging(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path).map_err(|error| {
            format!(
                "cannot remove stale staging directory {}: {error}",
                path.display()
            )
        })?;
    }
    Ok(())
}

fn recursive_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.exists() {
        return Ok(Vec::new());
    }
    fn visit(path: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
        let mut entries = fs::read_dir(path)
            .map_err(|error| format!("cannot read {}: {error}", path.display()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            if entry
                .file_type()
                .map_err(|error| error.to_string())?
                .is_dir()
            {
                visit(&path, files)?;
            } else {
                files.push(path);
            }
        }
        Ok(())
    }
    let mut files = Vec::new();
    visit(root, &mut files)?;
    files.sort();
    Ok(files)
}

fn initial_rows_by_type(source: &ValidatedSource) -> RowsByType {
    source
        .entities
        .iter()
        .map(|entry| {
            (
                entry.source.entity.entity_type().to_string(),
                BTreeMap::new(),
            )
        })
        .collect()
}

fn add_row(rows: &mut RowsByType, entity_type: &str, table: &str, count: usize) {
    *rows
        .entry(entity_type.to_string())
        .or_default()
        .entry(table.to_string())
        .or_insert(0) += count;
}

fn taxonomy_for<'a>(
    source: &'a ValidatedSource,
    domain: &str,
    purpose: &str,
) -> Result<&'a TaxonomyEntity, String> {
    source
        .taxonomies
        .get(&(domain.to_string(), purpose.to_string()))
        .ok_or_else(|| format!("missing taxonomy {domain}:{purpose}"))
}

fn semantic_term_table(purpose: &str) -> Option<&'static str> {
    match purpose {
        "target" => Some("product_target_terms"),
        "vaccine_profile" => Some("product_vaccine_profile_terms"),
        "life_stage" => Some("product_life_stage_terms"),
        "therapeutic_scope" => Some("product_therapeutic_scope_terms"),
        _ => None,
    }
}

fn localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Result<&'a str, String> {
    optional_localized_text(content, field, locale)
        .ok_or_else(|| format!("missing localized text {field}.{locale}"))
}

fn optional_localized_text<'a>(
    content: &'a LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<&'a str> {
    content.get(field).and_then(|value| value.text(locale))
}

fn localized_list(
    content: &LocalizedContent,
    field: &str,
    locale: KnowledgeLocale,
) -> Option<Vec<String>> {
    content.get(field).and_then(|value| match value {
        LocalizedValue::List(values) => Some(values.get(locale).clone()),
        LocalizedValue::Text(_) => None,
    })
}

fn content_json(entry: &ValidatedEntity, locale: KnowledgeLocale) -> Result<String, String> {
    let empty = CompiledDocument {
        schema_version: 1,
        sections: Vec::new(),
    };
    json(entry.editorial.get(&locale).unwrap_or(&empty))
}

fn json(value: &impl serde::Serialize) -> Result<String, String> {
    serde_json::to_string(value)
        .map_err(|error| format!("cannot serialize projected JSON: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cas_set_digest_is_order_independent() {
        let left = BTreeSet::from(["b".to_string(), "a".to_string()]);
        let right = BTreeSet::from(["a".to_string(), "b".to_string()]);
        assert_eq!(set_digest(&left), set_digest(&right));
    }
}
