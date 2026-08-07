//! CAS media ingestion for inbound `UserMedia` patches.
//!
//! SQLite patches carry media metadata; original file bytes travel as immutable
//! CAS attachments in the envelope and are written before the DB patch applies.

use crate::{
    replication::types::{PatchEnvelope, StorageDomain},
    storage::{
        bytes_to_hex, decode_hash_hex, sha256, StorageDomain as CasStorageDomain, StorageManager,
    },
};

pub(super) fn write_inbound_media_files(
    storage: &StorageManager,
    envelope: &PatchEnvelope,
) -> Result<(), String> {
    if envelope.domain != StorageDomain::UserMedia {
        return Ok(());
    }
    for media in &envelope.media_files {
        let hash = decode_hash_hex(&media.hash_hex)?;
        let calculated_hash = sha256(&media.bytes);
        if bytes_to_hex(&calculated_hash) != media.hash_hex {
            return Err("replication_inbound_media_hash_mismatch".to_string());
        }
        storage.write_cas_file(CasStorageDomain::User, &hash, &media.bytes)?;
    }
    Ok(())
}
