//! Assembles one locale projection contract from validated canonical knowledge.

use super::*;

impl ProjectionContract {
    pub(crate) fn build(
        source: &ValidatedSource,
        locale: KnowledgeLocale,
        context: &BuildContext,
    ) -> Result<Self, String> {
        let mut claims = owned_obligations(source, locale, context.release.is_some())?;
        let expected_obligations = claims.expected();
        let source_digest = decode_hex(&source.source_digest_sha256)?;
        let mut metadata = Vec::new();
        for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
            let owner = ProjectionOperationId::Metadata {
                database,
                release: false,
            };
            metadata.push(MetadataOperation {
                database,
                row: MetadataRow::Build {
                    build_version: context.build_version,
                    builder_version: env!("CARGO_PKG_VERSION").to_string(),
                    build_result_schema_version: 1,
                    source_digest: source_digest.clone(),
                    locale: locale.to_string(),
                },
                obligations: claims.claim(&owner)?,
                event: RowEvent {
                    database,
                    table: SystemTable::KnowledgeBuildMetadata,
                    row: "1".to_string(),
                    entity: None,
                },
            });
            if let Some(release) = &context.release {
                let owner = ProjectionOperationId::Metadata {
                    database,
                    release: true,
                };
                metadata.push(MetadataOperation {
                    database,
                    row: MetadataRow::Release {
                        release_id: release.release_id.clone(),
                        generation: release.generation,
                        revision: release.revision,
                        locale: locale.to_string(),
                    },
                    obligations: claims.claim(&owner)?,
                    event: RowEvent {
                        database,
                        table: SystemTable::KnowledgeReleaseMetadata,
                        row: "1".to_string(),
                        entity: None,
                    },
                });
            }
        }

        let mut compilation = Vec::new();
        for entry in &source.entities {
            let entity = identity(&entry.source.entity);
            for validation in ["entity_type", "schema_version"] {
                let identity = CompilationOperationId::CanonicalValidation {
                    entity: entity.clone(),
                    validation,
                };
                compilation.push(CompilationOperation {
                    obligations: claims
                        .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                    identity,
                });
            }
            if let Some(document) = entry.editorial.get(&locale) {
                let identity = CompilationOperationId::Document {
                    entity: entity.clone(),
                };
                compilation.push(CompilationOperation {
                    obligations: claims
                        .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                    identity,
                });
                for section in &document.sections {
                    let identity = CompilationOperationId::Section {
                        entity: entity.clone(),
                        section_key: section.section_key.clone(),
                    };
                    compilation.push(CompilationOperation {
                        obligations: claims
                            .claim(&ProjectionOperationId::Compilation(identity.clone()))?,
                        identity,
                    });
                }
            }
        }

        let mut system = Vec::new();
        project_taxonomies(source, locale, &mut claims, &mut system)?;
        project_geo_places(source, locale, &mut claims, &mut system)?;
        project_catalog(source, locale, &mut claims, &mut system)?;
        project_media_references(source, locale, &mut claims, &mut system)?;
        project_search(source, locale, &mut claims, &mut system)?;

        let mut system_media = Vec::new();
        let mut cas_hashes = BTreeSet::new();
        for media_key in source
            .media_keys_by_locale
            .get(&locale)
            .into_iter()
            .flatten()
        {
            let asset = source
                .media
                .get(media_key)
                .ok_or_else(|| format!("media key has no source asset: {media_key}"))?;
            let owner = ProjectionOperationId::SystemMediaAsset {
                media_key: media_key.clone(),
            };
            system_media.push(SystemMediaProjectionOperation {
                row: SystemMediaRow {
                    media_key: asset.media_key.clone(),
                    content_hash: decode_hex(&asset.content_hash_sha256)?,
                    thumbnail: asset.thumbnail.clone(),
                    thumbnail_mime_type: asset.thumbnail_mime_type.clone(),
                    thumbnail_width: asset.thumbnail_width,
                    thumbnail_height: asset.thumbnail_height,
                    mime_type: asset.mime_type.clone(),
                    size_bytes: asset.size_bytes,
                    width: asset.width,
                    height: asset.height,
                },
                obligations: claims.claim(&owner)?,
                event: RowEvent {
                    database: DatabaseKind::SystemMedia,
                    table: SystemTable::MediaAssets,
                    row: media_key.clone(),
                    entity: None,
                },
            });
            cas_hashes.insert(asset.content_hash_sha256.clone());
        }
        let mut cas = Vec::new();
        for content_hash in cas_hashes {
            let asset = source
                .media
                .values()
                .find(|asset| asset.content_hash_sha256 == content_hash)
                .ok_or_else(|| format!("CAS hash has no source asset: {content_hash}"))?;
            let owner = ProjectionOperationId::CasObject {
                content_hash: content_hash.clone(),
            };
            cas.push(CasProjectionOperation {
                content_hash,
                bytes: asset.bytes.clone(),
                obligations: claims.claim(&owner)?,
            });
        }
        claims.finish()?;

        let entities_by_type =
            source
                .entities
                .iter()
                .fold(BTreeMap::<String, usize>::new(), |mut result, entry| {
                    *result
                        .entry(entry.source.entity.entity_type().to_string())
                        .or_default() += 1;
                    result
                });
        let localized_fragments = source
            .localized_fragments_by_locale
            .get(&locale)
            .copied()
            .unwrap_or_default();
        let contract = Self {
            locale,
            compilation,
            metadata,
            system,
            system_media,
            cas,
            expected_obligations,
            source_facts: ProjectionSourceFacts {
                entities_by_type,
                relation_count: source.relation_count,
                localized_fragments,
                source_files: source.source_files,
            },
        };
        contract.validate()?;
        Ok(contract)
    }
}
