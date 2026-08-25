//! Defines the technical identities and public filenames of generated databases.

use super::version::{SYSTEM_MEDIA_SCHEMA_VERSION, SYSTEM_SCHEMA_VERSION};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct DatabaseIdentity {
    pub schema_version: u32,
    pub application_id: u32,
    pub artifact_filename: &'static str,
}

pub(crate) const SYSTEM_DATABASE: DatabaseIdentity = DatabaseIdentity {
    schema_version: SYSTEM_SCHEMA_VERSION,
    application_id: 0x564b5359,
    artifact_filename: "veterinary_clinic_system.db",
};

pub(crate) const SYSTEM_MEDIA_DATABASE: DatabaseIdentity = DatabaseIdentity {
    schema_version: SYSTEM_MEDIA_SCHEMA_VERSION,
    application_id: 0x564b534d,
    artifact_filename: "veterinary_clinic_system_media.db",
};
