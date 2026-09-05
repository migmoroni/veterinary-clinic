//! Derives stable operation identities from typed projection operations.

use super::{
    CasProjectionOperation, CompilationOperation, MetadataOperation, MetadataRow,
    ProjectionContract, SystemMediaProjectionOperation, SystemProjectionOperation,
};
use crate::projection::coverage::{ProjectionObligation, ProjectionOperationId};
use std::collections::{BTreeMap, BTreeSet};

impl ProjectionContract {
    pub(crate) fn ownership(
        &self,
    ) -> Result<BTreeMap<ProjectionOperationId, BTreeSet<ProjectionObligation>>, String> {
        let mut ownership = BTreeMap::new();
        for (id, obligations) in self
            .compilation
            .iter()
            .map(|operation| (operation.id(), &operation.obligations))
            .chain(
                self.metadata
                    .iter()
                    .map(|operation| (operation.id(), &operation.obligations)),
            )
            .chain(
                self.system
                    .iter()
                    .map(|operation| (operation.id(), &operation.obligations)),
            )
            .chain(
                self.system_media
                    .iter()
                    .map(|operation| (operation.id(), &operation.obligations)),
            )
            .chain(
                self.cas
                    .iter()
                    .map(|operation| (operation.id(), &operation.obligations)),
            )
        {
            if ownership.insert(id.clone(), obligations.clone()).is_some() {
                return Err(format!("duplicate projection operation identity: {id:?}"));
            }
        }
        Ok(ownership)
    }
}

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
            row: self.row.descriptor().identity,
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
