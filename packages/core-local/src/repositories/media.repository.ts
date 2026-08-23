import {
	getSystemMediaDatabase,
	getUserMediaDatabase
} from '@vet/core-local/sqlite/client.js';
import {
	insertMediaBlob,
	mediaHashToHex,
	normalizeMediaHash,
	resolveMediaPath,
	selectMediaData,
	selectMediaDataMap,
	selectMediaGalleryRows,
	softDeleteMediaBlob,
	updateMediaSyncStatus,
	type MediaBlobInsertOptions,
	type MediaGalleryRow,
	type MediaStoreSource,
	type MediaSyncStatus
} from '@vet/core-local/sqlite/media.js';

async function mediaDatabaseFor(source: MediaStoreSource) {
	return source === 'system' ? getSystemMediaDatabase() : getUserMediaDatabase();
}

export async function saveMedia(source: MediaStoreSource, bytes: Uint8Array | null | undefined, options: MediaBlobInsertOptions = {}): Promise<Uint8Array | null> {
	if (!bytes || bytes.length === 0) return null;
	return insertMediaBlob(await mediaDatabaseFor(source), bytes, options, source);
}

export async function loadMediaData(source: MediaStoreSource, hash: Uint8Array | null | undefined): Promise<Uint8Array | null> {
	if (!hash || hash.length !== 32) return null;
	return selectMediaData(await mediaDatabaseFor(source), hash, source);
}

export async function loadMediaDataMap(source: MediaStoreSource, hashes: readonly (Uint8Array | null | undefined)[]): Promise<Map<string, Uint8Array>> {
	const normalized = hashes.filter((hash): hash is Uint8Array => Boolean(hash && hash.length === 32));
	return selectMediaDataMap(await mediaDatabaseFor(source), normalized, source);
}

export async function loadMediaGallery(source: MediaStoreSource, hashes: readonly (Uint8Array | null | undefined)[]): Promise<MediaGalleryRow[]> {
	const normalized = hashes.filter((hash): hash is Uint8Array => Boolean(hash && hash.length === 32));
	return selectMediaGalleryRows(await mediaDatabaseFor(source), normalized, source);
}

export async function updateMediaSync(source: MediaStoreSource, hash: Uint8Array, syncStatus: MediaSyncStatus, uploadedAt: string | null = null): Promise<void> {
	await updateMediaSyncStatus(await mediaDatabaseFor(source), hash, syncStatus, uploadedAt, source);
}

export async function softDeleteMedia(source: MediaStoreSource, hash: Uint8Array): Promise<void> {
	await softDeleteMediaBlob(await mediaDatabaseFor(source), hash, source);
}

export async function getMediaPath(source: MediaStoreSource, hash: Uint8Array | null | undefined): Promise<string | null> {
	if (!hash || hash.length !== 32) return null;
	return resolveMediaPath(hash, source);
}

export function mediaHashKey(value: unknown): string | null {
	const hash = normalizeMediaHash(value);
	return hash ? mediaHashToHex(hash) : null;
}
