import { invoke } from '@tauri-apps/api/core';
import {
	copyDatabaseToAppConfigBackup,
	ensureDatabaseDirectory,
	hasDatabaseFile
} from '@vet/core-local/native/database-file.js';
import { isTauriRuntime } from '@vet/core-local/native/platform.js';
import { configureMediaDatabase } from './create/media.js';
import { getSchemaStatus, runMigrations, runSystemMigrations } from './migrations.js';

export interface SqlExecuteResult {
	rowsAffected: number;
	lastInsertId: number;
}

export interface SqliteDatabase {
	select<T = unknown[]>(query: string, values?: unknown[]): Promise<T>;
	execute(query: string, values?: unknown[]): Promise<SqlExecuteResult>;
	close?(): Promise<void>;
}

type StorageDatabaseKind = 'user' | 'system' | 'userMedia' | 'systemMedia' | 'userLogs' | 'appConfigFile';
type StorageDbType = 'operational' | 'mediaIndex' | 'systemMediaIndex' | 'logs';

interface StorageDatabaseOptions {
	database: StorageDatabaseKind;
	fileName?: string;
	dbType?: StorageDbType;
}

let cached: SqliteDatabase | null = null;
let pending: Promise<SqliteDatabase> | null = null;
let systemCached: SqliteDatabase | null = null;
let systemPending: Promise<SqliteDatabase> | null = null;
let userMediaCached: SqliteDatabase | null = null;
let userMediaPending: Promise<SqliteDatabase> | null = null;
let systemMediaCached: SqliteDatabase | null = null;
let systemMediaPending: Promise<SqliteDatabase> | null = null;

function assertTauriDatabaseRuntime(): void {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}
}

function databaseRequest(options: StorageDatabaseOptions) {
	return {
		database: options.database,
		fileName: options.fileName,
		dbType: options.dbType
	};
}

function createDatabaseAdapter(options: StorageDatabaseOptions): SqliteDatabase {
	return {
		select: async <T = unknown[]>(query: string, values: unknown[] = []) =>
			invoke<T>('storage_select', {
				request: { ...databaseRequest(options), query, values }
			}),
		execute: async (query: string, values: unknown[] = []) =>
			invoke<SqlExecuteResult>('storage_execute', {
				request: { ...databaseRequest(options), query, values }
			}),
		close: async () => {
			await invoke('storage_close', { request: databaseRequest(options) });
		}
	};
}

async function reopenStorageDatabase(options: StorageDatabaseOptions): Promise<void> {
	await invoke('storage_reopen', { request: databaseRequest(options) });
}

export function createAppConfigDatabase(fileName: string, dbType: StorageDbType = 'operational'): SqliteDatabase {
	assertTauriDatabaseRuntime();
	return createDatabaseAdapter({ database: 'appConfigFile', fileName, dbType });
}

export async function getDatabase(): Promise<SqliteDatabase> {
	if (cached) return cached;
	if (pending) return pending;

	pending = (async () => {
		assertTauriDatabaseRuntime();
		await ensureDatabaseDirectory();
		await reopenStorageDatabase({ database: 'user', dbType: 'operational' });

		const database = createDatabaseAdapter({ database: 'user', dbType: 'operational' });
		try {
			await database.execute('PRAGMA foreign_keys = ON');
			const status = await getSchemaStatus(database);

			if (status.migrationRequired && status.detection !== 'empty' && (await hasDatabaseFile().catch(() => false))) {
				await database.execute('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
				await database.close?.().catch(() => undefined);
				await copyDatabaseToAppConfigBackup('pre-migration-veterinary-clinic');
				await reopenStorageDatabase({ database: 'user', dbType: 'operational' });
				await database.execute('PRAGMA foreign_keys = ON');
			}

			await runMigrations(database);
			await getUserMediaDatabase();
			await getSystemDatabase();
			cached = database;
			return database;
		} catch (error) {
			await database.close?.().catch(() => undefined);
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
	await closeUserMediaDatabase();
	await closeSystemMediaDatabase();
	await ensureDatabaseDirectory();
	await reopenStorageDatabase({ database: 'user', dbType: 'operational' });

	const database = createDatabaseAdapter({ database: 'user', dbType: 'operational' });
	await database.execute('PRAGMA foreign_keys = ON');
	await runMigrations(database);
	cached = database;
	await getUserMediaDatabase();
	await getSystemDatabase();
}

export async function getSystemDatabase(): Promise<SqliteDatabase> {
	if (systemCached) return systemCached;
	if (systemPending) return systemPending;

	systemPending = (async () => {
		assertTauriDatabaseRuntime();
		await ensureDatabaseDirectory();
		await reopenStorageDatabase({ database: 'system', dbType: 'operational' });

		const database = createDatabaseAdapter({ database: 'system', dbType: 'operational' });
		try {
			await database.execute('PRAGMA foreign_keys = ON');
			const mediaDatabase = await getSystemMediaDatabase();
			await runSystemMigrations(database, { mediaDatabase });
			systemCached = database;
			return database;
		} catch (error) {
			await database.close?.().catch(() => undefined);
			throw error;
		} finally {
			systemPending = null;
		}
	})();

	return systemPending;
}

export async function getUserMediaDatabase(): Promise<SqliteDatabase> {
	if (userMediaCached) return userMediaCached;
	if (userMediaPending) return userMediaPending;

	userMediaPending = (async () => {
		assertTauriDatabaseRuntime();
		await ensureDatabaseDirectory();
		await reopenStorageDatabase({ database: 'userMedia', dbType: 'mediaIndex' });

		const database = createDatabaseAdapter({ database: 'userMedia', dbType: 'mediaIndex' });
		try {
			await configureMediaDatabase(database);
			userMediaCached = database;
			return database;
		} catch (error) {
			await database.close?.().catch(() => undefined);
			throw error;
		} finally {
			userMediaPending = null;
		}
	})();

	return userMediaPending;
}

export async function getSystemMediaDatabase(): Promise<SqliteDatabase> {
	if (systemMediaCached) return systemMediaCached;
	if (systemMediaPending) return systemMediaPending;

	systemMediaPending = (async () => {
		assertTauriDatabaseRuntime();
		await ensureDatabaseDirectory();
		await reopenStorageDatabase({ database: 'systemMedia', dbType: 'systemMediaIndex' });

		const database = createDatabaseAdapter({ database: 'systemMedia', dbType: 'systemMediaIndex' });
		try {
			await configureMediaDatabase(database, 'system');
			systemMediaCached = database;
			return database;
		} catch (error) {
			await database.close?.().catch(() => undefined);
			throw error;
		} finally {
			systemMediaPending = null;
		}
	})();

	return systemMediaPending;
}

async function closeCachedDatabase(current: SqliteDatabase | null, currentPending: Promise<SqliteDatabase> | null): Promise<void> {
	let database = current;
	if (!database && currentPending) {
		try {
			database = await currentPending;
		} catch {
			return;
		}
	}

	if (!database) return;
	await database.execute('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => undefined);
	await database.close?.().catch(() => undefined);
}

export async function closeDatabase(): Promise<void> {
	await closeCachedDatabase(cached, pending);
	pending = null;
	cached = null;
}

export async function closeSystemDatabase(): Promise<void> {
	await closeCachedDatabase(systemCached, systemPending);
	systemPending = null;
	systemCached = null;
}

export async function closeUserMediaDatabase(): Promise<void> {
	await closeCachedDatabase(userMediaCached, userMediaPending);
	userMediaPending = null;
	userMediaCached = null;
}

export async function closeSystemMediaDatabase(): Promise<void> {
	await closeCachedDatabase(systemMediaCached, systemMediaPending);
	systemMediaPending = null;
	systemMediaCached = null;
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

export async function selectUserMediaMany<T>(query: string, values: unknown[] = []): Promise<T[]> {
	const database = await getUserMediaDatabase();
	return database.select<T[]>(query, values);
}

export async function selectUserMediaOne<T>(query: string, values: unknown[] = []): Promise<T | null> {
	const rows = await selectUserMediaMany<T>(query, values);
	return rows[0] ?? null;
}

export async function executeUserMedia(query: string, values: unknown[] = []) {
	const database = await getUserMediaDatabase();
	return database.execute(query, values);
}

export async function selectUserLogsMany<T>(query: string, values: unknown[] = []): Promise<T[]> {
	assertTauriDatabaseRuntime();
	return createDatabaseAdapter({ database: 'userLogs', dbType: 'logs' }).select<T[]>(query, values);
}

export async function selectSystemMediaMany<T>(query: string, values: unknown[] = []): Promise<T[]> {
	const database = await getSystemMediaDatabase();
	return database.select<T[]>(query, values);
}

export async function selectSystemMediaOne<T>(query: string, values: unknown[] = []): Promise<T | null> {
	const rows = await selectSystemMediaMany<T>(query, values);
	return rows[0] ?? null;
}

export async function executeSystemMedia(query: string, values: unknown[] = []) {
	const database = await getSystemMediaDatabase();
	return database.execute(query, values);
}
