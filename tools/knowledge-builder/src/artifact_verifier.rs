//! Verifies staged and reusable artifact sets against their source, build context,
//! projection contracts, physical declarations, and semantic contents.

use crate::{
    databases::{self, DatabaseKind, SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION},
    ledger::{evidence_digest, SystemTable},
    markdown::{collect_compiled_media_keys, CompiledDocument},
    media::{cas_relative_path, decode_hex, decode_image, mime_for_format, sha256_hex},
    projection::contract::ProjectionContract,
    report::{self, BuildContext, BuildResult, DatabaseArtifact, ProjectionReport},
    schemas,
    source::{KnowledgeLocale, LOCALES},
    validation::ValidatedSource,
    verification::readers,
};
use image::{GenericImageView, ImageFormat};
use rusqlite::{Connection, OpenFlags};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
};

type StructuralMediaRow = (String, String, String, usize, String);
type CompiledSectionIdentity = (String, String, String);
type CompiledMediaOccurrences = BTreeMap<CompiledSectionIdentity, Vec<String>>;

pub(crate) struct ArtifactVerifier<'a> {
    source: &'a ValidatedSource,
    context: &'a BuildContext,
    contracts: &'a BTreeMap<KnowledgeLocale, ProjectionContract>,
    version_root: &'a Path,
    cas_root: &'a Path,
    result: &'a BuildResult,
}

impl<'a> ArtifactVerifier<'a> {
    pub(crate) fn new(
        source: &'a ValidatedSource,
        context: &'a BuildContext,
        contracts: &'a BTreeMap<KnowledgeLocale, ProjectionContract>,
        version_root: &'a Path,
        cas_root: &'a Path,
        result: &'a BuildResult,
    ) -> Self {
        Self {
            source,
            context,
            contracts,
            version_root,
            cas_root,
            result,
        }
    }

    pub(crate) fn verify(&self) -> Result<(), String> {
        self.verify_identity()?;
        self.verify_structure()?;
        let checksum_entries = self.verify_manifest_and_checksums()?;
        let report = self.read_report()?;
        let mut global_hashes = BTreeSet::new();
        let mut system_fingerprint = None;
        let mut media_fingerprint = None;
        for locale in LOCALES {
            let artifacts = self
                .result
                .locales
                .get(locale.as_str())
                .ok_or_else(|| format!("build result misses locale {locale}"))?;
            let system_path =
                self.verify_database_artifact(&artifacts.system, DatabaseKind::System, locale)?;
            let media_path = self.verify_database_artifact(
                &artifacts.system_media,
                DatabaseKind::SystemMedia,
                locale,
            )?;
            assert_shared_fingerprint(
                &mut system_fingerprint,
                &artifacts.system.schema_fingerprint_sha256,
                "system",
                locale,
            )?;
            assert_shared_fingerprint(
                &mut media_fingerprint,
                &artifacts.system_media.schema_fingerprint_sha256,
                "system_media",
                locale,
            )?;
            let locale_hashes = self.verify_locale(locale, &system_path, &media_path, &report)?;
            if set_digest(&locale_hashes) != artifacts.cas_set_digest_sha256 {
                return Err(format!("locale CAS set digest mismatch for {locale}"));
            }
            global_hashes.extend(locale_hashes);
        }
        if global_hashes.len() != self.result.cas.object_count
            || set_digest(&global_hashes) != self.result.cas.set_digest_sha256
        {
            return Err("global CAS set differs from build-result.json".to_string());
        }
        self.verify_checksum_coverage(&checksum_entries, &global_hashes)?;
        self.verify_report_semantics(&report)?;
        Ok(())
    }

    fn verify_identity(&self) -> Result<(), String> {
        schemas::validate_build_result(self.result)?;
        if self.result.build_version != self.context.build_version
            || self.result.release != self.context.release
            || self.result.source_digest_sha256 != self.source.source_digest_sha256
            || self.result.builder_version != env!("CARGO_PKG_VERSION")
            || self.result.system_schema_version != SYSTEM_SCHEMA_VERSION
            || self.result.system_media_schema_version != SYSTEM_MEDIA_SCHEMA_VERSION
        {
            return Err("artifact identity differs from source or build context".to_string());
        }
        let result_path = self.version_root.join("build-result.json");
        let raw: serde_json::Value = serde_json::from_slice(
            &fs::read(&result_path)
                .map_err(|error| format!("cannot read {}: {error}", result_path.display()))?,
        )
        .map_err(|error| format!("build-result.json is invalid JSON: {error}"))?;
        schemas::validate_build_result(&raw)?;
        let expected = serde_json::to_value(self.result)
            .map_err(|error| format!("cannot compare build result: {error}"))?;
        if raw != expected {
            return Err("build-result.json differs from the verified manifest".to_string());
        }
        Ok(())
    }

    fn verify_structure(&self) -> Result<(), String> {
        let (files, directories) = inspect_tree(self.version_root)?;
        let expected_files = expected_version_files();
        if files != expected_files {
            return Err("version contains missing or additional files".to_string());
        }
        let mut expected_directories = BTreeSet::from(["locales".to_string()]);
        expected_directories.extend(LOCALES.map(|locale| format!("locales/{locale}")));
        if directories != expected_directories {
            return Err("version contains missing or additional directories".to_string());
        }
        Ok(())
    }

    fn verify_manifest_and_checksums(&self) -> Result<BTreeMap<String, String>, String> {
        let projection_path = self.resolve_version_path(&self.result.projection.report_path)?;
        verify_file_checksum(&projection_path, &self.result.projection.checksum_sha256)?;
        let checksum_path = self.resolve_version_path(&self.result.checksum_file)?;
        let entries = read_checksum_entries(&checksum_path)?;
        for (relative, checksum) in &entries {
            let path = self.resolve_declared_path(relative)?;
            verify_file_checksum(&path, checksum)?;
        }
        Ok(entries)
    }

    fn read_report(&self) -> Result<ProjectionReport, String> {
        let path = self.resolve_version_path(&self.result.projection.report_path)?;
        let bytes =
            fs::read(&path).map_err(|error| format!("cannot read projection report: {error}"))?;
        let raw: serde_json::Value = serde_json::from_slice(&bytes)
            .map_err(|error| format!("projection report is invalid JSON: {error}"))?;
        schemas::validate_projection_report(&raw)?;
        serde_json::from_value(raw)
            .map_err(|error| format!("projection report has an invalid contract: {error}"))
    }

    fn verify_database_artifact(
        &self,
        artifact: &DatabaseArtifact,
        kind: DatabaseKind,
        locale: KnowledgeLocale,
    ) -> Result<PathBuf, String> {
        let expected_name = match kind {
            DatabaseKind::System => "veterinary_clinic_system.db",
            DatabaseKind::SystemMedia => "veterinary_clinic_system_media.db",
        };
        let expected_relative = format!(
            "versions/{}/locales/{locale}/{expected_name}",
            self.context.build_version
        );
        if artifact.path != expected_relative {
            return Err(format!(
                "non-canonical database artifact path: {}",
                artifact.path
            ));
        }
        let path = self.resolve_version_path(&artifact.path)?;
        let metadata = fs::metadata(&path)
            .map_err(|error| format!("cannot stat database {}: {error}", path.display()))?;
        if metadata.len() != artifact.size_bytes {
            return Err(format!("sizeBytes mismatch for {}", path.display()));
        }
        verify_file_checksum(&path, &artifact.checksum_sha256)?;
        let connection = Connection::open_with_flags(&path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|error| format!("cannot open database {}: {error}", path.display()))?;
        let source_digest = decode_hex(&self.result.source_digest_sha256)?;
        databases::verify_contract(
            &connection,
            &path,
            kind,
            self.context,
            locale,
            &source_digest,
        )?;
        if databases::schema_fingerprint(&connection)? != artifact.schema_fingerprint_sha256 {
            return Err(format!(
                "schema fingerprint mismatch for {}",
                path.display()
            ));
        }
        Ok(path)
    }

    fn verify_locale(
        &self,
        locale: KnowledgeLocale,
        system_path: &Path,
        media_path: &Path,
        report: &ProjectionReport,
    ) -> Result<BTreeSet<String>, String> {
        let system = Connection::open_with_flags(system_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|error| format!("cannot open system database: {error}"))?;
        let media = Connection::open_with_flags(media_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
            .map_err(|error| format!("cannot open system_media database: {error}"))?;
        let locale_report = report
            .locales
            .get(locale.as_str())
            .ok_or_else(|| format!("projection report misses locale {locale}"))?;
        let contract = self
            .contracts
            .get(&locale)
            .ok_or_else(|| format!("projection contract misses locale {locale}"))?;
        verify_database_row_counts(&system, DatabaseKind::System, locale_report)?;
        verify_database_row_counts(&media, DatabaseKind::SystemMedia, locale_report)?;
        readers::verify_semantic_equivalence(&system, &media, contract)?;

        let structural_rows = structural_media_references(&system)?;
        let expected_structural = self
            .source
            .entities
            .iter()
            .flat_map(|entry| {
                entry.structural_media.iter().map(|reference| {
                    (
                        entry.source.entity.entity_type().to_string(),
                        entry.source.entity.id().to_string(),
                        reference.role.to_string(),
                        reference.sort_order,
                        reference.media_key.clone(),
                    )
                })
            })
            .collect::<BTreeSet<_>>();
        if structural_rows != expected_structural {
            return Err(format!(
                "structural media references differ from source evidence for {locale}"
            ));
        }
        let structural = structural_rows
            .iter()
            .map(|row| row.4.clone())
            .collect::<BTreeSet<_>>();
        verify_structural_media_owners(&system)?;
        let markdown_occurrences = compiled_media_occurrences(&system)?;
        let mut expected_markdown = BTreeMap::<(String, String, String), Vec<String>>::new();
        for entry in &self.source.entities {
            for reference in entry.markdown_media.get(&locale).into_iter().flatten() {
                expected_markdown
                    .entry((
                        entry.source.entity.entity_type().to_string(),
                        entry.source.entity.id().to_string(),
                        reference.section_key.clone(),
                    ))
                    .or_default()
                    .push(reference.media_key.clone());
            }
        }
        if markdown_occurrences != expected_markdown {
            return Err(format!(
                "compiled Markdown media occurrences differ from source evidence for {locale}"
            ));
        }
        let markdown = markdown_occurrences
            .values()
            .flatten()
            .cloned()
            .collect::<BTreeSet<_>>();
        let referenced = structural
            .union(&markdown)
            .cloned()
            .collect::<BTreeSet<_>>();
        let mut assets = BTreeSet::new();
        let mut hashes = BTreeSet::new();
        let mut statement = media
            .prepare(
                "SELECT media_key, lower(hex(content_hash)), thumbnail, thumbnail_mime_type, thumbnail_width, thumbnail_height, mime_type, size_bytes, width, height FROM media_assets ORDER BY media_key",
            )
            .map_err(|error| format!("cannot inspect media_assets: {error}"))?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Vec<u8>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, u32>(4)?,
                    row.get::<_, u32>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, u64>(7)?,
                    row.get::<_, u32>(8)?,
                    row.get::<_, u32>(9)?,
                ))
            })
            .map_err(|error| format!("cannot query media_assets: {error}"))?;
        for row in rows {
            let (
                media_key,
                hash,
                thumbnail,
                thumbnail_mime,
                thumbnail_width,
                thumbnail_height,
                mime_type,
                size_bytes,
                width,
                height,
            ) = row.map_err(|error| format!("cannot read media asset: {error}"))?;
            let source_asset = self.source.media.get(&media_key).ok_or_else(|| {
                format!("localized media asset is absent from validated source: {media_key}")
            })?;
            let expected_cas = contract
                .cas
                .iter()
                .find(|operation| operation.content_hash == hash)
                .ok_or_else(|| format!("projection contract misses CAS object {hash}"))?;
            if hash != source_asset.content_hash_sha256
                || mime_type != source_asset.mime_type
                || size_bytes != source_asset.size_bytes
                || (width, height) != (source_asset.width, source_asset.height)
            {
                return Err(format!(
                    "original media metadata differs from source evidence for {media_key}"
                ));
            }
            if thumbnail_mime != "image/jpeg"
                || image::guess_format(&thumbnail)
                    .map_err(|error| format!("invalid thumbnail for {media_key}: {error}"))?
                    != ImageFormat::Jpeg
            {
                return Err(format!("thumbnail for {media_key} is not JPEG"));
            }
            let decoded = image::load_from_memory_with_format(&thumbnail, ImageFormat::Jpeg)
                .map_err(|error| format!("cannot decode thumbnail for {media_key}: {error}"))?;
            if decoded.dimensions() != (thumbnail_width, thumbnail_height)
                || thumbnail_width > 200
                || thumbnail_height > 200
                || thumbnail_width > width
                || thumbnail_height > height
            {
                return Err(format!("thumbnail dimensions mismatch for {media_key}"));
            }
            let cas_path = self.cas_root.join(cas_relative_path(&hash)?);
            verify_file_checksum(&cas_path, &hash)?;
            let cas_bytes = fs::read(&cas_path).map_err(|error| {
                format!("cannot read CAS object {}: {error}", cas_path.display())
            })?;
            if cas_bytes != expected_cas.bytes
                || cas_bytes.len() as u64 != size_bytes
                || mime_for_format(image::guess_format(&cas_bytes).map_err(|error| {
                    format!("cannot identify CAS object for {media_key}: {error}")
                })?)?
                    != mime_type
                || decode_image(&cas_bytes, &source_asset.source_path)?.dimensions()
                    != (width, height)
            {
                return Err(format!(
                    "CAS object bytes or visual metadata differ for {media_key}"
                ));
            }
            assets.insert(media_key);
            hashes.insert(hash);
        }
        if assets != referenced {
            return Err(format!(
                "localized media assets differ from structural and Markdown references for {locale}"
            ));
        }
        Ok(hashes)
    }

    fn verify_checksum_coverage(
        &self,
        entries: &BTreeMap<String, String>,
        hashes: &BTreeSet<String>,
    ) -> Result<(), String> {
        let mut expected = BTreeSet::new();
        for locale in LOCALES {
            let artifacts = self.result.locales.get(locale.as_str()).unwrap();
            expected.insert(artifacts.system.path.clone());
            expected.insert(artifacts.system_media.path.clone());
        }
        expected.insert(self.result.projection.report_path.clone());
        for hash in hashes {
            expected.insert(format!(
                "CAS/system/{}",
                report::normalized_relative_path(&cas_relative_path(hash)?)?
            ));
        }
        if entries.keys().cloned().collect::<BTreeSet<_>>() != expected {
            return Err("checksums.sha256 coverage differs from referenced artifacts".to_string());
        }
        Ok(())
    }

    fn verify_report_semantics(&self, report: &ProjectionReport) -> Result<(), String> {
        if report.source_digest_sha256 != self.result.source_digest_sha256
            || report.build_version != self.result.build_version
            || report.system_schema_version != self.result.system_schema_version
            || report.system_media_schema_version != self.result.system_media_schema_version
        {
            return Err("projection report identity differs from build-result.json".to_string());
        }
        let entities_by_type = self.source.entities.iter().fold(
            BTreeMap::<String, usize>::new(),
            |mut result, entry| {
                *result
                    .entry(entry.source.entity.entity_type().to_string())
                    .or_default() += 1;
                result
            },
        );
        let localized = self
            .source
            .localized_fragments_by_locale
            .iter()
            .map(|(locale, count)| (locale.to_string(), *count))
            .collect::<BTreeMap<_, _>>();
        if report.source.entities_by_type != entities_by_type
            || report.source.relation_count != self.source.relation_count
            || report.source.localized_fragments_by_locale != localized
            || report.source.source_files != self.source.source_files
        {
            return Err("projection report source facts differ from validated source".to_string());
        }
        for locale in LOCALES {
            let contract = self.contracts.get(&locale).unwrap();
            let expected_relation_count = contract
                .expected_obligations
                .iter()
                .filter(|obligation| obligation.class == crate::ledger::ObligationClass::Relation)
                .map(|obligation| &obligation.source)
                .collect::<BTreeSet<_>>()
                .len();
            let expected_localized_fragments = contract
                .expected_obligations
                .iter()
                .filter(|obligation| {
                    obligation.class == crate::ledger::ObligationClass::LocalizedContent
                })
                .map(|obligation| &obligation.source)
                .collect::<BTreeSet<_>>()
                .len();
            if expected_relation_count != self.source.relation_count {
                return Err(format!(
                    "regenerated relation obligations differ from source facts for {locale}"
                ));
            }
            let actual = report.locales.get(locale.as_str()).unwrap();
            if actual.expected_obligation_count != contract.expected_obligations.len()
                || actual.completed_obligation_count != contract.expected_obligations.len()
                || actual.operation_count != contract.operation_count()
                || actual.resolved_relation_count != expected_relation_count
                || actual.consumed_localized_fragments != expected_localized_fragments
                || expected_localized_fragments != contract.source_facts.localized_fragments
                || actual.evidence_digest_sha256 != evidence_digest(&contract.expected_obligations)
            {
                return Err(format!("projection evidence mismatch for {locale}"));
            }
            let projected_entities = actual
                .projected_by_type
                .iter()
                .map(|(entity_type, projection)| (entity_type.clone(), projection.entities))
                .collect::<BTreeMap<_, _>>();
            if projected_entities != entities_by_type {
                return Err(format!("projected entity counts mismatch for {locale}"));
            }
            let projectable_rows = actual
                .rows_by_database
                .values()
                .flat_map(|tables| tables.values())
                .sum::<usize>();
            let metadata_events = 2 + usize::from(self.context.release.is_some()) * 2;
            if actual.row_event_count != projectable_rows + metadata_events {
                return Err(format!("row event count mismatch for {locale}"));
            }
            let mut rows_from_types = BTreeMap::<String, usize>::new();
            for projection in actual.projected_by_type.values() {
                for (table, count) in &projection.rows_by_table {
                    *rows_from_types.entry(table.clone()).or_default() += count;
                }
            }
            let system_rows = actual.rows_by_database.get("system").unwrap();
            for (table, count) in system_rows {
                if rows_from_types.get(table).copied().unwrap_or_default() != *count {
                    return Err(format!(
                        "rowsByTable attribution mismatch for {locale}.{table}"
                    ));
                }
            }
        }
        let source_media_files = self
            .source
            .media
            .values()
            .map(|asset| asset.source_path.as_path())
            .collect::<BTreeSet<_>>()
            .len();
        let unique_hashes = self
            .source
            .media
            .values()
            .map(|asset| asset.content_hash_sha256.as_str())
            .collect::<BTreeSet<_>>()
            .len();
        if report.media.source_files != source_media_files
            || report.media.referenced_media_keys != self.source.media.len()
            || report.media.unique_content_hashes != unique_hashes
        {
            return Err("projection report media facts differ from validated source".to_string());
        }
        Ok(())
    }

    fn resolve_version_path(&self, declared: &str) -> Result<PathBuf, String> {
        let prefix = format!("versions/{}/", self.context.build_version);
        let suffix = declared
            .strip_prefix(&prefix)
            .ok_or_else(|| format!("artifact path is outside version: {declared}"))?;
        if report::normalized_relative_path(Path::new(suffix))? != suffix {
            return Err(format!("artifact path is not canonical: {declared}"));
        }
        Ok(self.version_root.join(suffix))
    }

    fn resolve_declared_path(&self, declared: &str) -> Result<PathBuf, String> {
        if declared.starts_with("versions/") {
            self.resolve_version_path(declared)
        } else if let Some(suffix) = declared.strip_prefix("CAS/system/") {
            if report::normalized_relative_path(Path::new(suffix))? != suffix {
                return Err(format!("CAS path is not canonical: {declared}"));
            }
            Ok(self.cas_root.join(suffix))
        } else {
            Err(format!("unexpected artifact path: {declared}"))
        }
    }
}

fn verify_database_row_counts(
    connection: &Connection,
    kind: DatabaseKind,
    report: &crate::report::LocaleProjection,
) -> Result<(), String> {
    let database = match kind {
        DatabaseKind::System => "system",
        DatabaseKind::SystemMedia => "systemMedia",
    };
    let expected = report
        .rows_by_database
        .get(database)
        .ok_or_else(|| format!("report misses rows for {database}"))?;
    let tables: &[SystemTable] = match kind {
        DatabaseKind::System => &SystemTable::SYSTEM_PROJECTABLE,
        DatabaseKind::SystemMedia => &SystemTable::SYSTEM_MEDIA_PROJECTABLE,
    };
    for table in tables {
        let actual: usize = connection
            .query_row(
                &format!("SELECT COUNT(*) FROM {}", table.as_str()),
                [],
                |row| row.get(0),
            )
            .map_err(|error| format!("cannot count {}: {error}", table.as_str()))?;
        if expected.get(table.as_str()).copied() != Some(actual) {
            return Err(format!(
                "row count mismatch for {database}.{}",
                table.as_str()
            ));
        }
    }
    Ok(())
}

fn structural_media_references(
    connection: &Connection,
) -> Result<BTreeSet<StructuralMediaRow>, String> {
    let mut statement = connection
        .prepare("SELECT entity_type, entity_id, role, sort_order, media_key FROM entity_media_references ORDER BY entity_type, entity_id, role, sort_order")
        .map_err(|error| format!("cannot inspect structural media references: {error}"))?;
    let result = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, usize>(3)?,
                row.get::<_, String>(4)?,
            ))
        })
        .map_err(|error| error.to_string())?
        .collect::<Result<BTreeSet<_>, _>>()
        .map_err(|error| error.to_string());
    result
}

fn verify_structural_media_owners(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("SELECT entity_type, entity_id FROM entity_media_references ORDER BY entity_type, entity_id")
        .map_err(|error| format!("cannot inspect structural media owners: {error}"))?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?;
    for row in rows {
        let (entity_type, entity_id) = row.map_err(|error| error.to_string())?;
        let table = match entity_type.as_str() {
            "breed" => "breed_reference_items",
            "product" => "product_catalog_items",
            "manufacturer" => "manufacturer_catalog_items",
            "active_ingredient" => "active_ingredient_catalog_items",
            "condition" => "condition_catalog_items",
            _ => return Err(format!("unsupported structural media owner {entity_type}")),
        };
        let count: usize = connection
            .query_row(
                &format!("SELECT COUNT(*) FROM {table} WHERE id = ?1"),
                [&entity_id],
                |row| row.get(0),
            )
            .map_err(|error| format!("cannot verify media owner: {error}"))?;
        if count != 1 {
            return Err(format!(
                "structural media owner does not exist: {entity_type}:{entity_id}"
            ));
        }
    }
    Ok(())
}

fn compiled_media_occurrences(connection: &Connection) -> Result<CompiledMediaOccurrences, String> {
    let mut result = BTreeMap::new();
    for (entity_type, table) in [
        ("breed", "breed_reference_items"),
        ("manufacturer", "manufacturer_catalog_items"),
        ("active_ingredient", "active_ingredient_catalog_items"),
        ("condition", "condition_catalog_items"),
        ("product", "product_catalog_items"),
    ] {
        let mut statement = connection
            .prepare(&format!("SELECT id, content_json FROM {table} ORDER BY id"))
            .map_err(|error| format!("cannot inspect compiled content in {table}: {error}"))?;
        let rows = statement
            .query_map([], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|error| error.to_string())?;
        for row in rows {
            let (id, content) = row.map_err(|error| error.to_string())?;
            let raw: serde_json::Value = serde_json::from_str(&content)
                .map_err(|error| format!("invalid content_json in {table}: {error}"))?;
            schemas::validate_content(&raw)?;
            let document: CompiledDocument = serde_json::from_value(raw)
                .map_err(|error| format!("invalid compiled document in {table}: {error}"))?;
            for section in document.sections {
                let keys = collect_compiled_media_keys(&section.compiled_markdown)?;
                if !keys.is_empty() {
                    result.insert(
                        (entity_type.to_string(), id.clone(), section.section_key),
                        keys,
                    );
                }
            }
        }
    }
    Ok(result)
}

fn inspect_tree(root: &Path) -> Result<(BTreeSet<String>, BTreeSet<String>), String> {
    fn visit(
        root: &Path,
        directory: &Path,
        files: &mut BTreeSet<String>,
        directories: &mut BTreeSet<String>,
    ) -> Result<(), String> {
        let mut entries = fs::read_dir(directory)
            .map_err(|error| format!("cannot inspect {}: {error}", directory.display()))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            let path = entry.path();
            let file_type = entry.file_type().map_err(|error| error.to_string())?;
            if file_type.is_symlink() {
                return Err(format!("artifact symlink is forbidden: {}", path.display()));
            }
            let relative = path
                .strip_prefix(root)
                .map_err(|_| "artifact path escaped version root".to_string())?;
            let relative = report::normalized_relative_path(relative)?;
            if file_type.is_dir() {
                directories.insert(relative);
                visit(root, &path, files, directories)?;
            } else if file_type.is_file() {
                files.insert(relative);
            } else {
                return Err(format!(
                    "special artifact file is forbidden: {}",
                    path.display()
                ));
            }
        }
        Ok(())
    }
    let mut files = BTreeSet::new();
    let mut directories = BTreeSet::new();
    visit(root, root, &mut files, &mut directories)?;
    Ok((files, directories))
}

fn expected_version_files() -> BTreeSet<String> {
    let mut files = BTreeSet::from([
        "build-result.json".to_string(),
        "checksums.sha256".to_string(),
        "projection-report.json".to_string(),
    ]);
    for locale in LOCALES {
        files.insert(format!("locales/{locale}/veterinary_clinic_system.db"));
        files.insert(format!(
            "locales/{locale}/veterinary_clinic_system_media.db"
        ));
    }
    files
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
                "{}:{}: non-canonical path",
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

fn verify_file_checksum(path: &Path, expected: &str) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("cannot inspect artifact {}: {error}", path.display()))?;
    if !metadata.file_type().is_file() {
        return Err(format!(
            "artifact must be a regular file without symlinks: {}",
            path.display()
        ));
    }
    let bytes = fs::read(path)
        .map_err(|error| format!("cannot read artifact {}: {error}", path.display()))?;
    if sha256_hex(&bytes) != expected {
        return Err(format!("artifact checksum mismatch for {}", path.display()));
    }
    Ok(())
}

fn set_digest(values: &BTreeSet<String>) -> String {
    let bytes = values
        .iter()
        .flat_map(|value| [value.as_bytes(), b"\n"].concat())
        .collect::<Vec<_>>();
    sha256_hex(&bytes)
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
