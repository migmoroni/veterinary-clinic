//! Discovers source files and enforces the closed reserved authoring namespace.

use super::*;
use crate::contracts::source_layout::{
    CONTENT_DIRECTORY_NAME, CONTENT_PATH, MEDIA_DIRECTORY_NAME, ROOT_TECHNICAL_FILES,
};

#[derive(Clone, Copy)]
enum ReservedArea {
    Content,
    Media,
    Invalid,
}

pub(super) fn discover_files(
    root: &Path,
    diagnostics: &mut Vec<Diagnostic>,
) -> Result<Vec<PathBuf>, String> {
    fn visit(
        root: &Path,
        directory: &Path,
        area: Option<ReservedArea>,
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
            let name = entry.file_name().to_string_lossy().into_owned();
            let file_type = entry
                .file_type()
                .map_err(|error| format!("cannot inspect {}: {error}", path.display()))?;

            if file_type.is_symlink() {
                diagnostics.push(Diagnostic::source(&path, "symlinks are forbidden"));
                continue;
            }
            if file_type.is_dir() {
                let next_area = match name.as_str() {
                    CONTENT_DIRECTORY_NAME => {
                        validate_reserved_directory(
                            directory,
                            &path,
                            area,
                            CONTENT_DIRECTORY_NAME,
                            diagnostics,
                        );
                        Some(ReservedArea::Content)
                    }
                    MEDIA_DIRECTORY_NAME => {
                        validate_reserved_directory(
                            directory,
                            &path,
                            area,
                            MEDIA_DIRECTORY_NAME,
                            diagnostics,
                        );
                        Some(ReservedArea::Media)
                    }
                    _ if name.starts_with('_') => {
                        diagnostics.push(Diagnostic::source(
                            &path,
                            format!("unknown reserved directory {name}"),
                        ));
                        Some(ReservedArea::Invalid)
                    }
                    _ => {
                        if matches!(area, Some(ReservedArea::Content)) {
                            diagnostics.push(Diagnostic::source(
                                &path,
                                format!(
                                    "subdirectories are forbidden inside {CONTENT_DIRECTORY_NAME}"
                                ),
                            ));
                        }
                        area
                    }
                };
                visit(root, &path, next_area, files, diagnostics)?;
                continue;
            }
            if !file_type.is_file() {
                diagnostics.push(Diagnostic::source(&path, "special files are forbidden"));
                continue;
            }

            if name == ENTITY_MANIFEST_FILENAME {
                if area.is_some() {
                    diagnostics.push(Diagnostic::source(
                        &path,
                        format!(
                            "{ENTITY_MANIFEST_FILENAME} is forbidden inside a reserved directory"
                        ),
                    ));
                } else {
                    files.push(path);
                }
            } else if name.starts_with('_') {
                diagnostics.push(Diagnostic::source(
                    &path,
                    format!("unknown reserved file {name}"),
                ));
            } else {
                match area {
                    Some(ReservedArea::Content) => {
                        let expected = LOCALES
                            .into_iter()
                            .map(|locale| format!("{locale}.md"))
                            .collect::<BTreeSet<_>>();
                        if !expected.contains(&name) {
                            diagnostics.push(Diagnostic::source(
                                &path,
                                format!("unsupported file inside {CONTENT_DIRECTORY_NAME}: {name}"),
                            ));
                        }
                        files.push(path);
                    }
                    Some(ReservedArea::Media) => files.push(path),
                    Some(ReservedArea::Invalid) => diagnostics.push(Diagnostic::source(
                        &path,
                        "files are forbidden inside an unknown reserved directory",
                    )),
                    None if directory == root && ROOT_TECHNICAL_FILES.contains(&name.as_str()) => {
                        files.push(path);
                    }
                    None => diagnostics.push(Diagnostic::source(
                        &path,
                        format!("unrecognized source file {name}"),
                    )),
                }
            }
        }
        Ok(())
    }

    let mut files = Vec::new();
    visit(root, root, None, &mut files, diagnostics)?;
    files.sort();
    Ok(files)
}

fn validate_reserved_directory(
    owner: &Path,
    directory: &Path,
    area: Option<ReservedArea>,
    name: &str,
    diagnostics: &mut Vec<Diagnostic>,
) {
    if area.is_some() {
        diagnostics.push(Diagnostic::source(
            directory,
            format!("{name} cannot be nested inside a reserved directory"),
        ));
    }
    let manifest = owner.join(ENTITY_MANIFEST_FILENAME);
    let owns_manifest = fs::symlink_metadata(&manifest)
        .is_ok_and(|metadata| metadata.is_file() && !metadata.file_type().is_symlink());
    if !owns_manifest {
        diagnostics.push(Diagnostic::source(
            directory,
            format!("{name} requires a sibling {ENTITY_MANIFEST_FILENAME} owner"),
        ));
    }
    if fs::read_dir(directory).is_ok_and(|mut entries| entries.next().is_none()) {
        diagnostics.push(Diagnostic::source(
            directory,
            format!("{name} must not be empty"),
        ));
    }
}

pub(super) fn exact_content_files(
    directory: &Path,
) -> Result<Vec<(KnowledgeLocale, PathBuf)>, String> {
    let mut actual = fs::read_dir(directory)
        .map_err(|error| format!("missing content directory {}: {error}", directory.display()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("cannot enumerate {}: {error}", directory.display()))?;
    actual.sort_by_key(|entry| entry.file_name());
    if actual.iter().any(|entry| {
        entry
            .file_type()
            .map_or(true, |kind| kind.is_symlink() || !kind.is_file())
    }) {
        return Err(format!(
            "{CONTENT_DIRECTORY_NAME} must contain only regular locale documents"
        ));
    }
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
        return Err(format!("{CONTENT_DIRECTORY_NAME} must contain exactly the six locale documents; found {actual_names:?}"));
    }
    Ok(LOCALES
        .into_iter()
        .map(|locale| (locale, directory.join(format!("{locale}.md"))))
        .collect())
}

pub(super) fn resolve_content_directory(entry: &SourceEntry) -> Result<PathBuf, String> {
    let content_path = entry
        .entity
        .content_path()
        .ok_or_else(|| "contentPath is required".to_string())?;
    if content_path != CONTENT_PATH {
        return Err(format!("contentPath must be exactly {CONTENT_PATH}"));
    }
    let candidate = entry.entity_directory.join(CONTENT_DIRECTORY_NAME);
    let entity_root = fs::canonicalize(&entry.entity_directory)
        .map_err(|error| format!("cannot resolve entity directory: {error}"))?;
    let resolved = fs::canonicalize(&candidate)
        .map_err(|error| format!("cannot resolve contentPath {content_path}: {error}"))?;
    let metadata = fs::symlink_metadata(&candidate)
        .map_err(|error| format!("cannot inspect contentPath {content_path}: {error}"))?;
    if metadata.file_type().is_symlink()
        || !metadata.is_dir()
        || resolved != entity_root.join(CONTENT_DIRECTORY_NAME)
    {
        return Err(format!(
            "contentPath must resolve to the direct, non-symlink {CONTENT_DIRECTORY_NAME} directory"
        ));
    }
    Ok(resolved)
}

pub(super) fn validate_file_coverage(
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
            .any(|component| component.as_os_str() == MEDIA_DIRECTORY_NAME)
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static COUNTER: AtomicU64 = AtomicU64::new(0);

    fn root(label: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "knowledge-builder-layout-{label}-{}-{}",
            std::process::id(),
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn discovers_only_the_reserved_manifest_at_arbitrary_depth() {
        let root = root("deep-manifest");
        let entity = root.join("catalog/arbitrary/editorial/depth");
        fs::create_dir_all(&entity).unwrap();
        fs::write(entity.join(ENTITY_MANIFEST_FILENAME), b"{}").unwrap();
        let mut diagnostics = Vec::new();
        let files = discover_files(&root, &mut diagnostics).unwrap();
        assert!(diagnostics.is_empty());
        assert_eq!(files, vec![entity.join(ENTITY_MANIFEST_FILENAME)]);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_unknown_or_orphaned_reserved_resources_and_old_manifest_names() {
        let root = root("closed-namespace");
        fs::create_dir_all(root.join("organization/_content")).unwrap();
        fs::write(root.join("organization/_content/pt-BR.md"), b"content").unwrap();
        fs::create_dir_all(root.join("organization/_contents")).unwrap();
        fs::write(root.join("organization/entity.json"), b"{}").unwrap();
        let mut diagnostics = Vec::new();
        discover_files(&root, &mut diagnostics).unwrap();
        let messages = diagnostics
            .iter()
            .map(|diagnostic| diagnostic.message.as_str())
            .collect::<Vec<_>>();
        assert!(messages
            .iter()
            .any(|message| message.contains("requires a sibling _entity.json owner")));
        assert!(messages
            .iter()
            .any(|message| message.contains("unknown reserved directory _contents")));
        assert!(messages
            .iter()
            .any(|message| message.contains("unrecognized source file entity.json")));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn content_directory_accepts_exactly_the_six_regular_locale_files() {
        let root = root("content-coverage");
        for locale in LOCALES {
            fs::write(root.join(format!("{locale}.md")), b"content").unwrap();
        }
        assert!(exact_content_files(&root).is_ok());
        fs::write(root.join("notes.md"), b"extra").unwrap();
        assert!(exact_content_files(&root).is_err());
        fs::remove_file(root.join("notes.md")).unwrap();
        fs::create_dir(root.join("nested")).unwrap();
        assert!(exact_content_files(&root).is_err());
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn rejects_symlinks_inside_reserved_resources() {
        use std::os::unix::fs::symlink;

        let root = root("reserved-symlink");
        fs::write(root.join(ENTITY_MANIFEST_FILENAME), b"{}").unwrap();
        fs::create_dir(root.join(MEDIA_DIRECTORY_NAME)).unwrap();
        fs::write(root.join("outside.png"), b"bytes").unwrap();
        symlink(
            root.join("outside.png"),
            root.join(MEDIA_DIRECTORY_NAME).join("linked.png"),
        )
        .unwrap();
        let mut diagnostics = Vec::new();
        discover_files(&root, &mut diagnostics).unwrap();
        assert!(diagnostics
            .iter()
            .any(|diagnostic| diagnostic.message == "symlinks are forbidden"));
        fs::remove_dir_all(root).unwrap();
    }
}
