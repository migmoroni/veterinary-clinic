use crate::{
    media::{percent_encode_media_key, resolve_markdown_image, MediaAsset},
    source::SectionDeclaration,
};
use serde::Serialize;
use std::{collections::BTreeMap, fs, path::Path};

const MAX_DOCUMENT_BYTES: usize = 1_000_000;
const MAX_NODES: usize = 50_000;
const MAX_LINE_BYTES: usize = 16_384;

#[derive(Clone, Debug, Serialize)]
pub struct CompiledSection {
    #[serde(rename = "sectionKey")]
    pub section_key: String,
    #[serde(rename = "compiledMarkdown")]
    pub compiled_markdown: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct CompiledDocument {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub sections: Vec<CompiledSection>,
}

#[derive(Clone, Debug)]
pub struct CompiledEditorial {
    pub document: CompiledDocument,
    pub media: Vec<MediaAsset>,
}

#[derive(Clone, Debug)]
enum Block {
    Blank,
    Heading { level: u8, text: String },
    Paragraph(String),
    UnorderedListItem(String),
    OrderedListItem { number: u32, text: String },
    Quote(String),
    Separator,
    Table(String),
    Code(String),
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
    let text = String::from_utf8(bytes)
        .map_err(|error| format!("{}: Markdown is not UTF-8: {error}", path.display()))?;
    let normalized = normalize_source(&text);
    if normalized.starts_with("---\n") || normalized == "---" {
        return Err(format!("{}: front matter is forbidden", path.display()));
    }
    let blocks = parse_blocks(path, &normalized)?;
    if blocks.len() > MAX_NODES {
        return Err(format!("{}: Markdown exceeds node limit", path.display()));
    }
    split_and_compile(
        path,
        entity_directory,
        entity_type,
        entity_id,
        declarations,
        blocks,
    )
}

fn parse_blocks(path: &Path, source: &str) -> Result<Vec<Block>, String> {
    let mut result = Vec::new();
    let mut fenced = false;
    for (line_index, source_line) in source.split('\n').enumerate() {
        if source_line.len() > MAX_LINE_BYTES {
            return Err(format!(
                "{}:{}: line exceeds byte limit",
                path.display(),
                line_index + 1
            ));
        }
        let line = source_line.trim_end();
        if line.starts_with("```") || line.starts_with("~~~") {
            fenced = !fenced;
            result.push(Block::Code(line.to_string()));
            continue;
        }
        if fenced {
            result.push(Block::Code(line.to_string()));
            continue;
        }
        if line.is_empty() {
            result.push(Block::Blank);
            continue;
        }
        if contains_raw_html(line) {
            return Err(format!(
                "{}:{}: raw HTML is forbidden",
                path.display(),
                line_index + 1
            ));
        }
        if let Some((level, text)) = parse_heading(line) {
            result.push(Block::Heading {
                level,
                text: text.to_string(),
            });
        } else if is_separator(line) {
            result.push(Block::Separator);
        } else if let Some(text) = line.strip_prefix("> ") {
            result.push(Block::Quote(text.trim().to_string()));
        } else if let Some(text) = unordered_item(line) {
            result.push(Block::UnorderedListItem(text.trim().to_string()));
        } else if let Some((number, text)) = ordered_item(line) {
            result.push(Block::OrderedListItem {
                number,
                text: text.trim().to_string(),
            });
        } else if line.starts_with('|') && line.ends_with('|') {
            result.push(Block::Table(normalize_table_line(line)));
        } else {
            result.push(Block::Paragraph(line.trim().to_string()));
        }
    }
    if fenced {
        return Err(format!("{}: unclosed fenced code block", path.display()));
    }
    Ok(result)
}

fn split_and_compile(
    path: &Path,
    entity_directory: &Path,
    entity_type: &str,
    entity_id: &str,
    declarations: &[SectionDeclaration],
    blocks: Vec<Block>,
) -> Result<CompiledEditorial, String> {
    let mut section_blocks: Vec<Vec<Block>> = Vec::new();
    let mut numbers = Vec::new();
    let mut current = None;
    for block in blocks {
        match block {
            Block::Heading { level: 1, text } => {
                let number = parse_delimiter_number(&text).ok_or_else(|| {
                    format!(
                        "{}: level-one heading must start with a positive section number",
                        path.display()
                    )
                })?;
                numbers.push(number);
                section_blocks.push(Vec::new());
                current = Some(section_blocks.len() - 1);
            }
            Block::Blank if current.is_none() => {}
            _block if current.is_none() => {
                return Err(format!("{}: content before first section", path.display()));
            }
            block => section_blocks[current.expect("section exists")].push(block),
        }
    }
    let expected = declarations
        .iter()
        .map(|section| section.section_number)
        .collect::<Vec<_>>();
    if numbers != expected {
        return Err(format!(
            "{}: section delimiters {:?} differ from manifest {:?}",
            path.display(),
            numbers,
            expected
        ));
    }

    let document_directory = path
        .parent()
        .ok_or_else(|| format!("{}: Markdown path has no parent", path.display()))?;
    let mut all_media = BTreeMap::new();
    let mut compiled_sections = Vec::with_capacity(declarations.len());
    for (declaration, blocks) in declarations.iter().zip(section_blocks) {
        let mut rendered = render_blocks(&blocks);
        let links = parse_inline_references(&rendered).map_err(|error| {
            format!(
                "{} section {}: {error}",
                path.display(),
                declaration.section_key
            )
        })?;
        for link in links.into_iter().rev() {
            match link.kind {
                InlineReferenceKind::Link => validate_external_link(&link.destination)?,
                InlineReferenceKind::Image => {
                    let asset = resolve_markdown_image(
                        entity_directory,
                        document_directory,
                        entity_type,
                        entity_id,
                        &link.destination,
                    )?;
                    let uri = format!(
                        "knowledge-media://asset/{}",
                        percent_encode_media_key(&asset.media_key)
                    );
                    rendered.replace_range(link.destination_range, &uri);
                    if let Some(previous) = all_media.insert(asset.media_key.clone(), asset.clone())
                    {
                        if previous.content_hash_sha256 != asset.content_hash_sha256 {
                            return Err(format!("media key collision: {}", asset.media_key));
                        }
                    }
                }
            }
        }
        compiled_sections.push(CompiledSection {
            section_key: declaration.section_key.clone(),
            compiled_markdown: rendered,
        });
    }
    Ok(CompiledEditorial {
        document: CompiledDocument {
            schema_version: 1,
            sections: compiled_sections,
        },
        media: all_media.into_values().collect(),
    })
}

fn render_blocks(blocks: &[Block]) -> String {
    let mut lines = Vec::with_capacity(blocks.len());
    let mut previous_blank = true;
    for block in blocks {
        let line = match block {
            Block::Blank => {
                if !previous_blank {
                    lines.push(String::new());
                }
                previous_blank = true;
                continue;
            }
            Block::Heading { level, text } => {
                format!("{} {}", "#".repeat(usize::from(*level)), text.trim())
            }
            Block::Paragraph(text) => text.trim().to_string(),
            Block::UnorderedListItem(text) => format!("- {}", text.trim()),
            Block::OrderedListItem { number, text } => format!("{number}. {}", text.trim()),
            Block::Quote(text) => format!("> {}", text.trim()),
            Block::Separator => "---".to_string(),
            Block::Table(text) | Block::Code(text) => text.trim_end().to_string(),
        };
        lines.push(line);
        previous_blank = false;
    }
    while lines.last().is_some_and(String::is_empty) {
        lines.pop();
    }
    nfc_latin(&lines.join("\n"))
}

fn parse_heading(line: &str) -> Option<(u8, &str)> {
    let level = line.bytes().take_while(|byte| *byte == b'#').count();
    if !(1..=6).contains(&level) || line.as_bytes().get(level) != Some(&b' ') {
        return None;
    }
    Some((u8::try_from(level).ok()?, line[level + 1..].trim()))
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

fn unordered_item(line: &str) -> Option<&str> {
    ["- ", "* ", "+ "]
        .iter()
        .find_map(|prefix| line.strip_prefix(prefix))
}

fn ordered_item(line: &str) -> Option<(u32, &str)> {
    let digit_count = line.bytes().take_while(u8::is_ascii_digit).count();
    if digit_count == 0 || line.as_bytes().get(digit_count..digit_count + 2) != Some(b". ") {
        return None;
    }
    Some((line[..digit_count].parse().ok()?, &line[digit_count + 2..]))
}

fn is_separator(line: &str) -> bool {
    let compact = line
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>();
    compact.len() >= 3
        && (compact.chars().all(|value| value == '-')
            || compact.chars().all(|value| value == '*')
            || compact.chars().all(|value| value == '_'))
}

fn normalize_table_line(line: &str) -> String {
    let cells = line
        .trim_matches('|')
        .split('|')
        .map(str::trim)
        .collect::<Vec<_>>();
    format!("| {} |", cells.join(" | "))
}

fn contains_raw_html(line: &str) -> bool {
    let mut code = false;
    let bytes = line.as_bytes();
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'`' {
            code = !code;
        } else if !code
            && bytes[index] == b'<'
            && bytes
                .get(index + 1)
                .is_some_and(|value| value.is_ascii_alphabetic() || matches!(*value, b'/' | b'!'))
        {
            return true;
        }
        index += 1;
    }
    false
}

#[derive(Clone, Copy, Debug)]
enum InlineReferenceKind {
    Link,
    Image,
}

#[derive(Clone, Debug)]
struct InlineReference {
    kind: InlineReferenceKind,
    destination: String,
    destination_range: std::ops::Range<usize>,
}

fn parse_inline_references(source: &str) -> Result<Vec<InlineReference>, String> {
    let bytes = source.as_bytes();
    let mut references = Vec::new();
    let mut index = 0;
    let mut code = false;
    while index < bytes.len() {
        if bytes[index] == b'`' {
            code = !code;
            index += 1;
            continue;
        }
        if code {
            index += 1;
            continue;
        }
        let (kind, label_start) = if bytes[index] == b'!' && bytes.get(index + 1) == Some(&b'[') {
            (InlineReferenceKind::Image, index + 1)
        } else if bytes[index] == b'[' {
            (InlineReferenceKind::Link, index)
        } else {
            index += 1;
            continue;
        };
        let Some(label_end_offset) = source[label_start + 1..].find(']') else {
            return Err("unclosed Markdown reference label".to_string());
        };
        let label_end = label_start + 1 + label_end_offset;
        if bytes.get(label_end + 1) != Some(&b'(') {
            index = label_end + 1;
            continue;
        }
        let destination_start = label_end + 2;
        let Some(close_offset) = source[destination_start..].find(')') else {
            return Err("unclosed Markdown reference destination".to_string());
        };
        let destination_end = destination_start + close_offset;
        let raw = source[destination_start..destination_end].trim();
        let destination = raw
            .split_ascii_whitespace()
            .next()
            .unwrap_or_default()
            .trim_matches('<')
            .trim_matches('>');
        if destination.is_empty() {
            return Err("empty Markdown reference destination".to_string());
        }
        let relative_start = source[destination_start..destination_end]
            .find(destination)
            .ok_or_else(|| "invalid Markdown reference destination".to_string())?;
        references.push(InlineReference {
            kind,
            destination: destination.to_string(),
            destination_range: destination_start + relative_start
                ..destination_start + relative_start + destination.len(),
        });
        index = destination_end + 1;
    }
    Ok(references)
}

fn validate_external_link(destination: &str) -> Result<(), String> {
    if destination.starts_with("https://") {
        return Ok(());
    }
    Err(format!(
        "only external https links are allowed: {destination}"
    ))
}

fn normalize_source(source: &str) -> String {
    let source = source.strip_prefix('\u{feff}').unwrap_or(source);
    nfc_latin(&source.replace("\r\n", "\n").replace('\r', "\n"))
}

// The canonical source languages use Latin diacritics. This small, dependency-
// free composer covers their decomposed forms and keeps the builder offline.
fn nfc_latin(source: &str) -> String {
    let mut result = String::with_capacity(source.len());
    let mut characters = source.chars().peekable();
    while let Some(base) = characters.next() {
        let Some(mark) = characters.peek().copied() else {
            result.push(base);
            continue;
        };
        if let Some(composed) = compose_latin(base, mark) {
            result.push(composed);
            characters.next();
        } else {
            result.push(base);
        }
    }
    result
}

fn compose_latin(base: char, mark: char) -> Option<char> {
    let value = match (base, mark) {
        ('A', '\u{301}') => 'Á',
        ('a', '\u{301}') => 'á',
        ('E', '\u{301}') => 'É',
        ('e', '\u{301}') => 'é',
        ('I', '\u{301}') => 'Í',
        ('i', '\u{301}') => 'í',
        ('O', '\u{301}') => 'Ó',
        ('o', '\u{301}') => 'ó',
        ('U', '\u{301}') => 'Ú',
        ('u', '\u{301}') => 'ú',
        ('Y', '\u{301}') => 'Ý',
        ('y', '\u{301}') => 'ý',
        ('A', '\u{300}') => 'À',
        ('a', '\u{300}') => 'à',
        ('E', '\u{300}') => 'È',
        ('e', '\u{300}') => 'è',
        ('I', '\u{300}') => 'Ì',
        ('i', '\u{300}') => 'ì',
        ('O', '\u{300}') => 'Ò',
        ('o', '\u{300}') => 'ò',
        ('U', '\u{300}') => 'Ù',
        ('u', '\u{300}') => 'ù',
        ('A', '\u{302}') => 'Â',
        ('a', '\u{302}') => 'â',
        ('E', '\u{302}') => 'Ê',
        ('e', '\u{302}') => 'ê',
        ('I', '\u{302}') => 'Î',
        ('i', '\u{302}') => 'î',
        ('O', '\u{302}') => 'Ô',
        ('o', '\u{302}') => 'ô',
        ('U', '\u{302}') => 'Û',
        ('u', '\u{302}') => 'û',
        ('A', '\u{303}') => 'Ã',
        ('a', '\u{303}') => 'ã',
        ('N', '\u{303}') => 'Ñ',
        ('n', '\u{303}') => 'ñ',
        ('O', '\u{303}') => 'Õ',
        ('o', '\u{303}') => 'õ',
        ('A', '\u{308}') => 'Ä',
        ('a', '\u{308}') => 'ä',
        ('E', '\u{308}') => 'Ë',
        ('e', '\u{308}') => 'ë',
        ('I', '\u{308}') => 'Ï',
        ('i', '\u{308}') => 'ï',
        ('O', '\u{308}') => 'Ö',
        ('o', '\u{308}') => 'ö',
        ('U', '\u{308}') => 'Ü',
        ('u', '\u{308}') => 'ü',
        ('Y', '\u{308}') => 'Ÿ',
        ('y', '\u{308}') => 'ÿ',
        ('C', '\u{327}') => 'Ç',
        ('c', '\u{327}') => 'ç',
        _ => return None,
    };
    Some(value)
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
    fn normalizes_common_decomposed_latin() {
        assert_eq!(nfc_latin("Cafe\u{301} ac\u{327}a\u{303}o"), "Café ação");
    }

    #[test]
    fn parses_links_structurally() {
        let references =
            parse_inline_references("[site](https://example.test) ![x](../media/a.png)").unwrap();
        assert_eq!(references.len(), 2);
        assert!(matches!(references[0].kind, InlineReferenceKind::Link));
        assert!(matches!(references[1].kind, InlineReferenceKind::Image));
    }
}
