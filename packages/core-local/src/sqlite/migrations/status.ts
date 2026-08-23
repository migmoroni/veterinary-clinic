import { CURRENT_USER_MAIN_SCHEMA_VERSION } from '../schema-versions.js';
import { getUserVersion } from '../create/shared/schema-version.js';
import { isEmptyDatabase, tableExists } from '../create/shared/table-introspection.js';
import type { Database, SchemaStatus } from '../create/shared/types.js';
import { hasCurrentUnversionedSchema } from '../create/user/main/assertions.js';

interface MigrationRecordRow {
	version: number;
}

export async function getSchemaStatus(database: Database): Promise<SchemaStatus> {
	const currentVersion = await getUserVersion(database);

	if (currentVersion > CURRENT_USER_MAIN_SCHEMA_VERSION) {
		return {
			currentVersion,
			targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
			migrationRequired: false,
			detection: 'versioned',
			isSupported: false,
			reason: 'future-version'
		};
	}

	if (currentVersion > 0) {
		if (currentVersion === CURRENT_USER_MAIN_SCHEMA_VERSION && !(await hasCurrentUnversionedSchema(database))) {
			return {
				currentVersion,
				targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
				migrationRequired: false,
				detection: 'versioned',
				isSupported: false,
				reason: 'unknown-schema'
			};
		}

		const missingMetadata = !(await hasSchemaMigrationRecord(database, currentVersion));
		return {
			currentVersion,
			targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
			migrationRequired: currentVersion < CURRENT_USER_MAIN_SCHEMA_VERSION || missingMetadata,
			detection: 'versioned',
			isSupported: true
		};
	}

	if (await isEmptyDatabase(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'empty',
			isSupported: true
		};
	}

	if (await hasCurrentUnversionedSchema(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'current-unversioned',
			isSupported: true
		};
	}

	return {
		currentVersion,
		targetVersion: CURRENT_USER_MAIN_SCHEMA_VERSION,
		migrationRequired: false,
		detection: 'unknown-unversioned',
		isSupported: false,
		reason: 'unknown-schema'
	};
}

export async function assertDatabaseCanMigrate(database: Database): Promise<SchemaStatus> {
	const status = await getSchemaStatus(database);
	if (status.isSupported) return status;

	if (status.reason === 'future-version') throw new Error(`database_schema_from_future:${status.currentVersion}`);
	throw new Error('database_schema_unsupported');
}

async function hasSchemaMigrationRecord(database: Database, version: number): Promise<boolean> {
	if (!(await tableExists(database, 'schema_migrations'))) return false;
	const rows = await database.select<MigrationRecordRow[]>('SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1', [version]);
	return rows.length > 0;
}

