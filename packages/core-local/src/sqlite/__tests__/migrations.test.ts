import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createUuidV7, isUuidV4 } from '@vet/types/domain/shared/uuid.js';
import type { SqliteDatabase as Database } from '../client.js';
import { defaultTreatmentProtocols } from '@vet/types/domain/treatment/default-protocol.js';
import { configureMediaDatabase } from '../media.js';
import { CURRENT_SCHEMA_VERSION, runMigrations, runSystemMigrations } from '../migrations.js';

interface UserVersionRow {
	user_version: number;
}

interface CountRow {
	total: number;
}

interface MigrationRow {
	version: number;
	name: string;
}

interface IdRow {
	id: string;
}

interface TableNameRow {
	name: string;
}

const sqlite3Available = spawnSync('sqlite3', ['--version'], { encoding: 'utf8' }).status === 0;
const describeWithSqlite = sqlite3Available ? describe : describe.skip;

function sqlLiteral(value: unknown): string {
	if (value === null || typeof value === 'undefined') return 'NULL';
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
	if (typeof value === 'boolean') return value ? '1' : '0';
	return `'${String(value).replace(/'/g, "''")}'`;
}

function bindValues(query: string, values: unknown[]): string {
	let sql = query;
	for (let index = values.length - 1; index >= 0; index -= 1) {
		const value = values[index];
		sql = sql.replaceAll(`$${index + 1}`, sqlLiteral(value));
	}
	return sql;
}

class CliSqliteDatabase {
	constructor(private readonly filePath: string) {}

	async execute(query: string, values: unknown[] = []): Promise<void> {
		const sql = bindValues(query, values).trim();
		if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(sql)) return;

		const result = spawnSync('sqlite3', [this.filePath, sql], { encoding: 'utf8' });
		if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || `sqlite_execute_failed:${result.status}`);
	}

	async select<T>(query: string, values: unknown[] = []): Promise<T> {
		const result = spawnSync('sqlite3', ['-json', this.filePath, bindValues(query, values)], { encoding: 'utf8' });
		if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || `sqlite_select_failed:${result.status}`);
		return JSON.parse(result.stdout.trim() || '[]') as T;
	}
}

describeWithSqlite('SQLite schema migrations', () => {
	let tempDir = '';
	let database: CliSqliteDatabase;
	let mediaDatabase: CliSqliteDatabase;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), 'veterinary-clinic-migrations-'));
		database = new CliSqliteDatabase(join(tempDir, 'fixture.db'));
		mediaDatabase = new CliSqliteDatabase(join(tempDir, 'fixture-media.db'));
	});

	afterEach(() => {
		if (tempDir) rmSync(tempDir, { recursive: true, force: true });
	});

	it('creates the current schema and stamps user_version on an empty database', async () => {
		await runMigrations(database as unknown as Database, { syncDefaultBreedReferenceData: false });

		const versions = await database.select<UserVersionRow[]>('PRAGMA user_version');
		const migrations = await database.select<MigrationRow[]>('SELECT version, name FROM schema_migrations ORDER BY version');
		const owners = await database.select<CountRow[]>('SELECT COUNT(*) AS total FROM owners');
		const systemOnlyTables = await database.select<TableNameRow[]>(`
			SELECT name
			FROM sqlite_master
			WHERE type = 'table'
				AND name IN ('breed_reference_items', 'manufacturer_catalog_items', 'active_ingredient_catalog_items', 'condition_catalog_items')
			ORDER BY name
		`);
		const forbiddenProductTables = await database.select<TableNameRow[]>(`
			SELECT name
			FROM sqlite_master
			WHERE type = 'table'
				AND name IN ('product_catalog_items', 'product_active_ingredients')
			ORDER BY name
		`);

		expect(versions[0]?.user_version).toBe(CURRENT_SCHEMA_VERSION);
		expect(migrations).toEqual([{ version: 1, name: '0001_baseline_current_schema' }]);
		expect(owners[0]?.total).toBe(0);
		expect(systemOnlyTables).toEqual([]);
		expect(forbiddenProductTables).toEqual([]);
	});

	it('keeps default system treatment protocols in the system database', async () => {
		await configureMediaDatabase(mediaDatabase as unknown as Database);
		await runSystemMigrations(database as unknown as Database, { mediaDatabase: mediaDatabase as unknown as Database });

		const protocols = await database.select<CountRow[]>("SELECT COUNT(*) AS total FROM treatment_protocols WHERE origin = 'system'");
		const protocolIds = await database.select<IdRow[]>("SELECT id FROM treatment_protocols WHERE origin = 'system' ORDER BY id");
		const items = await database.select<CountRow[]>('SELECT COUNT(*) AS total FROM treatment_protocol_items');
		const doses = await database.select<CountRow[]>('SELECT COUNT(*) AS total FROM treatment_protocol_doses');

		expect(protocols[0]?.total).toBe(defaultTreatmentProtocols.length);
		expect(protocolIds.map((row) => row.id)).toEqual([...defaultTreatmentProtocols.map((protocol) => protocol.id)].sort());
		expect(protocolIds.every((row) => isUuidV4(row.id))).toBe(true);
		expect(items[0]?.total).toBe(defaultTreatmentProtocols.reduce((total, protocol) => total + protocol.catalogItemIds.length, 0));
		expect(doses[0]?.total).toBe(defaultTreatmentProtocols.reduce((total, protocol) => total + protocol.doses.length, 0));
	}, 15000);

	it('adopts a current unversioned database without losing data', async () => {
		await runMigrations(database as unknown as Database, { syncDefaultBreedReferenceData: false });
		await database.execute('INSERT INTO owners (id, name, additional_information) VALUES ($1, $2, $3)', [createUuidV7(), 'Ana', 'client data']);
		await database.execute('DELETE FROM schema_migrations');
		await database.execute('PRAGMA user_version = 0');

		await runMigrations(database as unknown as Database, { syncDefaultBreedReferenceData: false });

		const versions = await database.select<UserVersionRow[]>('PRAGMA user_version');
		const owners = await database.select<CountRow[]>("SELECT COUNT(*) AS total FROM owners WHERE name = 'Ana' AND additional_information = 'client data'");

		expect(versions[0]?.user_version).toBe(CURRENT_SCHEMA_VERSION);
		expect(owners[0]?.total).toBe(1);
	});

	it('refuses to open a database from a future schema version', async () => {
		await database.execute(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION + 1}`);

		await expect(runMigrations(database as unknown as Database)).rejects.toThrow(`database_schema_from_future:${CURRENT_SCHEMA_VERSION + 1}`);
	});

	it('refuses a database that announces the current version but does not match the current schema', async () => {
		await database.execute(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION}`);
		await database.execute('CREATE TABLE unrelated_table (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL)');

		await expect(runMigrations(database as unknown as Database)).rejects.toThrow('database_schema_unsupported');
	});

	it('refuses an unversioned database that is not the current schema', async () => {
		await database.execute(`
			CREATE TABLE unrelated_table (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				value TEXT NOT NULL
			)
		`);

		await expect(runMigrations(database as unknown as Database)).rejects.toThrow('database_schema_unsupported');
	});
});
