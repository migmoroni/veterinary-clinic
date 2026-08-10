import type { SqliteDatabase } from '../../../client.js';

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

interface MediaColumnRow {
	name: string;
}

export async function ensureCurrentUserMediaSchema(database: SqliteDatabase): Promise<void> {
	const rows = await database.select<MediaColumnRow[]>('PRAGMA table_info(blobs)');
	if (rows.length === 0) {
		await database.execute(USER_MEDIA_BLOBS_DDL);
		return;
	}

	const hasLegacyData = rows.some((row) => row.name === 'data');
	const hasUpdatedAt = rows.some((row) => row.name === 'updated_at');
	const hasUpdatedBy = rows.some((row) => row.name === 'updated_by');
	const hasRemovedAt = rows.some((row) => row.name === 'removed_at');
	if (!hasLegacyData && hasUpdatedAt && hasUpdatedBy && hasRemovedAt) return;

	await database.execute('BEGIN IMMEDIATE');
	try {
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
		await database.execute('DROP TABLE blobs');
		await database.execute('ALTER TABLE blobs_new RENAME TO blobs');
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}
