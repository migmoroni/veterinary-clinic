//! Defines the public, responsibility-scoped error families of the build pipeline.

use crate::{contracts::locale::KnowledgeLocale, validation::ValidationError};
use std::{io, path::PathBuf};
use thiserror::Error;

/// Failure returned by the complete knowledge build pipeline.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum KnowledgeBuilderError {
    #[error(transparent)]
    Validation(#[from] ValidationError),
    #[error(transparent)]
    Context(#[from] BuildContextError),
    #[error(transparent)]
    Contract(#[from] ContractError),
    #[error(transparent)]
    Database(#[from] DatabaseError),
    #[error(transparent)]
    Media(#[from] MediaError),
    #[error(transparent)]
    Cas(#[from] CasError),
    #[error(transparent)]
    Verification(#[from] VerificationError),
    #[error(transparent)]
    Publication(#[from] PublicationError),
}

/// Failure while loading or validating the external build context.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum BuildContextError {
    #[error("cannot read build context {}", path.display())]
    Read {
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("invalid build context {}", path.display())]
    Decode {
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
    #[error("invalid build context {}: {detail}", path.display())]
    Invalid { path: PathBuf, detail: String },
}

impl BuildContextError {
    pub fn path(&self) -> &std::path::Path {
        match self {
            Self::Read { path, .. } | Self::Decode { path, .. } | Self::Invalid { path, .. } => {
                path
            }
        }
    }
}

/// Failure while constructing or validating a projection contract.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum ContractError {
    #[error("contract operation {operation} failed: {detail}")]
    Invariant {
        operation: &'static str,
        detail: String,
    },
    #[error("contract operation {operation} could not serialize JSON")]
    Json {
        operation: &'static str,
        #[source]
        source: serde_json::Error,
    },
}

impl ContractError {
    pub fn operation(&self) -> &'static str {
        match self {
            Self::Invariant { operation, .. } | Self::Json { operation, .. } => operation,
        }
    }

    pub(crate) fn invariant(operation: &'static str, detail: impl Into<String>) -> Self {
        Self::Invariant {
            operation,
            detail: detail.into(),
        }
    }
}

impl From<String> for ContractError {
    fn from(detail: String) -> Self {
        Self::invariant("projection contract", detail)
    }
}

/// Failure while creating, querying, or finalizing SQLite databases.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum DatabaseError {
    #[error("database operation {operation} failed for {}", path.display())]
    Io {
        path: PathBuf,
        operation: &'static str,
        #[source]
        source: io::Error,
    },
    #[error("SQLite operation {operation} failed for {}", database.display())]
    Sqlite {
        database: PathBuf,
        operation: &'static str,
        #[source]
        source: Box<rusqlite::Error>,
    },
    #[error("SQLite operation {operation} failed for table {table} in {}", database.display())]
    Table {
        database: PathBuf,
        table: String,
        operation: &'static str,
        #[source]
        source: Box<rusqlite::Error>,
    },
    #[error("database operation {operation} failed for {} while confirming its contract", database.display())]
    Contract {
        database: PathBuf,
        operation: &'static str,
        #[source]
        source: Box<ContractError>,
    },
    #[error("database operation {operation} failed for {}: {detail}", database.display())]
    Invariant {
        database: PathBuf,
        operation: &'static str,
        detail: String,
    },
}

impl DatabaseError {
    pub fn database(&self) -> &std::path::Path {
        match self {
            Self::Io { path, .. } => path,
            Self::Sqlite { database, .. }
            | Self::Table { database, .. }
            | Self::Contract { database, .. }
            | Self::Invariant { database, .. } => database,
        }
    }

    pub fn table(&self) -> Option<&str> {
        match self {
            Self::Table { table, .. } => Some(table),
            _ => None,
        }
    }

    pub fn operation(&self) -> &'static str {
        match self {
            Self::Io { operation, .. }
            | Self::Sqlite { operation, .. }
            | Self::Table { operation, .. }
            | Self::Contract { operation, .. }
            | Self::Invariant { operation, .. } => operation,
        }
    }

    pub(crate) fn invariant(
        database: impl Into<PathBuf>,
        operation: &'static str,
        detail: impl Into<String>,
    ) -> Self {
        Self::Invariant {
            database: database.into(),
            operation,
            detail: detail.into(),
        }
    }
}

impl From<String> for DatabaseError {
    fn from(detail: String) -> Self {
        Self::invariant("<database>", "database invariant", detail)
    }
}

/// Failure while decoding, profiling, or deriving media.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum MediaError {
    #[error("media operation {operation} failed for {}", path.display())]
    Io {
        path: PathBuf,
        operation: &'static str,
        #[source]
        source: io::Error,
    },
    #[error("media operation {operation} failed for {}", path.display())]
    Image {
        path: PathBuf,
        operation: &'static str,
        #[source]
        source: image::ImageError,
    },
    #[error("media operation {operation} failed for {}: {detail}", path.display())]
    Invalid {
        path: PathBuf,
        operation: &'static str,
        detail: String,
    },
}

impl MediaError {
    pub fn path(&self) -> &std::path::Path {
        match self {
            Self::Io { path, .. } | Self::Image { path, .. } | Self::Invalid { path, .. } => path,
        }
    }

    pub fn operation(&self) -> &'static str {
        match self {
            Self::Io { operation, .. }
            | Self::Image { operation, .. }
            | Self::Invalid { operation, .. } => operation,
        }
    }
}

/// Failure while staging, hashing, or materializing CAS objects.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum CasError {
    #[error("CAS operation {operation} failed for {}", artifact.display())]
    Io {
        artifact: PathBuf,
        operation: &'static str,
        #[source]
        source: io::Error,
    },
    #[error("CAS operation {operation} failed for {} while confirming its contract", artifact.display())]
    Contract {
        artifact: PathBuf,
        operation: &'static str,
        #[source]
        source: Box<ContractError>,
    },
    #[error("CAS operation {operation} failed for {}: {detail}", artifact.display())]
    Invalid {
        artifact: PathBuf,
        operation: &'static str,
        detail: String,
    },
}

impl CasError {
    pub fn artifact(&self) -> &std::path::Path {
        match self {
            Self::Io { artifact, .. }
            | Self::Contract { artifact, .. }
            | Self::Invalid { artifact, .. } => artifact,
        }
    }

    pub fn operation(&self) -> &'static str {
        match self {
            Self::Io { operation, .. }
            | Self::Contract { operation, .. }
            | Self::Invalid { operation, .. } => operation,
        }
    }

    pub(crate) fn invalid(
        artifact: impl Into<PathBuf>,
        operation: &'static str,
        detail: impl Into<String>,
    ) -> Self {
        Self::Invalid {
            artifact: artifact.into(),
            operation,
            detail: detail.into(),
        }
    }
}

/// Failure while independently proving a staged or reusable artifact.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum VerificationError {
    #[error("verification of {artifact} failed")]
    Io {
        artifact: String,
        path: PathBuf,
        #[source]
        source: io::Error,
    },
    #[error("verification stage {stage} failed for {artifact} in locale {locale}: {source}")]
    Database {
        artifact: String,
        locale: KnowledgeLocale,
        stage: &'static str,
        #[source]
        source: Box<DatabaseError>,
    },
    #[error("verification of {artifact} failed while evaluating its contract")]
    Contract {
        artifact: String,
        #[source]
        source: Box<ContractError>,
    },
    #[error("verification of {artifact} failed while decoding JSON")]
    Json {
        artifact: String,
        path: PathBuf,
        #[source]
        source: serde_json::Error,
    },
    #[error("verification of {artifact} failed while decoding image {}", path.display())]
    Image {
        artifact: String,
        path: PathBuf,
        #[source]
        source: image::ImageError,
    },
    #[error("verification of {artifact} failed for locale {locale}: {detail}")]
    Locale {
        artifact: String,
        locale: KnowledgeLocale,
        detail: String,
    },
    #[error("verification of table {table} in {} failed: {detail}", database.display())]
    DatabaseTable {
        database: PathBuf,
        table: String,
        detail: String,
    },
    #[error("verification of {artifact} failed: {detail}")]
    Invalid { artifact: String, detail: String },
}

impl VerificationError {
    pub fn artifact(&self) -> &str {
        match self {
            Self::Io { artifact, .. }
            | Self::Database { artifact, .. }
            | Self::Contract { artifact, .. }
            | Self::Json { artifact, .. }
            | Self::Image { artifact, .. }
            | Self::Locale { artifact, .. }
            | Self::Invalid { artifact, .. } => artifact,
            Self::DatabaseTable { table, .. } => table,
        }
    }

    pub fn locale(&self) -> Option<KnowledgeLocale> {
        match self {
            Self::Locale { locale, .. } | Self::Database { locale, .. } => Some(*locale),
            _ => None,
        }
    }

    pub fn database(&self) -> Option<&std::path::Path> {
        match self {
            Self::DatabaseTable { database, .. } => Some(database),
            Self::Database { source, .. } => Some(source.database()),
            _ => None,
        }
    }

    pub fn table(&self) -> Option<&str> {
        match self {
            Self::DatabaseTable { table, .. } => Some(table),
            _ => None,
        }
    }

    pub fn stage(&self) -> Option<&'static str> {
        match self {
            Self::Database { stage, .. } => Some(*stage),
            _ => None,
        }
    }

    pub(crate) fn invalid(artifact: impl Into<String>, detail: impl Into<String>) -> Self {
        Self::Invalid {
            artifact: artifact.into(),
            detail: detail.into(),
        }
    }
}

impl From<String> for VerificationError {
    fn from(detail: String) -> Self {
        Self::invalid("artifact", detail)
    }
}

impl From<ContractError> for VerificationError {
    fn from(source: ContractError) -> Self {
        Self::Contract {
            artifact: "artifact contract".to_string(),
            source: Box::new(source),
        }
    }
}

/// Failure while staging or atomically publishing completed artifacts.
#[derive(Debug, Error)]
#[non_exhaustive]
pub enum PublicationError {
    #[error("publication operation {operation} failed for {}", path.display())]
    Io {
        path: PathBuf,
        operation: &'static str,
        #[source]
        source: io::Error,
    },
    #[error("publication operation {operation} could not encode JSON for {}", path.display())]
    Json {
        path: PathBuf,
        operation: &'static str,
        #[source]
        source: serde_json::Error,
    },
    #[error("publication operation {operation} failed for {}: {detail}", path.display())]
    Invalid {
        path: PathBuf,
        operation: &'static str,
        detail: String,
    },
}

impl PublicationError {
    pub fn path(&self) -> &std::path::Path {
        match self {
            Self::Io { path, .. } | Self::Json { path, .. } | Self::Invalid { path, .. } => path,
        }
    }

    pub fn operation(&self) -> &'static str {
        match self {
            Self::Io { operation, .. }
            | Self::Json { operation, .. }
            | Self::Invalid { operation, .. } => operation,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Diagnostic, KnowledgeBuilderError, ValidationError};
    use std::error::Error;

    fn io_cause() -> io::Error {
        io::Error::new(io::ErrorKind::PermissionDenied, "denied")
    }

    #[test]
    fn validation_wrapping_preserves_ordered_diagnostics() {
        let validation = ValidationError {
            diagnostics: vec![
                Diagnostic {
                    path: "a.json".to_string(),
                    entity: None,
                    field: None,
                    locale: None,
                    section: None,
                    message: "first".to_string(),
                },
                Diagnostic {
                    path: "b.json".to_string(),
                    entity: None,
                    field: None,
                    locale: None,
                    section: None,
                    message: "second".to_string(),
                },
            ],
        };
        let error = KnowledgeBuilderError::from(validation);
        let KnowledgeBuilderError::Validation(validation) = error else {
            panic!("validation must retain its root variant");
        };
        assert_eq!(validation.diagnostics.len(), 2);
        assert_eq!(validation.diagnostics[0].message, "first");
        assert_eq!(validation.diagnostics[1].message, "second");
    }

    #[test]
    fn typed_context_and_concrete_causes_are_preserved() {
        let context = BuildContextError::Read {
            path: PathBuf::from("context.json"),
            source: io_cause(),
        };
        assert!(context.source().is_some());

        let database = DatabaseError::Table {
            database: PathBuf::from("system.sqlite3"),
            table: "products".to_string(),
            operation: "insert",
            source: Box::new(rusqlite::Error::InvalidQuery),
        };
        let DatabaseError::Table {
            database: path,
            table,
            operation,
            ..
        } = &database
        else {
            unreachable!();
        };
        assert_eq!(path, &PathBuf::from("system.sqlite3"));
        assert_eq!(table, "products");
        assert_eq!(*operation, "insert");
        assert!(database.source().is_some());

        let media_source = image::load_from_memory(b"not an image").unwrap_err();
        let media = MediaError::Image {
            path: PathBuf::from("image.jpg"),
            operation: "decode",
            source: media_source,
        };
        assert!(media.source().is_some());

        let cas = CasError::Io {
            artifact: PathBuf::from("CAS/system/aa/hash.bin"),
            operation: "materialize",
            source: io_cause(),
        };
        assert!(cas.source().is_some());

        let verification = VerificationError::Locale {
            artifact: "system.sqlite3".to_string(),
            locale: KnowledgeLocale::PtBr,
            detail: "row mismatch".to_string(),
        };
        assert!(verification.to_string().contains("pt-BR"));

        let publication = PublicationError::Io {
            path: PathBuf::from("versions/1"),
            operation: "rename",
            source: io_cause(),
        };
        assert!(publication.source().is_some());

        let contract = ContractError::invariant("ownership", "missing owner");
        assert!(contract.to_string().contains("ownership"));
    }

    #[test]
    fn public_boundaries_are_typed_and_production_imports_are_explicit() {
        let library = include_str!("lib.rs");
        assert!(library.contains("Result<BuildResult, KnowledgeBuilderError>"));
        assert!(!library.contains("Result<BuildResult, String>"));

        let cli = include_str!("cli.rs");
        assert!(cli.contains("Result<(), CliError>"));
        let verifier = include_str!("verification/artifact/mod.rs");
        assert!(verifier.contains("Result<(), VerificationError>"));

        fn inspect(directory: &std::path::Path) {
            for entry in std::fs::read_dir(directory).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    inspect(&path);
                } else if path.extension().is_some_and(|extension| extension == "rs")
                    && path.file_name().is_none_or(|name| name != "tests.rs")
                {
                    let source = std::fs::read_to_string(&path).unwrap();
                    let production = source.split("#[cfg(test)]").next().unwrap();
                    assert!(
                        !production.contains("use super::*"),
                        "production module {} uses a glob parent import",
                        path.display()
                    );
                }
            }
        }
        inspect(&std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src"));
    }
}
