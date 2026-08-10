import type { SqliteDatabase } from '../client.js';
import { ensureSystemMediaSchemaVersion } from './system/media/create.js';
import { ensureUserMediaSchemaVersion } from './user/media/create.js';
import type { MediaStoreSource } from '../operations/media/types.js';

export async function configureMediaDatabase(database: SqliteDatabase, source: MediaStoreSource = 'user'): Promise<void> {
	await database.execute('PRAGMA page_size = 4096');
	await database.execute('PRAGMA journal_mode = WAL');
	await database.execute('PRAGMA cache_size = -4000');
	await database.execute('PRAGMA mmap_size = 33554432');
	if (source === 'system') {
		await ensureSystemMediaSchemaVersion(database);
		return;
	}
	await ensureUserMediaSchemaVersion(database);
}

