import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '$lib/native/platform.js';
import type { SqliteDatabase } from './client.js';

export type MediaSyncStatus = 'pending' | 'synced' | 'error';
export type MediaStoreSource = 'user' | 'system';

export interface MediaBlobInsertOptions {
	mimeType?: string | null;
	thumbnail?: Uint8Array | null;
	width?: number | null;
	height?: number | null;
}

export interface MediaGalleryRow {
	hash: Uint8Array;
	thumbnail: Uint8Array | null;
	width: number | null;
	height: number | null;
	mime_type: string;
}

export const USER_MEDIA_BLOBS_DDL = `
	CREATE TABLE IF NOT EXISTS blobs (
		hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
		thumbnail BLOB,
		mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
		size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
		width INTEGER CHECK(width IS NULL OR width > 0),
		height INTEGER CHECK(height IS NULL OR height > 0),
		sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
		created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
		updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
		updated_by TEXT,
		uploaded_at TEXT,
		removed_at TEXT
	) WITHOUT ROWID
`;

export const SYSTEM_MEDIA_BLOBS_DDL = `
	CREATE TABLE IF NOT EXISTS blobs (
		hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
		thumbnail BLOB,
		mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
		size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
		width INTEGER CHECK(width IS NULL OR width > 0),
		height INTEGER CHECK(height IS NULL OR height > 0),
		sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
		uploaded_at TEXT
	) WITHOUT ROWID
`;

export const MEDIA_BLOBS_DDL = USER_MEDIA_BLOBS_DDL;

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

export function bytesToSqlLiteral(value: Uint8Array): string {
	if (value.length === 0) throw new Error('media_required');
	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

export function nullableBytesToSqlLiteral(value: Uint8Array | null | undefined): string {
	return value && value.length > 0 ? bytesToSqlLiteral(value) : 'NULL';
}

export function normalizeMediaHash(value: unknown): Uint8Array | null {
	if (value == null) return null;
	if (value instanceof Uint8Array) return value.length === 32 ? value : null;
	if (value instanceof ArrayBuffer) return value.byteLength === 32 ? new Uint8Array(value) : null;
	if (Array.isArray(value)) {
		const bytes = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
		return bytes.length === 32 ? Uint8Array.from(bytes.map((item) => item & 0xff)) : null;
	}
	if (typeof value === 'object' && value && 'data' in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return normalizeMediaHash(data);
	}
	if (typeof value === 'string') return hexToMediaHash(value);
	return null;
}

export function mediaHashToHex(hash: Uint8Array): string {
	if (hash.length !== 32) throw new Error('media_hash_invalid');
	return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToMediaHash(value: string): Uint8Array | null {
	const normalized = value.trim().toLowerCase();
	if (!/^[0-9a-f]{64}$/.test(normalized)) return null;
	const bytes = new Uint8Array(32);
	for (let index = 0; index < bytes.length; index += 1) {
		bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
	}
	return bytes;
}

export function mediaHashToSqlLiteral(hash: Uint8Array): string {
	return bytesToSqlLiteral(hash);
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return buffer;
}

export async function sha256Digest(bytes: Uint8Array): Promise<Uint8Array> {
	if (!globalThis.crypto?.subtle) throw new Error('media_hash_unavailable');
	return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytesToArrayBuffer(bytes)));
}

export async function configureMediaDatabase(database: SqliteDatabase, source: MediaStoreSource = 'user'): Promise<void> {
	await database.execute('PRAGMA page_size = 4096');
	await database.execute('PRAGMA journal_mode = WAL');
	await database.execute('PRAGMA cache_size = -4000');
	await database.execute('PRAGMA mmap_size = 33554432');
	await ensureCurrentMediaSchema(database, source);
}

function inferMimeType(bytes: Uint8Array): string {
	if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
	if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif';
	if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) return 'application/pdf';
	return 'application/octet-stream';
}

async function blobToBytes(blob: Blob): Promise<Uint8Array> {
	return new Uint8Array(await blob.arrayBuffer());
}

async function canvasToWebp(canvas: HTMLCanvasElement): Promise<Uint8Array | null> {
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.72));
	if (!blob || blob.size === 0) return null;
	return blobToBytes(blob);
}

async function createImageThumbnail(bytes: Uint8Array, mimeType: string): Promise<{ thumbnail: Uint8Array | null; width: number | null; height: number | null }> {
	if (!mimeType.startsWith('image/')) return { thumbnail: null, width: null, height: null };
	if (typeof Blob === 'undefined' || typeof createImageBitmap !== 'function' || typeof document === 'undefined') return { thumbnail: null, width: null, height: null };

	const blob = new Blob([bytesToArrayBuffer(bytes)], { type: mimeType });
	const bitmap = await createImageBitmap(blob).catch(() => null);
	if (!bitmap) return { thumbnail: null, width: null, height: null };

	try {
		const maxSide = 200;
		const ratio = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 1);
		const width = Math.max(1, Math.round(bitmap.width * ratio));
		const height = Math.max(1, Math.round(bitmap.height * ratio));
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) return { thumbnail: null, width: bitmap.width, height: bitmap.height };
		context.drawImage(bitmap, 0, 0, width, height);
		return { thumbnail: await canvasToWebp(canvas), width: bitmap.width, height: bitmap.height };
	} finally {
		bitmap.close();
	}
}

interface MediaColumnRow {
	name: string;
}

async function ensureCurrentMediaSchema(database: SqliteDatabase, source: MediaStoreSource): Promise<void> {
	const rows = await database.select<MediaColumnRow[]>('PRAGMA table_info(blobs)');
	if (rows.length === 0) {
		await database.execute(source === 'system' ? SYSTEM_MEDIA_BLOBS_DDL : USER_MEDIA_BLOBS_DDL);
		return;
	}
	const hasLegacyData = rows.some((row) => row.name === 'data');
	const hasUpdatedAt = rows.some((row) => row.name === 'updated_at');
	const hasUpdatedBy = rows.some((row) => row.name === 'updated_by');
	const hasRemovedAt = rows.some((row) => row.name === 'removed_at');
	if (source === 'user' && !hasLegacyData && hasUpdatedAt && hasUpdatedBy && hasRemovedAt) return;
	if (source === 'system' && !hasLegacyData && !hasUpdatedAt && !hasUpdatedBy && !hasRemovedAt) return;

	await database.execute('BEGIN IMMEDIATE');
	try {
		if (source === 'system') {
			await database.execute(`
				CREATE TABLE blobs_new (
					hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
					thumbnail BLOB,
					mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
					size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
					width INTEGER CHECK(width IS NULL OR width > 0),
					height INTEGER CHECK(height IS NULL OR height > 0),
					sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
					uploaded_at TEXT
				) WITHOUT ROWID
			`);
			await database.execute(`
				INSERT OR IGNORE INTO blobs_new (
					hash, thumbnail, mime_type, size_bytes, width, height, sync_status, uploaded_at
				)
				SELECT
					hash,
					thumbnail,
					mime_type,
					size_bytes,
					width,
					height,
					sync_status,
					uploaded_at
				FROM blobs
			`);
		} else {
			await database.execute(`
				CREATE TABLE blobs_new (
				hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
				thumbnail BLOB,
				mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
				size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
				width INTEGER CHECK(width IS NULL OR width > 0),
				height INTEGER CHECK(height IS NULL OR height > 0),
				sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
				updated_by TEXT,
				uploaded_at TEXT,
				removed_at TEXT
			) WITHOUT ROWID
			`);
			const createdAtExpression = rows.some((row) => row.name === 'created_at') ? 'created_at' : "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
			const updatedAtExpression = hasUpdatedAt ? 'updated_at' : createdAtExpression;
			const updatedByExpression = hasUpdatedBy ? 'updated_by' : 'NULL';
			const removedAtExpression = hasRemovedAt ? 'removed_at' : 'NULL';
			await database.execute(`
				INSERT OR IGNORE INTO blobs_new (
					hash, thumbnail, mime_type, size_bytes, width, height, sync_status, created_at, updated_at, updated_by, uploaded_at, removed_at
				)
				SELECT
					hash,
					thumbnail,
					mime_type,
					size_bytes,
					width,
					height,
					sync_status,
					COALESCE(${createdAtExpression}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
					COALESCE(${updatedAtExpression}, ${createdAtExpression}, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
					${updatedByExpression},
					uploaded_at,
					${removedAtExpression}
				FROM blobs
			`);
		}
		await database.execute('DROP TABLE blobs');
		await database.execute('ALTER TABLE blobs_new RENAME TO blobs');
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}

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
	const imageMetadata = options.thumbnail === undefined || options.width === undefined || options.height === undefined
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

	const query = MEDIA_INSERT_SQL
		.replace('__HASH__', mediaHashToSqlLiteral(hash))
		.replace('__THUMBNAIL__', nullableBytesToSqlLiteral(imageMetadata.thumbnail));
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

export function normalizeMediaBytes(value: unknown): Uint8Array | null {
	if (value == null) return null;
	if (value instanceof Uint8Array) return value;
	if (value instanceof ArrayBuffer) return new Uint8Array(value);
	if (Array.isArray(value)) {
		const bytes = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 255);
		return Uint8Array.from(bytes.map((item) => item & 0xff));
	}
	if (typeof value === 'object' && value && 'data' in value) {
		const data = (value as { data?: unknown }).data;
		if (Array.isArray(data)) return normalizeMediaBytes(data);
	}
	return null;
}

function uniqueMediaHashes(hashes: readonly Uint8Array[]): Uint8Array[] {
	const byHex = new Map<string, Uint8Array>();
	for (const hash of hashes) {
		if (hash.length !== 32) continue;
		byHex.set(mediaHashToHex(hash), hash);
	}
	return [...byHex.values()];
}
