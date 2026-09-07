//! Declares the expected obligations for build and release metadata rows.

use super::{
    authoring::insert_obligation,
    model::{ExpectedInventory, OperationDisposition},
};
use crate::{
    contracts::locale::KnowledgeLocale,
    databases::DatabaseKind,
    projection::coverage::{ObligationClass, ProjectionTarget, SourceToken},
};

pub(super) fn add_metadata_obligations(
    expected: &mut ExpectedInventory,
    locale: KnowledgeLocale,
    release: bool,
) -> Result<(), crate::ContractError> {
    for database in [DatabaseKind::System, DatabaseKind::SystemMedia] {
        for is_release in [false, true].into_iter().filter(|value| !*value || release) {
            insert_obligation(
                expected,
                OperationDisposition {
                    target: ProjectionTarget::BuildMetadata {
                        database,
                        locale,
                        release: is_release,
                    },
                },
                SourceToken::BuildMetadata {
                    database,
                    locale,
                    release: is_release,
                },
                ObligationClass::Metadata,
            )?;
        }
    }
    Ok(())
}
