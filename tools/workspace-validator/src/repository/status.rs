#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) struct StatusRecord {
    pub status: String,
    pub path: String,
    pub related_path: Option<String>,
}

impl StatusRecord {
    pub fn display(&self) -> String {
        match &self.related_path {
            Some(source) => format!("{} {source} -> {}", self.status, self.path),
            None => format!("{} {}", self.status, self.path),
        }
    }

    pub fn paths(&self) -> impl Iterator<Item = &str> {
        std::iter::once(self.path.as_str()).chain(self.related_path.as_deref())
    }

    pub fn is_untracked(&self) -> bool {
        self.status == "??"
    }
}

pub(super) fn parse(output: &str) -> Result<Vec<StatusRecord>, String> {
    let fields: Vec<_> = output
        .split('\0')
        .filter(|entry| !entry.is_empty())
        .collect();
    let mut records = Vec::new();
    let mut index = 0;
    while index < fields.len() {
        let entry = fields[index];
        let bytes = entry.as_bytes();
        if bytes.len() < 4 || bytes[2] != b' ' {
            return Err(format!("invalid porcelain status entry {entry:?}"));
        }
        let status = entry[..2].to_string();
        let path = entry[3..].to_string();
        if path.is_empty() {
            return Err("repository status contains an empty path".into());
        }
        let has_related_path = status.bytes().any(|code| matches!(code, b'R' | b'C'));
        let related_path = if has_related_path {
            index += 1;
            let related = fields
                .get(index)
                .ok_or_else(|| format!("status entry for {path:?} has no related path"))?;
            if related.is_empty() {
                return Err(format!(
                    "status entry for {path:?} has an empty related path"
                ));
            }
            Some((*related).to_string())
        } else {
            None
        };
        records.push(StatusRecord {
            status,
            path,
            related_path,
        });
        index += 1;
    }
    Ok(records)
}

#[cfg(test)]
mod tests {
    use super::parse;

    #[test]
    fn parses_rename_and_copy_pairs_from_porcelain_z() {
        let records =
            parse("R  renamed.txt\0original-name.txt\0 C copied.txt\0source.txt\0").unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0].display(), "R  original-name.txt -> renamed.txt");
        assert_eq!(records[1].display(), " C source.txt -> copied.txt");
    }
}
