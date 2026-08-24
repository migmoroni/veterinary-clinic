use crate::{
    artifact_verifier::ArtifactVerifier,
    databases::{self, DatabaseKind, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION},
    ledger::{
        search_candidates, CompletedLedger, EntityIdentity, ProjectionJournal, ProjectionLedger,
        ProjectionTarget, SystemTable,
    },
    markdown::CompiledDocument,
    media::{cas_relative_path, decode_hex, sha256_hex},
    normalization::{normalize_identity_key, normalize_search_text},
    report::{
        self, BuildContext, BuildResult, CasResult, DatabaseArtifact, LocaleArtifacts,
        LocaleProjection, MediaProjection, ProjectionReport, ProjectionResult, ProjectionSource,
        TypeProjection,
    },
    schemas,
    source::{
        CanonicalEntity, KnowledgeLocale, LocalizedContent, LocalizedValue, TaxonomyEntity, LOCALES,
    },
    validation::{ValidatedEntity, ValidatedSource},
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

    let result = build_in_staging(source, &staging_version, &staging_cas, context);
    match result {
        Ok(result) => {
            commit_cas(&staging_cas, &output.join("CAS/system"))?;
            if staging_cas.exists() {
                fs::remove_dir_all(&staging_cas)
                    .map_err(|error| format!("cannot remove CAS staging directory: {error}"))?;
            }
            fs::rename(&staging_version, &final_version).map_err(|error| {
                format!(
                    "cannot atomically finalize version {}: {error}",
                    context.build_version
                )
            })?;
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
    staging_version: &Path,
    staging_cas: &Path,
    context: &BuildContext,
) -> Result<BuildResult, String> {
    let source_digest = decode_hex(&source.source_digest_sha256)?;
    let mut locale_artifacts = BTreeMap::new();
    let mut locale_ledgers = BTreeMap::new();
    let mut checksum_entries = BTreeMap::new();
    let mut system_fingerprint = None;
    let mut media_fingerprint = None;
    let mut all_cas_hashes = BTreeSet::new();

    for locale in LOCALES {
        let mut ledger = ProjectionLedger::expected(source, locale, context.release.is_some())?;
        let locale_directory = staging_version.join("locales").join(locale.as_str());
        fs::create_dir_all(&locale_directory)
            .map_err(|error| format!("cannot create locale directory {locale}: {error}"))?;
        let system_path = locale_directory.join("veterinary_clinic_system.db");
        let system_media_path = locale_directory.join("veterinary_clinic_system_media.db");

        let mut system = databases::create(&system_path, DatabaseKind::System)?;
        databases::insert_metadata(&system, context, locale, &source_digest)?;
        publish_metadata_evidence(&system, &mut ledger, context, locale, DatabaseKind::System)?;
        project_system(&mut system, source, locale, &mut ledger)?;
        let current_system_fingerprint = databases::finalize(system, &system_path)?;
        assert_shared_fingerprint(
            &mut system_fingerprint,
            &current_system_fingerprint,
            "system",
            locale,
        )?;

        let mut system_media = databases::create(&system_media_path, DatabaseKind::SystemMedia)?;
        databases::insert_metadata(&system_media, context, locale, &source_digest)?;
        publish_metadata_evidence(
            &system_media,
            &mut ledger,
            context,
            locale,
            DatabaseKind::SystemMedia,
        )?;
        let locale_hashes = project_system_media(&mut system_media, source, locale, &mut ledger)?;
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
        locale_ledgers.insert(locale, ledger);
    }

    stage_cas_objects(source, staging_cas, &all_cas_hashes)?;
    let mut completed_ledgers = BTreeMap::new();
    for (locale, mut ledger) in locale_ledgers {
        let mut journal = ledger.journal();
        let locale_hashes = source
            .media_keys_by_locale
            .get(&locale)
            .into_iter()
            .flatten()
            .map(|key| {
                source
                    .media
                    .get(key)
                    .map(|asset| asset.content_hash_sha256.clone())
                    .ok_or_else(|| format!("media key has no source asset: {key}"))
            })
            .collect::<Result<BTreeSet<_>, _>>()?;
        for content_hash in locale_hashes {
            journal.record_target(ProjectionTarget::CasObject {
                locale,
                content_hash,
            });
        }
        ledger.commit(journal)?;
        completed_ledgers.insert(locale, ledger.finish()?);
    }
    for hash in &all_cas_hashes {
        let relative = format!(
            "CAS/system/{}",
            report::normalized_relative_path(&cas_relative_path(hash)?)?
        );
        checksum_entries.insert(relative, hash.clone());
    }

    let projection_report = projection_report(source, context, &completed_ledgers);
    schemas::validate_projection_report(&projection_report)?;
    let projection_path = staging_version.join("projection-report.json");
    let projection_bytes = report::write_json(&projection_path, &projection_report)?;
    let projection_checksum = sha256_hex(&projection_bytes);
    let projection_relative = format!("versions/{}/projection-report.json", context.build_version);
    checksum_entries.insert(projection_relative.clone(), projection_checksum.clone());

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
    schemas::validate_build_result(&result)?;
    report::write_json(&staging_version.join("build-result.json"), &result)?;
    ArtifactVerifier::new(source, context, staging_version, staging_cas, &result).verify()?;
    Ok(result)
}

fn project_system(
    connection: &mut Connection,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    ledger: &mut ProjectionLedger,
) -> Result<(), String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system projection: {error}"))?;
    let mut rows = initial_rows_by_type(source);
    let mut journal = ledger.journal();
    project_taxonomies(&transaction, source, locale, &mut rows, &mut journal)?;
    project_geo_places(&transaction, source, locale, &mut rows, &mut journal)?;
    project_named_entities(&transaction, source, locale, &mut rows, &mut journal)?;
    project_breeds(&transaction, source, locale, &mut rows, &mut journal)?;
    project_products(&transaction, source, locale, &mut rows, &mut journal)?;
    project_protocols(&transaction, source, locale, &mut rows, &mut journal)?;
    project_entity_media_references(&transaction, source, &mut rows, &mut journal)?;
    project_search(&transaction, source, locale, &mut rows, &mut journal)?;
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system projection: {error}"))?;
    verify_rows_by_table(connection, &rows)?;
    ledger.commit(journal)?;
    Ok(())
}

fn publish_metadata_evidence(
    connection: &Connection,
    ledger: &mut ProjectionLedger,
    context: &BuildContext,
    locale: KnowledgeLocale,
    database: DatabaseKind,
) -> Result<(), String> {
    let build_rows: usize = connection
        .query_row("SELECT COUNT(*) FROM knowledge_build_metadata", [], |row| {
            row.get(0)
        })
        .map_err(|error| format!("cannot verify build metadata cardinality: {error}"))?;
    if build_rows != 1 {
        return Err(format!(
            "knowledge_build_metadata has {build_rows} rows instead of 1"
        ));
    }
    let release_rows: usize = connection
        .query_row(
            "SELECT COUNT(*) FROM knowledge_release_metadata",
            [],
            |row| row.get(0),
        )
        .map_err(|error| format!("cannot verify release metadata cardinality: {error}"))?;
    if release_rows != usize::from(context.release.is_some()) {
        return Err(
            "knowledge_release_metadata cardinality differs from build context".to_string(),
        );
    }
    let mut journal = ledger.journal();
    journal.record_metadata(database, locale, false);
    if context.release.is_some() {
        journal.record_metadata(database, locale, true);
    }
    ledger.commit(journal)
}

fn verify_rows_by_table(connection: &Connection, rows: &RowsByType) -> Result<(), String> {
    let mut expected = BTreeMap::<&str, usize>::new();
    for tables in rows.values() {
        for (table, count) in tables {
            *expected.entry(table).or_default() += count;
        }
    }
    for (table, count) in expected {
        if !table
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte == b'_')
        {
            return Err(format!("invalid projected table identity {table}"));
        }
        let actual: i64 = connection
            .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                row.get(0)
            })
            .map_err(|error| format!("cannot count projected rows in {table}: {error}"))?;
        if usize::try_from(actual).ok() != Some(count) {
            return Err(format!(
                "rowsByTable mismatch for {table}: recorded {count}, observed {actual}"
            ));
        }
    }
    Ok(())
}

fn project_entity_media_references(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    rows: &mut RowsByType,
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for entry in &source.entities {
        let entity_type = entry.source.entity.entity_type();
        if !matches!(
            entity_type,
            "breed" | "product" | "manufacturer" | "active_ingredient" | "condition"
        ) && !entry.structural_media.is_empty()
        {
            return Err(format!(
                "entity type {entity_type} cannot own structural media"
            ));
        }
        for reference in &entry.structural_media {
            transaction.execute(
                "INSERT INTO entity_media_references (entity_type, entity_id, role, media_key, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![entity_type, entry.source.entity.id(), reference.role, reference.media_key, reference.sort_order],
            ).map_err(|error| format!("cannot project media reference {}:{}: {error}", entry.source.entity.id(), reference.media_key))?;
            record_system_row(
                transaction,
                rows,
                journal,
                entity_type,
                "entity_media_references",
                format!(
                    "{}/{}/{}/{}",
                    entity_type,
                    entry.source.entity.id(),
                    reference.role,
                    reference.sort_order
                ),
            )?;
        }
    }
    Ok(())
}

fn project_taxonomies(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
    journal: &mut ProjectionJournal,
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
        record_system_row(
            transaction,
            rows,
            journal,
            "taxonomy",
            "taxonomy_registry",
            taxonomy.id.clone(),
        )?;
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
                            normalize_search_text(label),
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
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "taxonomy",
                    table,
                    format!("{}/{}", taxonomy.id, term.key),
                )?;
            } else {
                transaction.execute(
                    "INSERT INTO taxonomy_terms (taxonomy_id, term_key, parent_term_key, label, normalized_label, aliases_json, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![taxonomy.id, term.key, term.parent_key, label, normalize_search_text(label), aliases_json, term.order],
                ).map_err(|error| format!("cannot project taxonomy term {}:{}: {error}", taxonomy.id, term.key))?;
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "taxonomy",
                    "taxonomy_terms",
                    format!("{}/{}", taxonomy.id, term.key),
                )?;
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
    journal: &mut ProjectionJournal,
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
                params![value.id, value.place_type, value.parent_place_id, json(&value.country_codes)?, value.centroid.latitude, value.centroid.longitude, name, normalize_identity_key(name), json(&aliases)?],
            ).map_err(|error| format!("cannot project geo_place {}: {error}", value.id))?;
            inserted.insert(value.id.clone());
            record_system_row(
                transaction,
                rows,
                journal,
                "geo_place",
                "geo_places",
                value.id.clone(),
            )?;
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
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for entry in &source.entities {
        match &entry.source.entity {
            CanonicalEntity::Manufacturer(value) => {
                let name = localized_text(&value.localized_content, "name", locale)?;
                transaction.execute(
                    "INSERT INTO manufacturer_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, website, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![value.id, value.type_term_key, name, normalize_identity_key(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, value.website, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project manufacturer {}: {error}", value.id))?;
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "manufacturer",
                    "manufacturer_catalog_items",
                    value.id.clone(),
                )?;
                record_compiled_content(journal, entry, locale);
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
                    journal,
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
                    params![value.id, value.type_term_key, name, normalize_identity_key(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, json(&value.nomenclature)?, value.atc_vet_code, optional_localized_text(&value.localized_content, "atcVetSystem", locale), json(&denominations)?, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project active ingredient {}: {error}", value.id))?;
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "active_ingredient",
                    "active_ingredient_catalog_items",
                    value.id.clone(),
                )?;
                record_compiled_content(journal, entry, locale);
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
                    journal,
                )?;
            }
            CanonicalEntity::Condition(value) => {
                let name = localized_text(&value.localized_content, "name", locale)?;
                transaction.execute(
                    "INSERT INTO condition_catalog_items (id, type_term_key, name, normalized_name, aliases_json, regions_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![value.id, value.type_term_key, name, normalize_identity_key(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, json(&value.regions)?, content_json(entry, locale)?],
                ).map_err(|error| format!("cannot project condition {}: {error}", value.id))?;
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "condition",
                    "condition_catalog_items",
                    value.id.clone(),
                )?;
                record_compiled_content(journal, entry, locale);
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
                    journal,
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
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::Breed(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO breed_reference_items (id, species_json, name, normalized_name, aliases_json, size_term_key, average_weight_kg_json, average_height_cm_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![value.id, json(&value.species)?, name, normalize_identity_key(name), json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, value.size_term_key, json(&value.average_weight_kg)?, json(&value.average_height_cm)?, content_json(entry, locale)?],
        ).map_err(|error| format!("cannot project breed {}: {error}", value.id))?;
        record_system_row(
            transaction,
            rows,
            journal,
            "breed",
            "breed_reference_items",
            value.id.clone(),
        )?;
        record_compiled_content(journal, entry, locale);
        for (order, place_id) in value.origin_place_ids.iter().enumerate() {
            transaction.execute("INSERT INTO breed_origin_places (breed_id, place_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, place_id, order])
                .map_err(|error| format!("cannot project breed origin {} -> {}: {error}", value.id, place_id))?;
            record_system_row(
                transaction,
                rows,
                journal,
                "breed",
                "breed_origin_places",
                format!("{}/{place_id}", value.id),
            )?;
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
            journal,
        )?;
    }
    Ok(())
}

fn project_products(
    transaction: &Transaction<'_>,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    rows: &mut RowsByType,
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::Product(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO product_catalog_items (id, type_term_key, name, normalized_name, species_json, aliases_json, manufacturer_id, regions_json, regulatory_identifiers_json, commercial_line, presentation_dosage, target_species_warnings_json, content_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![value.id, value.type_term_key, name, normalize_identity_key(name), json(&value.species)?, json(&localized_list(&value.localized_content, "aliases", locale).unwrap_or_default())?, value.manufacturer_id, json(&value.regions)?, json(&value.regulatory_identifiers)?, optional_localized_text(&value.localized_content, "commercialLine", locale), optional_localized_text(&value.localized_content, "presentationDosage", locale), json(&localized_list(&value.localized_content, "targetSpeciesWarnings", locale).unwrap_or_default())?, content_json(entry, locale)?],
        ).map_err(|error| format!("cannot project product {}: {error}", value.id))?;
        record_system_row(
            transaction,
            rows,
            journal,
            "product",
            "product_catalog_items",
            value.id.clone(),
        )?;
        record_compiled_content(journal, entry, locale);
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
            journal,
        )?;
        for (order, ingredient_id) in value.active_ingredient_ids.iter().enumerate() {
            transaction.execute("INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, ingredient_id, order])
                .map_err(|error| format!("cannot project product ingredient {} -> {}: {error}", value.id, ingredient_id))?;
            record_system_row(
                transaction,
                rows,
                journal,
                "product",
                "product_active_ingredients",
                format!("{}/{ingredient_id}", value.id),
            )?;
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
                record_system_row(
                    transaction,
                    rows,
                    journal,
                    "product",
                    table,
                    format!("{}/{term}", value.id),
                )?;
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
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for entry in &source.entities {
        let CanonicalEntity::TreatmentProtocol(value) = &entry.source.entity else {
            continue;
        };
        let name = localized_text(&value.localized_content, "name", locale)?;
        transaction.execute(
            "INSERT INTO treatment_protocols (id, kind, name, normalized_name, species_json, observation) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![value.id, value.kind, name, normalize_identity_key(name), json(&value.species)?, optional_localized_text(&value.localized_content, "observation", locale)],
        ).map_err(|error| format!("cannot project protocol {}: {error}", value.id))?;
        record_system_row(
            transaction,
            rows,
            journal,
            "treatment_protocol",
            "treatment_protocols",
            value.id.clone(),
        )?;
        for (order, product_id) in value.product_ids.iter().enumerate() {
            transaction.execute("INSERT INTO treatment_protocol_items (protocol_id, product_id, sort_order) VALUES (?1, ?2, ?3)", params![value.id, product_id, order])
                .map_err(|error| format!("cannot project protocol item {} -> {}: {error}", value.id, product_id))?;
            record_system_row(
                transaction,
                rows,
                journal,
                "treatment_protocol",
                "treatment_protocol_items",
                format!("{}/{product_id}", value.id),
            )?;
        }
        for (order, dose) in value.doses.iter().enumerate() {
            transaction.execute("INSERT INTO treatment_protocol_doses (protocol_id, dose_id, label, validity_value, validity_unit, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)", params![value.id, dose.id, localized_text(&dose.localized_content, "label", locale)?, dose.validity_value, dose.validity_unit, order])
                .map_err(|error| format!("cannot project protocol dose {} -> {}: {error}", value.id, dose.id))?;
            record_system_row(
                transaction,
                rows,
                journal,
                "treatment_protocol",
                "treatment_protocol_doses",
                format!("{}/{}", value.id, dose.id),
            )?;
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
    journal: &mut ProjectionJournal,
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
        record_system_row(
            transaction,
            rows,
            journal,
            entity_type,
            "entity_taxonomy_terms",
            format!("{entity_type}/{entity_id}/type/{type_key}"),
        )?;
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
            record_system_row(
                transaction,
                rows,
                journal,
                entity_type,
                "entity_taxonomy_terms",
                format!("{entity_type}/{entity_id}/classification/{term}"),
            )?;
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
        record_system_row(
            transaction,
            rows,
            journal,
            entity_type,
            "entity_taxonomy_terms",
            format!("{entity_type}/{entity_id}/size/{size_key}"),
        )?;
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
    journal: &mut ProjectionJournal,
) -> Result<(), String> {
    for candidate in search_candidates(source, locale)? {
        let normalized = normalize_search_text(&candidate.value);
        let affected = transaction
            .execute(
                "INSERT INTO entity_search_terms (entity_type, entity_id, value, normalized_value, provenance, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    candidate.entity.entity_type,
                    candidate.entity.id,
                    candidate.value,
                    normalized,
                    candidate.provenance,
                    candidate.occurrence
                ],
            )
            .map_err(|error| {
                format!(
                    "cannot project search value for {}: {error}",
                    candidate.entity
                )
            })?;
        add_row(
            rows,
            &candidate.entity.entity_type,
            "entity_search_terms",
            affected,
        );
        journal.record_search(
            affected,
            candidate.entity,
            locale,
            candidate.provenance,
            candidate.occurrence,
        )?;
    }
    Ok(())
}

#[allow(dead_code)]
fn project_system_media(
    connection: &mut Connection,
    source: &ValidatedSource,
    locale: KnowledgeLocale,
    ledger: &mut ProjectionLedger,
) -> Result<BTreeSet<String>, String> {
    let transaction = connection
        .transaction()
        .map_err(|error| format!("cannot begin system_media projection: {error}"))?;
    let mut hashes = BTreeSet::new();
    let mut journal = ledger.journal();
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
        let affected = transaction.execute(
            "INSERT INTO media_assets (media_key, content_hash, thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![asset.media_key, hash, asset.thumbnail, asset.thumbnail_mime_type, asset.thumbnail_width, asset.thumbnail_height, asset.mime_type, asset.size_bytes, asset.width, asset.height],
        ).map_err(|error| format!("cannot project media asset {}: {error}", asset.media_key))?;
        journal.record_media_asset(affected, locale, asset.media_key.clone())?;
        hashes.insert(asset.content_hash_sha256.clone());
    }
    transaction
        .commit()
        .map_err(|error| format!("cannot commit system_media projection: {error}"))?;
    ledger.commit(journal)?;
    Ok(hashes)
}

fn projection_report(
    source: &ValidatedSource,
    context: &BuildContext,
    ledgers: &BTreeMap<KnowledgeLocale, CompletedLedger>,
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
    let locales = ledgers
        .iter()
        .map(|(locale, ledger)| {
            debug_assert_eq!(ledger.locale, *locale);
            let consumed_entities = ledger.entities_by_type();
            let rows = ledger.rows_by_type();
            let projected_by_type = entities_by_type
                .keys()
                .map(|entity_type| {
                    (
                        entity_type.clone(),
                        TypeProjection {
                            entities: *consumed_entities.get(entity_type).unwrap_or(&0),
                            rows_by_table: rows.get(entity_type).cloned().unwrap_or_default(),
                        },
                    )
                })
                .collect();
            (
                *locale,
                LocaleProjection {
                    projected_by_type,
                    rows_by_database: ledger.rows_by_database(),
                    expected_obligation_count: ledger.expected_count(),
                    completed_obligation_count: ledger.completed_count(),
                    row_event_count: ledger.row_event_count(),
                    resolved_relation_count: ledger.relation_count(),
                    consumed_localized_fragments: ledger.localized_fragment_count(),
                    evidence_digest_sha256: ledger.evidence_digest(),
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
        schema_version: 2,
        source_digest_sha256: source.source_digest_sha256.clone(),
        build_version: context.build_version,
        system_schema_version: SYSTEM_SCHEMA_VERSION,
        system_media_schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
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
        drop(file);
        let persisted = fs::read(&path)
            .map_err(|error| format!("cannot reread CAS staging object: {error}"))?;
        if sha256_hex(&persisted) != *hash {
            return Err(format!(
                "CAS staging object failed post-write verification: {}",
                path.display()
            ));
        }
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
    let raw: serde_json::Value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("existing build-result.json is invalid: {error}"))?;
    schemas::validate_build_result(&raw)?;
    let result: BuildResult = serde_json::from_value(raw)
        .map_err(|error| format!("existing build-result.json is invalid: {error}"))?;
    if result.build_version != context.build_version
        || result.release != context.release
        || result.source_digest_sha256 != source.source_digest_sha256
        || result.builder_version != env!("CARGO_PKG_VERSION")
        || result.system_schema_version != SYSTEM_SCHEMA_VERSION
        || result.system_media_schema_version != SYSTEM_MEDIA_SCHEMA_VERSION
    {
        return Err(format!(
            "build version {} already exists with divergent content or context",
            context.build_version
        ));
    }
    ArtifactVerifier::new(
        source,
        context,
        final_version,
        &output.join("CAS/system"),
        &result,
    )
    .verify()?;
    Ok(result)
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

fn record_system_row(
    transaction: &Transaction<'_>,
    rows: &mut RowsByType,
    journal: &mut ProjectionJournal,
    entity_type: &str,
    table: &str,
    row: String,
) -> Result<(), String> {
    let affected = usize::try_from(transaction.changes())
        .map_err(|_| format!("{table} affected row count exceeds usize"))?;
    add_row(rows, entity_type, table, affected);
    let entity_id = if matches!(table, "entity_media_references" | "entity_taxonomy_terms") {
        row.split('/').nth(1)
    } else {
        row.split('/').next()
    }
    .unwrap_or_default()
    .to_string();
    journal.record_row(
        affected,
        DatabaseKind::System,
        SystemTable::parse(table)?,
        row,
        Some(EntityIdentity::new(entity_type, entity_id)),
    )
}

fn record_compiled_content(
    journal: &mut ProjectionJournal,
    entry: &ValidatedEntity,
    locale: KnowledgeLocale,
) {
    let Some(document) = entry.editorial.get(&locale) else {
        return;
    };
    let entity = EntityIdentity::new(entry.source.entity.entity_type(), entry.source.entity.id());
    journal.record_target(ProjectionTarget::CompiledDocument {
        entity: entity.clone(),
        locale,
    });
    for section in &document.sections {
        journal.record_target(ProjectionTarget::CompiledSection {
            entity: entity.clone(),
            locale,
            section_key: section.section_key.clone(),
        });
    }
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
    let content = entry.editorial.get(&locale).unwrap_or(&empty);
    schemas::validate_content(content)?;
    json(content)
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
