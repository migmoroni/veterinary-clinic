//! Coordinates canonical source discovery, validation, compilation, media resolution, and digesting.

use super::*;

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
