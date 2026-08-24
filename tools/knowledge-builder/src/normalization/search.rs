use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};

pub(crate) fn normalize_identity_key(value: &str) -> String {
    value
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .flat_map(char::to_lowercase)
        .filter(char::is_ascii_alphanumeric)
        .collect()
}

pub(crate) fn normalize_search_text(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());
    let mut pending_space = false;
    for character in value
        .nfd()
        .filter(|character| !is_combining_mark(*character))
        .flat_map(char::to_lowercase)
    {
        if character.is_ascii_alphanumeric() {
            if pending_space && !normalized.is_empty() {
                normalized.push(' ');
            }
            normalized.push(character);
            pending_space = false;
        } else {
            pending_space = true;
        }
    }
    normalized
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identity_contract_vectors() {
        for (source, expected) in [
            ("Narú", "naru"),
            ("São João, Cão e Gato", "saojoaocaoegato"),
            ("  Méloxicam   2 mg ", "meloxicam2mg"),
            ("Cafe\u{301}", "cafe"),
            ("Ñandejára", "nandejara"),
            ("MÉDICAMENT", "medicament"),
        ] {
            assert_eq!(normalize_identity_key(source), expected, "{source}");
        }
    }

    #[test]
    fn search_contract_vectors() {
        for (source, expected) in [
            ("Narú", "naru"),
            ("São João, Cão e Gato", "sao joao cao e gato"),
            ("  Méloxicam   2 mg ", "meloxicam 2 mg"),
            ("Cafe\u{301}", "cafe"),
            ("Ñandejára hag̃ua", "nandejara hagua"),
            ("MÉDICAMENT—VÉTÉRINAIRE", "medicament veterinaire"),
        ] {
            assert_eq!(normalize_search_text(source), expected, "{source}");
        }
    }
}
