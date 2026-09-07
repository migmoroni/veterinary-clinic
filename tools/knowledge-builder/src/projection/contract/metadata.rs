//! Constructs build and release metadata operations with directly declared ownership.

use super::{ownership::ObligationOwnership, MetadataOperation, MetadataRow};
use crate::{
    contracts::{locale::KnowledgeLocale, version::BUILD_RESULT_SCHEMA_VERSION},
    databases::DatabaseKind,
    projection::coverage::{ProjectionOperationId, RowEvent, RowIdentity, SystemTable},
    report::BuildContext,
};

pub(super) fn build_metadata_operations(
    source_digest: Vec<u8>,
    locale: KnowledgeLocale,
    context: &BuildContext,
    ownership: &mut ObligationOwnership,
) -> Result<Vec<MetadataOperation>, crate::ContractError> {
    let mut operations = Vec::new();
    for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
        let owner = ProjectionOperationId::Metadata {
            database,
            release: false,
        };
        operations.push(MetadataOperation {
            database,
            row: MetadataRow::Build {
                build_version: context.build_version,
                builder_version: env!("CARGO_PKG_VERSION").to_string(),
                build_result_schema_version: BUILD_RESULT_SCHEMA_VERSION,
                source_digest: source_digest.clone(),
                locale: locale.to_string(),
            },
            obligations: ownership.claim(&owner)?,
            event: RowEvent {
                database,
                table: SystemTable::KnowledgeBuildMetadata,
                row: RowIdentity::new("1"),
                entity: None,
            },
        });
        if let Some(release) = &context.release {
            let owner = ProjectionOperationId::Metadata {
                database,
                release: true,
            };
            operations.push(MetadataOperation {
                database,
                row: MetadataRow::Release {
                    release_id: release.release_id.clone(),
                    generation: release.generation,
                    revision: release.revision,
                    locale: locale.to_string(),
                },
                obligations: ownership.claim(&owner)?,
                event: RowEvent {
                    database,
                    table: SystemTable::KnowledgeReleaseMetadata,
                    row: RowIdentity::new("1"),
                    entity: None,
                },
            });
        }
    }
    Ok(operations)
}
