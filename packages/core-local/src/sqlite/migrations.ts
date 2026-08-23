import { CURRENT_USER_MAIN_SCHEMA_VERSION } from './schema-versions.js';

export {
	CURRENT_SYSTEM_MAIN_SCHEMA_VERSION,
	CURRENT_USER_LOGS_SCHEMA_VERSION,
	CURRENT_USER_MAIN_SCHEMA_VERSION,
	CURRENT_USER_MEDIA_SCHEMA_VERSION,
	CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
} from './schema-versions.js';

export type { SchemaStatus } from './create/shared/types.js';
export { createCurrentIndexes } from './create/user/main/indexes.js';
export type { SqliteDatabaseProfile, SqliteSchemaFeature } from './create/profiles.js';
export { vetAppDatabaseProfile } from './create/profiles.js';
export { assertDatabaseCanMigrate, getSchemaStatus } from './migrations/status.js';
export { BASELINE_APP_VERSION, runMigrations, runSystemMigrations } from './migrations/runner.js';

export const CURRENT_SCHEMA_VERSION = CURRENT_USER_MAIN_SCHEMA_VERSION;
