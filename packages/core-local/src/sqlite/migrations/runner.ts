import { assertSystemSchema } from '../create/system/main/assertions.js';
import { createSystemIndexes } from '../create/system/main/indexes.js';
import { refreshOutdatedSystemCatalogSchema } from '../create/system/main/refresh.js';
import { createSystemSchema } from '../create/system/main/schema.js';
import {
	syncDefaultActiveIngredientCatalog,
	syncDefaultBreedReferenceCatalog,
	syncDefaultConditionCatalog,
	syncDefaultManufacturerCatalog,
	syncDefaultProductCatalog,
	syncDefaultTreatmentProtocols
} from '../create/system/main/seeds.js';
import { assertCurrentSchema } from '../create/user/main/assertions.js';
import { removeSystemDataFromClientDatabase } from '../create/user/main/cleanup-system-data.js';
import { createCurrentIndexes } from '../create/user/main/indexes.js';
import { createCurrentSchema } from '../create/user/main/schema.js';
import { validateDatabaseIntegrity } from '../create/shared/integrity.js';
import { getUserVersion, setUserVersion } from '../create/shared/schema-version.js';
import type { Database } from '../create/shared/types.js';
import { CURRENT_SYSTEM_MAIN_SCHEMA_VERSION, CURRENT_USER_MAIN_SCHEMA_VERSION } from '../schema-versions.js';
import { assertDatabaseCanMigrate } from './status.js';
import { incrementalSchemaMigrations } from './user/main/registry.js';
import type { SchemaMigration } from './user/main/types.js';

export const BASELINE_APP_VERSION = '0.2.0';

interface RunMigrationsOptions {
	seedDefaultData?: boolean;
	createIndexes?: boolean;
	syncDefaultProductData?: boolean;
	syncDefaultTreatmentProtocolData?: boolean;
	syncDefaultBreedReferenceData?: boolean;
}

interface RunSystemMigrationsOptions {
	createIndexes?: boolean;
	mediaDatabase?: Database;
}

async function ensureMigrationMetadataTable(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

async function recordMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await database.execute(
		`INSERT OR IGNORE INTO schema_migrations (version, name, app_version, applied_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
		[migration.version, migration.name, migration.introducedInAppVersion]
	);
	await setUserVersion(database, migration.version);
}

async function backfillMigrationMetadata(database: Database, version: number): Promise<void> {
	for (const migration of SCHEMA_MIGRATIONS.filter((item) => item.version <= version)) {
		await recordMigration(database, migration);
	}
}

const BASELINE_SCHEMA_MIGRATION = {
	version: 1,
	name: '0001_baseline_current_schema',
	introducedInAppVersion: BASELINE_APP_VERSION,
	up: createCurrentSchema,
	verify: assertCurrentSchema
} satisfies SchemaMigration;

function buildSchemaMigrationRegistry(): SchemaMigration[] {
	const migrations = [BASELINE_SCHEMA_MIGRATION, ...incrementalSchemaMigrations].sort((first, second) => first.version - second.version);
	const seenVersions = new Set<number>();

	for (const migration of migrations) {
		if (seenVersions.has(migration.version)) throw new Error(`database_schema_migration_duplicate:${migration.version}`);
		seenVersions.add(migration.version);
		if (migration.version > CURRENT_USER_MAIN_SCHEMA_VERSION) throw new Error(`database_schema_migration_above_current:${migration.version}`);
	}

	for (let expectedVersion = 1; expectedVersion <= CURRENT_USER_MAIN_SCHEMA_VERSION; expectedVersion += 1) {
		if (!seenVersions.has(expectedVersion)) throw new Error(`database_schema_migration_registry_gap:${expectedVersion}`);
	}

	return migrations;
}

const SCHEMA_MIGRATIONS = buildSchemaMigrationRegistry();

async function applyMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await migration.up(database);
	if (migration.verify) await migration.verify(database);
	await recordMigration(database, migration);
}

export async function runSystemMigrations(database: Database, options: RunSystemMigrationsOptions = {}): Promise<void> {
	const { createIndexes = true, mediaDatabase } = options;
	if (!mediaDatabase) throw new Error('system_media_database_required');
	const currentVersion = await getUserVersion(database);
	if (currentVersion > CURRENT_SYSTEM_MAIN_SCHEMA_VERSION) throw new Error(`database_schema_from_future:${currentVersion}`);

	await database.execute('BEGIN IMMEDIATE');
	try {
		await refreshOutdatedSystemCatalogSchema(database);
		await createSystemSchema(database);
		await assertSystemSchema(database);
		await syncDefaultManufacturerCatalog(database, mediaDatabase);
		await syncDefaultActiveIngredientCatalog(database, mediaDatabase);
		await syncDefaultConditionCatalog(database, mediaDatabase);
		await syncDefaultProductCatalog(database, mediaDatabase);
		await syncDefaultBreedReferenceCatalog(database, mediaDatabase);
		await syncDefaultTreatmentProtocols(database);
		if (createIndexes) await createSystemIndexes(database);
		await setUserVersion(database, CURRENT_SYSTEM_MAIN_SCHEMA_VERSION);
		await validateDatabaseIntegrity(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	const { createIndexes = true } = options;
	const status = await assertDatabaseCanMigrate(database);

	await database.execute('BEGIN IMMEDIATE');
	try {
		await ensureMigrationMetadataTable(database);

		if (status.detection === 'current-unversioned') {
			await createCurrentSchema(database);
			await assertCurrentSchema(database);
			await backfillMigrationMetadata(database, CURRENT_USER_MAIN_SCHEMA_VERSION);
		} else {
			const unappliedMigrations = SCHEMA_MIGRATIONS.filter((migration) => migration.version > status.currentVersion && migration.version <= CURRENT_USER_MAIN_SCHEMA_VERSION);
			for (const migration of unappliedMigrations) {
				await applyMigration(database, migration);
			}

			if (status.detection === 'versioned' && status.migrationRequired && unappliedMigrations.length === 0) {
				await backfillMigrationMetadata(database, status.currentVersion);
			}
		}

		await createCurrentSchema(database);
		await assertCurrentSchema(database);
		await removeSystemDataFromClientDatabase(database);
		if (createIndexes) await createCurrentIndexes(database);
		await validateDatabaseIntegrity(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}

