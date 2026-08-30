//! Defines the closed technical namespace of the authored knowledge source.

pub(crate) const ENTITY_MANIFEST_FILENAME: &str = "_entity.json";
pub(crate) const CONTENT_DIRECTORY_NAME: &str = "_content";
pub(crate) const MEDIA_DIRECTORY_NAME: &str = "_media";
pub(crate) const CONTENT_PATH: &str = "./_content";
pub(crate) const STRUCTURAL_MEDIA_PREFIX: &str = "./_media/";
pub(crate) const MARKDOWN_MEDIA_PREFIX: &str = "../_media/";
pub(crate) const COMPILED_MEDIA_NAMESPACE: &str = "media";

pub(crate) const ROOT_TECHNICAL_FILES: [&str; 3] =
    ["README.md", "inventory.json", "audit-report.json"];
