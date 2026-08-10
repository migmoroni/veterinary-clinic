export const MEDIA_INSERT_SQL = `INSERT OR IGNORE INTO blobs (
	hash, thumbnail, mime_type, size_bytes, width, height
) VALUES (__HASH__, __THUMBNAIL__, $1, $2, $3, $4)`;

export const MEDIA_GALLERY_SELECT_SQL = `
	SELECT hash, thumbnail, width, height, mime_type
	FROM blobs
	WHERE removed_at IS NULL AND hash IN (__HASHES__)
`;

export const SYSTEM_MEDIA_GALLERY_SELECT_SQL = `
	SELECT hash, thumbnail, width, height, mime_type
	FROM blobs
	WHERE hash IN (__HASHES__)
`;

export const MEDIA_SYNC_UPDATE_SQL = `
	UPDATE blobs
	SET sync_status = $1,
		uploaded_at = $2,
		updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
	WHERE hash = __HASH__
`;

export const SYSTEM_MEDIA_SYNC_UPDATE_SQL = `
	UPDATE blobs
	SET sync_status = $1,
		uploaded_at = $2
	WHERE hash = __HASH__
`;

export const MEDIA_SOFT_DELETE_SQL = `
	UPDATE blobs
	SET removed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
		updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
	WHERE hash = __HASH__ AND removed_at IS NULL
`;

