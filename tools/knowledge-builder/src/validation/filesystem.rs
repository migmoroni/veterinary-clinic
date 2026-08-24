//! Discovers source files and enforces editorial paths and complete file coverage.

use super::*;

pub(super) fn discover_files(
    root: &Path,
    diagnostics: &mut Vec<Diagnostic>,
) -> Result<Vec<PathBuf>, String> {
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

pub(super) fn exact_content_files(
    directory: &Path,
) -> Result<Vec<(KnowledgeLocale, PathBuf)>, String> {
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

pub(super) fn resolve_content_directory(entry: &SourceEntry) -> Result<PathBuf, String> {
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
