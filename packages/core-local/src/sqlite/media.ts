export type { MediaBlobInsertOptions, MediaGalleryRow, MediaStoreSource, MediaSyncStatus } from './operations/media/types.js';
export {
	bytesToSqlLiteral,
	hexToMediaHash,
	mediaHashToHex,
	mediaHashToSqlLiteral,
	normalizeMediaBytes,
	normalizeMediaHash,
	nullableBytesToSqlLiteral,
	sha256Digest
} from './operations/media/hash.js';
export {
	MEDIA_GALLERY_SELECT_SQL,
	MEDIA_INSERT_SQL,
	MEDIA_SOFT_DELETE_SQL,
	MEDIA_SYNC_UPDATE_SQL,
	SYSTEM_MEDIA_GALLERY_SELECT_SQL,
	SYSTEM_MEDIA_SYNC_UPDATE_SQL
} from './operations/media/sql.js';
export {
	SYSTEM_MEDIA_BLOBS_DDL
} from './create/system/media/schema.js';
export {
	USER_MEDIA_BLOBS_DDL,
	USER_MEDIA_BLOBS_DDL as MEDIA_BLOBS_DDL
} from './create/user/media/schema.js';
export {
	configureMediaDatabase
} from './create/media.js';
export {
	insertMediaBlob,
	resolveMediaPath,
	selectMediaData,
	selectMediaDataMap,
	selectMediaGalleryRows,
	softDeleteMediaBlob,
	updateMediaSyncStatus
} from './operations/media/repository.js';
