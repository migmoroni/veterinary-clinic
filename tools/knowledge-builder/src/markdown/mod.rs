//! Compiles the allowed CommonMark profile into deterministic localized
//! documents while resolving safe entity-owned media references.

use crate::{
    media::{percent_encode_media_key, resolve_markdown_image, MediaAsset},
    normalization::normalize_text,
    source::SectionDeclaration,
};
use comrak::{
    format_commonmark,
    nodes::{AstNode, NodeValue},
    parse_document, Arena, Options,
};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs, path::Path};

const MAX_DOCUMENT_BYTES: usize = 1_000_000;
const MAX_NODES: usize = 50_000;
const MAX_AST_DEPTH: usize = 64;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct CompiledSection {
    #[serde(rename = "sectionKey")]
    pub section_key: String,
    #[serde(rename = "compiledMarkdown")]
    pub compiled_markdown: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct CompiledDocument {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub sections: Vec<CompiledSection>,
}

#[derive(Clone, Debug)]
pub struct CompiledEditorial {
    pub document: CompiledDocument,
    pub media: Vec<MediaAsset>,
    pub media_references: Vec<CompiledMediaReference>,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct CompiledMediaReference {
    pub section_key: String,
    pub occurrence: usize,
    pub media_key: String,
}

pub fn compile_document(
    path: &Path,
    entity_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    declarations: &[SectionDeclaration],
) -> Result<CompiledEditorial, String> {
    let bytes = fs::read(path)
        .map_err(|error| format!("{}: cannot read Markdown: {error}", path.display()))?;
    if bytes.len() > MAX_DOCUMENT_BYTES {
        return Err(format!("{}: Markdown exceeds byte limit", path.display()));
    }
    let source = String::from_utf8(bytes)
        .map_err(|error| format!("{}: Markdown is not UTF-8: {error}", path.display()))?;
    let source = normalize_source(&source);
    compile_source(
        path,
        entity_directory,
        entity_type,
        entity_id,
        declarations,
        &source,
    )
}

pub(crate) fn collect_compiled_media_keys(markdown: &str) -> Result<Vec<String>, String> {
    let arena = Arena::new();
    let mut options = Options::default();
    options.extension.table = true;
    let root = parse_document(&arena, markdown, &options);
    let mut media_keys = Vec::new();
    for node in root.descendants() {
        let destination = {
            let data = node.data.borrow();
            match &data.value {
                NodeValue::Image(image) => Some(image.url.clone()),
                _ => None,
            }
        };
        let Some(destination) = destination else {
            continue;
        };
        let encoded = destination
            .strip_prefix("knowledge-media://asset/")
            .ok_or_else(|| format!("compiled image uses non-canonical URI: {destination}"))?;
        let media_key = percent_decode_media_key(encoded)?;
        if percent_encode_media_key(&media_key) != encoded {
            return Err(format!(
                "compiled image URI is not canonically encoded: {destination}"
            ));
        }
        media_keys.push(media_key);
    }
    Ok(media_keys)
}

fn percent_decode_media_key(value: &str) -> Result<String, String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return Err("truncated percent escape in compiled media URI".to_string());
            }
            let hex = std::str::from_utf8(&bytes[index + 1..index + 3])
                .map_err(|error| format!("invalid percent escape: {error}"))?;
            decoded.push(
                u8::from_str_radix(hex, 16)
                    .map_err(|_| format!("invalid percent escape %{hex}"))?,
            );
            index += 3;
        } else {
            decoded.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(decoded).map_err(|error| format!("media key is not UTF-8: {error}"))
}

fn compile_source(
    path: &Path,
    entity_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    declarations: &[SectionDeclaration],
    source: &str,
) -> Result<CompiledEditorial, String> {
    let arena = Arena::new();
    let mut options = Options::default();
    options.extension.table = true;
    options.extension.front_matter_delimiter = Some("---".to_string());
    let root = parse_document(&arena, source, &options);
    validate_and_normalize_ast(path, root)?;

    let top_level = root.children().collect::<Vec<_>>();
    let mut sections: Vec<(u32, &'_ AstNode<'_>)> = Vec::new();
    let mut current: Option<&AstNode<'_>> = None;
    for node in top_level {
        let h1_number = {
            let data = node.data.borrow();
            match data.value {
                NodeValue::Heading(heading) if heading.level == 1 => {
                    Some(parse_delimiter_number(&plain_text(node)).ok_or_else(|| {
                        format!(
                            "{}:{}: level-one heading must start with a positive section number",
                            path.display(),
                            data.sourcepos.start.line
                        )
                    })?)
                }
                _ => None,
            }
        };
        if let Some(number) = h1_number {
            node.detach();
            let section_root = arena.alloc(NodeValue::Document.into());
            sections.push((number, section_root));
            current = Some(section_root);
        } else if let Some(section_root) = current {
            node.detach();
            section_root.append(node);
        } else {
            return Err(format!("{}: content before first section", path.display()));
        }
    }

    let actual_numbers = sections
        .iter()
        .map(|(number, _)| *number)
        .collect::<Vec<_>>();
    let expected_numbers = declarations
        .iter()
        .map(|section| section.section_number)
        .collect::<Vec<_>>();
    if actual_numbers != expected_numbers {
        return Err(format!(
            "{}: section delimiters {:?} differ from manifest {:?}",
            path.display(),
            actual_numbers,
            expected_numbers
        ));
    }

    let document_directory = path
        .parent()
        .ok_or_else(|| format!("{}: Markdown path has no parent", path.display()))?;
    let mut all_media = BTreeMap::new();
    let mut media_references = Vec::new();
    let mut compiled_sections = Vec::with_capacity(declarations.len());
    for (declaration, (_, section_root)) in declarations.iter().zip(sections) {
        let references = resolve_references(
            section_root,
            entity_directory,
            document_directory,
            entity_type,
            entity_id,
            &mut all_media,
            &declaration.section_key,
        )
        .map_err(|error| {
            format!(
                "{} section {}: {error}",
                path.display(),
                declaration.section_key
            )
        })?;
        media_references.extend(references);
        let mut rendered = Vec::new();
        format_commonmark(section_root, &options, &mut rendered)
            .map_err(|error| format!("{}: cannot serialize CommonMark: {error}", path.display()))?;
        let rendered = String::from_utf8(rendered)
            .map_err(|error| format!("canonical CommonMark is not UTF-8: {error}"))?;
        compiled_sections.push(CompiledSection {
            section_key: declaration.section_key.clone(),
            compiled_markdown: normalize_rendered(&rendered),
        });
    }

    Ok(CompiledEditorial {
        document: CompiledDocument {
            schema_version: crate::contracts::version::CONTENT_DOCUMENT_SCHEMA_VERSION,
            sections: compiled_sections,
        },
        media: all_media.into_values().collect(),
        media_references,
    })
}

fn validate_and_normalize_ast<'a>(path: &Path, root: &'a AstNode<'a>) -> Result<(), String> {
    let mut node_count = 0usize;
    validate_node(path, root, 0, &mut node_count)?;
    if node_count > MAX_NODES {
        return Err(format!("{}: Markdown exceeds node limit", path.display()));
    }
    Ok(())
}

fn validate_node<'a>(
    path: &Path,
    node: &'a AstNode<'a>,
    depth: usize,
    count: &mut usize,
) -> Result<(), String> {
    *count += 1;
    if *count > MAX_NODES {
        return Err(format!("{}: Markdown exceeds node limit", path.display()));
    }
    if depth > MAX_AST_DEPTH {
        return Err(format!(
            "{}: Markdown exceeds AST depth limit",
            path.display()
        ));
    }
    {
        let mut data = node.data.borrow_mut();
        let position = data.sourcepos.start.line;
        match &mut data.value {
            NodeValue::Document
            | NodeValue::BlockQuote
            | NodeValue::List(_)
            | NodeValue::Item(_)
            | NodeValue::CodeBlock(_)
            | NodeValue::Paragraph
            | NodeValue::Heading(_)
            | NodeValue::ThematicBreak
            | NodeValue::Table(_)
            | NodeValue::TableRow(_)
            | NodeValue::TableCell
            | NodeValue::SoftBreak
            | NodeValue::LineBreak
            | NodeValue::Emph
            | NodeValue::Strong => {}
            NodeValue::Text(text) => *text = normalize_text(text),
            NodeValue::Code(code) => code.literal = normalize_text(&code.literal),
            NodeValue::Link(link) => {
                link.url = normalize_text(&link.url);
                link.title = normalize_text(&link.title);
                validate_external_link(&link.url)
                    .map_err(|error| format!("{}:{position}: {error}", path.display()))?;
            }
            NodeValue::Image(image) => {
                image.url = normalize_text(&image.url);
                image.title = normalize_text(&image.title);
                if image.url.trim() != image.url || image.url.is_empty() {
                    return Err(format!(
                        "{}:{position}: image destination must be non-empty and trimmed",
                        path.display()
                    ));
                }
            }
            forbidden => {
                return Err(format!(
                    "{}:{position}: forbidden Markdown AST node {:?}",
                    path.display(),
                    forbidden
                ));
            }
        }
    }
    for child in node.children() {
        validate_node(path, child, depth + 1, count)?;
    }
    Ok(())
}

fn resolve_references<'a>(
    root: &'a AstNode<'a>,
    entity_directory: &Path,
    document_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    media: &mut BTreeMap<String, MediaAsset>,
    section_key: &str,
) -> Result<Vec<CompiledMediaReference>, String> {
    let mut references = Vec::new();
    for node in root.descendants() {
        let destination = {
            let data = node.data.borrow();
            match &data.value {
                NodeValue::Image(image) => Some(image.url.clone()),
                _ => None,
            }
        };
        let Some(destination) = destination else {
            continue;
        };
        let asset = resolve_markdown_image(
            entity_directory,
            document_directory,
            entity_type,
            entity_id,
            &destination,
        )?;
        let uri = format!(
            "knowledge-media://asset/{}",
            percent_encode_media_key(&asset.media_key)
        );
        if let NodeValue::Image(image) = &mut node.data.borrow_mut().value {
            image.url = uri;
        }
        if let Some(previous) = media.insert(asset.media_key.clone(), asset.clone()) {
            if previous.content_hash_sha256 != asset.content_hash_sha256 {
                return Err(format!("media key collision: {}", asset.media_key));
            }
        }
        references.push(CompiledMediaReference {
            section_key: section_key.to_string(),
            occurrence: references.len(),
            media_key: asset.media_key,
        });
    }
    Ok(references)
}

fn plain_text<'a>(node: &'a AstNode<'a>) -> String {
    let mut result = String::new();
    for descendant in node.descendants().skip(1) {
        match &descendant.data.borrow().value {
            NodeValue::Text(text) => result.push_str(text),
            NodeValue::Code(code) => result.push_str(&code.literal),
            NodeValue::SoftBreak | NodeValue::LineBreak => result.push(' '),
            _ => {}
        }
    }
    result
}

fn parse_delimiter_number(text: &str) -> Option<u32> {
    let bytes = text.as_bytes();
    let length = bytes
        .iter()
        .take_while(|value| value.is_ascii_digit())
        .count();
    if length == 0 || bytes[0] == b'0' {
        return None;
    }
    if length < bytes.len() && !matches!(bytes[length], b'.' | b' ' | b'\t') {
        return None;
    }
    text[..length].parse().ok()
}

fn validate_external_link(destination: &str) -> Result<(), String> {
    if destination.starts_with("https://") && !destination.chars().any(char::is_whitespace) {
        Ok(())
    } else {
        Err(format!(
            "only external https links are allowed: {destination}"
        ))
    }
}

fn normalize_source(source: &str) -> String {
    let source = source.strip_prefix('\u{feff}').unwrap_or(source);
    normalize_text(&source.replace("\r\n", "\n").replace('\r', "\n"))
}

fn normalize_rendered(source: &str) -> String {
    normalize_text(source.trim_end()).to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delimiter_grammar_is_strict() {
        assert_eq!(parse_delimiter_number("1"), Some(1));
        assert_eq!(parse_delimiter_number("12. Title"), Some(12));
        assert_eq!(parse_delimiter_number("2 Title"), Some(2));
        assert_eq!(parse_delimiter_number("01"), None);
        assert_eq!(parse_delimiter_number("x"), None);
    }

    #[test]
    fn canonical_ast_makes_equivalent_markers_equal() {
        fn render(source: &str) -> String {
            let arena = Arena::new();
            let options = Options::default();
            let root = parse_document(&arena, source, &options);
            let mut bytes = Vec::new();
            format_commonmark(root, &options, &mut bytes).unwrap();
            normalize_rendered(std::str::from_utf8(&bytes).unwrap())
        }
        assert_eq!(render("*item*\n\n* one\n"), render("_item_\n\n- one\n"));
    }

    #[test]
    fn fenced_code_does_not_create_links_or_images() {
        let arena = Arena::new();
        let options = Options::default();
        let root = parse_document(
            &arena,
            "```md\n![x](https://unsafe.test/x.png)\n```",
            &options,
        );
        assert!(!root
            .descendants()
            .any(|node| matches!(node.data.borrow().value, NodeValue::Image(_))));
    }

    #[test]
    fn rejects_raw_html_by_ast_kind() {
        let arena = Arena::new();
        let options = Options::default();
        let root = parse_document(&arena, "<script>alert(1)</script>", &options);
        assert!(validate_and_normalize_ast(Path::new("test.md"), root).is_err());
    }
}
