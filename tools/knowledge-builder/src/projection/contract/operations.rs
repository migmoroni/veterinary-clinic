//! Derives stable operation identities from typed projection operations.

use super::*;

impl CompilationOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::Compilation(self.identity.clone())
    }
}

impl MetadataOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::Metadata {
            database: self.database,
            release: self.row.is_release(),
        }
    }
}

impl MetadataRow {
    pub(super) fn is_release(&self) -> bool {
        match self {
            Self::Build {
                build_version,
                builder_version,
                build_result_schema_version,
                source_digest,
                locale,
            } => {
                let _ = (
                    build_version,
                    builder_version,
                    build_result_schema_version,
                    source_digest,
                    locale,
                );
                false
            }
            Self::Release {
                release_id,
                generation,
                revision,
                locale,
            } => {
                let _ = (release_id, generation, revision, locale);
                true
            }
        }
    }
}

impl SystemProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::SystemRow {
            table: self.row.table(),
            row: self.row.logical_row_id(),
        }
    }
}

impl SystemMediaProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::SystemMediaAsset {
            media_key: self.row.media_key.clone(),
        }
    }
}

impl CasProjectionOperation {
    pub(crate) fn id(&self) -> ProjectionOperationId {
        ProjectionOperationId::CasObject {
            content_hash: self.content_hash.clone(),
        }
    }
}
