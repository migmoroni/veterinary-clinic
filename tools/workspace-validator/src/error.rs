use std::path::PathBuf;

#[derive(Debug, thiserror::Error)]
pub enum ValidatorError {
    #[error("configuration was not found from {0}")]
    ConfigNotFound(PathBuf),
    #[error("cannot read configuration {path}: {source}")]
    ConfigRead {
        path: PathBuf,
        source: std::io::Error,
    },
    #[error("invalid configuration {path}: {detail}")]
    InvalidConfig { path: PathBuf, detail: String },
    #[error("internal executor failure: {0}")]
    Internal(String),
}

impl ValidatorError {
    pub fn invalid(path: impl Into<PathBuf>, detail: impl Into<String>) -> Self {
        Self::InvalidConfig {
            path: path.into(),
            detail: detail.into(),
        }
    }
}
