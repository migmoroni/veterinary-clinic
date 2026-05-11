import Database from '@tauri-apps/plugin-sql';
import { DATABASE_URL, ensureDatabaseDirectory, requireDatabaseFile } from '$lib/native/database-file.js';
import { runMigrations } from './migrations.js';

let cached: Database | null = null;
let pending: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
	if (cached) return cached;
	if (pending) return pending;

	pending = (async () => {
		await requireDatabaseFile();
		const database = await Database.load(DATABASE_URL);
		try {
			await database.execute('PRAGMA foreign_keys = ON');
			await runMigrations(database);
			cached = database;
			return database;
		} catch (error) {
			await database.close(DATABASE_URL).catch(() => undefined);
			throw error;
		} finally {
			pending = null;
		}
	})();

	return pending;
}

export async function createEmptyDatabase(): Promise<void> {
	await closeDatabase();
	await ensureDatabaseDirectory();

	const database = await Database.load(DATABASE_URL);
	await database.execute('PRAGMA foreign_keys = ON');
	await runMigrations(database);
	cached = database;
}

export async function closeDatabase(): Promise<void> {
	let database = cached;
	if (!database && pending) {
		try {
			database = await pending;
		} catch {
			pending = null;
			cached = null;
			return;
		}
	}
	pending = null;

	if (!database) return;

	try {
		await database.execute('PRAGMA wal_checkpoint(TRUNCATE)');
	} catch {
		// Some SQLite builds return an error when WAL is not active.
	}

	await database.close(DATABASE_URL);
	cached = null;
}

export async function selectMany<T>(query: string, values: unknown[] = []): Promise<T[]> {
	const database = await getDatabase();
	return database.select<T[]>(query, values);
}

export async function selectOne<T>(query: string, values: unknown[] = []): Promise<T | null> {
	const rows = await selectMany<T>(query, values);
	return rows[0] ?? null;
}

export async function execute(query: string, values: unknown[] = []) {
	const database = await getDatabase();
	return database.execute(query, values);
}