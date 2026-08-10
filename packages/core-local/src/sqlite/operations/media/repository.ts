import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '@vet/core-local/native/platform.js';
import type { SqliteDatabase } from '../../client.js';
import {
	MEDIA_GALLERY_SELECT_SQL,
	MEDIA_INSERT_SQL,
	MEDIA_SOFT_DELETE_SQL,
	MEDIA_SYNC_UPDATE_SQL,
	SYSTEM_MEDIA_GALLERY_SELECT_SQL,
	SYSTEM_MEDIA_SYNC_UPDATE_SQL
} from './sql.js';
import {
	hexToMediaHash,
	mediaHashToHex,
	mediaHashToSqlLiteral,
	normalizeMediaBytes,
	normalizeMediaHash,
	nullableBytesToSqlLiteral,
	sha256Digest,
	uniqueMediaHashes
} from './hash.js';
import { createImageThumbnail, inferMimeType } from './thumbnail.js';
import type { MediaBlobInsertOptions, MediaGalleryRow, MediaStoreSource, MediaSyncStatus } from './types.js';

interface SaveMediaCommandResponse {
	hash: unknown;
	hashHex: string;
	path: string;
	mimeType: string;
	sizeBytes: number;
	width: number | null;
	height: number | null;
}

interface GalleryItemCommandResponse {
	hash: unknown;
	hashHex: string;
	thumbnail: unknown | null;
	width: number | null;
	height: number | null;
	mimeType: string;
}

function bytesForInvoke(value: Uint8Array | null | undefined): number[] | null {
	return value && value.length > 0 ? Array.from(value) : null;
}

export async function insertMediaBlob(database: SqliteDatabase, bytes: Uint8Array, options: MediaBlobInsertOptions = {}, source: MediaStoreSource = 'user'): Promise<Uint8Array> {
	if (bytes.length === 0) throw new Error('media_required');
	const hash = await sha256Digest(bytes);
	const mimeType = options.mimeType?.trim() || inferMimeType(bytes);
	const imageMetadata =
		options.thumbnail === undefined || options.width === undefined || options.height === undefined
			? await createImageThumbnail(bytes, mimeType)
			: { thumbnail: options.thumbnail ?? null, width: options.width ?? null, height: options.height ?? null };

	if (isTauriRuntime()) {
		const response = await invoke<SaveMediaCommandResponse>('save_media', {
			request: {
				source,
				bytes: Array.from(bytes),
				mimeType,
				thumbnail: bytesForInvoke(imageMetadata.thumbnail),
				width: imageMetadata.width,
				height: imageMetadata.height
			}
		});
		const commandHash = normalizeMediaHash(response.hash) ?? hexToMediaHash(response.hashHex);
		if (!commandHash) throw new Error('media_hash_invalid');
		return commandHash;
	}

	const query = MEDIA_INSERT_SQL.replace('__HASH__', mediaHashToSqlLiteral(hash)).replace('__THUMBNAIL__', nullableBytesToSqlLiteral(imageMetadata.thumbnail));
	await database.execute(query, [mimeType, bytes.length, imageMetadata.width, imageMetadata.height]);
	return hash;
}

export async function selectMediaData(_database: SqliteDatabase, hash: Uint8Array, source: MediaStoreSource = 'user'): Promise<Uint8Array | null> {
	if (!isTauriRuntime()) return null;
	return normalizeMediaBytes(await invoke('get_media_data', { request: { source, hash: mediaHashToHex(hash) } }));
}

export async function selectMediaDataMap(database: SqliteDatabase, hashes: readonly Uint8Array[], source: MediaStoreSource = 'user'): Promise<Map<string, Uint8Array>> {
	const uniqueHashes = uniqueMediaHashes(hashes);
	if (uniqueHashes.length === 0) return new Map();
	const map = new Map<string, Uint8Array>();
	for (const hash of uniqueHashes) {
		const data = await selectMediaData(database, hash, source);
		if (data) map.set(mediaHashToHex(hash), data);
	}
	return map;
}

export async function selectMediaGalleryRows(database: SqliteDatabase, hashes: readonly Uint8Array[], source: MediaStoreSource = 'user'): Promise<MediaGalleryRow[]> {
	const uniqueHashes = uniqueMediaHashes(hashes);
	if (uniqueHashes.length === 0) return [];
	if (isTauriRuntime()) {
		const rows = await invoke<GalleryItemCommandResponse[]>('get_gallery_items', {
			request: { source, hashes: uniqueHashes.map(mediaHashToHex) }
		});
		return rows
			.map((row) => {
				const hash = normalizeMediaHash(row.hash) ?? hexToMediaHash(row.hashHex);
				if (!hash) return null;
				return {
					hash,
					thumbnail: normalizeMediaBytes(row.thumbnail),
					width: row.width,
					height: row.height,
					mime_type: row.mimeType
				};
			})
			.filter((row): row is MediaGalleryRow => Boolean(row));
	}

	const hashList = uniqueHashes.map(mediaHashToSqlLiteral).join(', ');
	const gallerySql = source === 'system' ? SYSTEM_MEDIA_GALLERY_SELECT_SQL : MEDIA_GALLERY_SELECT_SQL;
	const rows = await database.select<Array<Omit<MediaGalleryRow, 'hash' | 'thumbnail'> & { hash: unknown; thumbnail: unknown | null }>>(
		gallerySql.replace('__HASHES__', hashList)
	);
	return rows
		.map((row) => {
			const hash = normalizeMediaHash(row.hash);
			if (!hash) return null;
			return {
				hash,
				thumbnail: normalizeMediaBytes(row.thumbnail),
				width: row.width,
				height: row.height,
				mime_type: row.mime_type
			};
		})
		.filter((row): row is MediaGalleryRow => Boolean(row));
}

export async function updateMediaSyncStatus(database: SqliteDatabase, hash: Uint8Array, syncStatus: MediaSyncStatus, uploadedAt: string | null = null, source: MediaStoreSource = 'user'): Promise<void> {
	if (isTauriRuntime()) {
		await invoke('update_media_sync_status', { request: { source, hash: mediaHashToHex(hash), syncStatus, uploadedAt } });
		return;
	}
	const syncSql = source === 'system' ? SYSTEM_MEDIA_SYNC_UPDATE_SQL : MEDIA_SYNC_UPDATE_SQL;
	await database.execute(syncSql.replace('__HASH__', mediaHashToSqlLiteral(hash)), [syncStatus, uploadedAt]);
}

export async function softDeleteMediaBlob(database: SqliteDatabase, hash: Uint8Array, source: MediaStoreSource = 'user'): Promise<void> {
	if (source === 'system') throw new Error('system_media_is_read_only');
	if (isTauriRuntime()) {
		await invoke('mark_as_removed', { request: { source, hash: mediaHashToHex(hash) } });
		return;
	}
	await database.execute(MEDIA_SOFT_DELETE_SQL.replace('__HASH__', mediaHashToSqlLiteral(hash)));
}

export async function resolveMediaPath(hash: Uint8Array, source: MediaStoreSource = 'user'): Promise<string | null> {
	if (!isTauriRuntime() || hash.length !== 32) return null;
	return invoke<string>('get_media_path', { request: { source, hash: mediaHashToHex(hash) } });
}
