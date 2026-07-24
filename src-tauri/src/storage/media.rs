use super::{
    bytes_to_hex, data::StorageManager, decode_hash_hex, detect_mime_type, path_to_string, sha256,
    GalleryItem, GalleryRequest, MediaHashRequest, SaveMediaRequest, SaveMediaResponse,
    SyncStatusRequest,
};
use rusqlite::{params, OptionalExtension};
use std::fs;

impl StorageManager {
    pub fn save_media(&self, request: SaveMediaRequest) -> Result<SaveMediaResponse, String> {
        if request.bytes.is_empty() {
            return Err("media_required".to_string());
        }

        let hash = sha256(&request.bytes);
        let path = self.write_cas_file(request.source, &hash, &request.bytes)?;
        let hash_hex = bytes_to_hex(&hash);
        let mime_type = request
            .mime_type
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string)
            .unwrap_or_else(|| detect_mime_type(&request.bytes).to_string());
        let size_bytes =
            i64::try_from(request.bytes.len()).map_err(|_| "media_too_large".to_string())?;
        let thumbnail = request.thumbnail.filter(|value| !value.is_empty());
        let connection = self
            .fixed_connection(request.source.media_database())
            .ok_or_else(|| "media_database_target_invalid".to_string())?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;

        // The original file lives in the CAS vault. SQLite stores only the hash,
        // fast metadata, and an optional thumbnail for gallery rendering.
        guard
            .execute(
                r#"
                INSERT OR IGNORE INTO blobs (
                    hash, thumbnail, mime_type, size_bytes, width, height
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
                "#,
                params![
                    hash.to_vec(),
                    thumbnail,
                    mime_type,
                    size_bytes,
                    request.width,
                    request.height
                ],
            )
            .map_err(|error| format!("media_metadata_insert_failed:{error}"))?;

        Ok(SaveMediaResponse {
            hash: hash.to_vec(),
            hash_hex,
            path: path_to_string(&path)?,
            mime_type,
            size_bytes,
            width: request.width,
            height: request.height,
        })
    }

    pub fn get_gallery_items(&self, request: GalleryRequest) -> Result<Vec<GalleryItem>, String> {
        let hashes = request
            .hashes
            .iter()
            .filter_map(|hash| decode_hash_hex(hash).ok())
            .collect::<Vec<_>>();
        if hashes.is_empty() {
            return Ok(Vec::new());
        }

        let connection = self
            .fixed_connection(request.source.media_database())
            .ok_or_else(|| "media_database_target_invalid".to_string())?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        let mut items = Vec::with_capacity(hashes.len());
        for hash in hashes {
            let row = guard
                .query_row(
                    r#"
                    SELECT hash, thumbnail, width, height, mime_type
                    FROM blobs
                    WHERE removed_at IS NULL AND hash = ?1
                    LIMIT 1
                    "#,
                    params![hash],
                    |row| {
                        let stored_hash: Vec<u8> = row.get(0)?;
                        let thumbnail: Option<Vec<u8>> = row.get(1)?;
                        let width: Option<i64> = row.get(2)?;
                        let height: Option<i64> = row.get(3)?;
                        let mime_type: String = row.get(4)?;
                        Ok(GalleryItem {
                            hash_hex: bytes_to_hex(&stored_hash),
                            hash: stored_hash,
                            thumbnail,
                            width,
                            height,
                            mime_type,
                        })
                    },
                )
                .optional()
                .map_err(|error| format!("media_gallery_select_failed:{error}"))?;

            if let Some(item) = row {
                items.push(item);
            }
        }
        Ok(items)
    }

    pub fn get_media_path(&self, request: MediaHashRequest) -> Result<String, String> {
        let hash = decode_hash_hex(&request.hash)?;
        self.assert_media_available(request.source, &hash)?;
        let path = self.resolve_cas_path(request.source, &hash)?;
        if !path.is_file() {
            return Err("media_file_not_found".to_string());
        }
        path_to_string(&path)
    }

    pub fn get_media_data(&self, request: MediaHashRequest) -> Result<Option<Vec<u8>>, String> {
        let hash = decode_hash_hex(&request.hash)?;
        self.assert_media_available(request.source, &hash)?;
        let path = self.resolve_cas_path(request.source, &hash)?;
        if !path.is_file() {
            return Ok(None);
        }
        fs::read(path)
            .map(Some)
            .map_err(|error| format!("media_file_read_failed:{error}"))
    }

    pub fn update_sync_status(&self, request: SyncStatusRequest) -> Result<(), String> {
        let hash = decode_hash_hex(&request.hash)?;
        if !matches!(request.sync_status.as_str(), "pending" | "synced" | "error") {
            return Err("media_sync_status_invalid".to_string());
        }
        let connection = self
            .fixed_connection(request.source.media_database())
            .ok_or_else(|| "media_database_target_invalid".to_string())?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        guard
            .execute(
                r#"
                UPDATE blobs
                SET sync_status = ?1,
                    uploaded_at = ?2
                WHERE hash = ?3
                "#,
                params![request.sync_status, request.uploaded_at, hash],
            )
            .map_err(|error| format!("media_sync_update_failed:{error}"))?;
        Ok(())
    }

    pub fn mark_as_removed(&self, request: MediaHashRequest) -> Result<(), String> {
        let hash = decode_hash_hex(&request.hash)?;
        let connection = self
            .fixed_connection(request.source.media_database())
            .ok_or_else(|| "media_database_target_invalid".to_string())?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        guard
            .execute(
                r#"
                UPDATE blobs
                SET removed_at = CURRENT_TIMESTAMP
                WHERE hash = ?1 AND removed_at IS NULL
                "#,
                params![hash],
            )
            .map_err(|error| format!("media_soft_delete_failed:{error}"))?;
        Ok(())
    }

    fn assert_media_available(
        &self,
        source: super::StorageDomain,
        hash: &[u8],
    ) -> Result<(), String> {
        let connection = self
            .fixed_connection(source.media_database())
            .ok_or_else(|| "media_database_target_invalid".to_string())?;
        let guard = connection
            .lock()
            .map_err(|_| "database_connection_lock_failed".to_string())?;
        let exists = guard
            .query_row(
                r#"
                SELECT 1
                FROM blobs
                WHERE hash = ?1 AND removed_at IS NULL
                LIMIT 1
                "#,
                params![hash],
                |_| Ok(()),
            )
            .optional()
            .map_err(|error| format!("media_metadata_select_failed:{error}"))?
            .is_some();
        if exists {
            Ok(())
        } else {
            Err("media_not_found".to_string())
        }
    }
}
