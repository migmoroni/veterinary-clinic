import Database from '@tauri-apps/plugin-sql';
import { copyDatabaseToAppConfigBackup, DATABASE_URL, ensureDatabaseDirectory, SYSTEM_DATABASE_URL, requireDatabaseFile } from '$lib/native/database-file.js';
import { getSchemaStatus, runMigrations, runSystemMigrations } from './migrations.js';

let cached: Database | null = null;
let pending: Promise<Database> | null = null;
let systemCached: Database | null = null;
let systemPending: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
	if (cached) return cached;
	if (pending) return pending;

	pending = (async () => {
		await requireDatabaseFile();
		let database = await Database.load(DATABASE_URL);
		try {
			await database.execute('PRAGMA foreign_keys = ON');
			const status = await getSchemaStatus(database);

			if (status.migrationRequired) {
				await database.execute('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
				await database.close(DATABASE_URL).catch(() => undefined);
				await copyDatabaseToAppConfigBackup('pre-migration-veterinary-clinic');

				database = await Database.load(DATABASE_URL);
				await database.execute('PRAGMA foreign_keys = ON');
			}

			await runMigrations(database);
			await getSystemDatabase();
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
	await closeSystemDatabase();
	await ensureDatabaseDirectory();

	const database = await Database.load(DATABASE_URL);
	await database.execute('PRAGMA foreign_keys = ON');
	await runMigrations(database);
	cached = database;
	await getSystemDatabase();
}

export async function getSystemDatabase(): Promise<Database> {
	if (systemCached) return systemCached;
	if (systemPending) return systemPending;

	systemPending = (async () => {
		await ensureDatabaseDirectory();
		const database = await Database.load(SYSTEM_DATABASE_URL);
		try {
			await database.execute('PRAGMA foreign_keys = ON');
			await runSystemMigrations(database);
			systemCached = database;
			return database;
		} catch (error) {
			await database.close(SYSTEM_DATABASE_URL).catch(() => undefined);
			throw error;
		} finally {
			systemPending = null;
		}
	})();

	return systemPending;
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

export async function closeSystemDatabase(): Promise<void> {
	let database = systemCached;
	if (!database && systemPending) {
		try {
			database = await systemPending;
		} catch {
			systemPending = null;
			systemCached = null;
			return;
		}
	}
	systemPending = null;

	if (!database) return;

	try {
		await database.execute('PRAGMA wal_checkpoint(TRUNCATE)');
	} catch {
		// Some SQLite builds return an error when WAL is not active.
	}

	await database.close(SYSTEM_DATABASE_URL);
	systemCached = null;
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

export async function selectSystemMany<T>(query: string, values: unknown[] = []): Promise<T[]> {
	const database = await getSystemDatabase();
	return database.select<T[]>(query, values);
}

export async function selectSystemOne<T>(query: string, values: unknown[] = []): Promise<T | null> {
	const rows = await selectSystemMany<T>(query, values);
	return rows[0] ?? null;
}

export async function executeSystem(query: string, values: unknown[] = []) {
	const database = await getSystemDatabase();
	return database.execute(query, values);
}
