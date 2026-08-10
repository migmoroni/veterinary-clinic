import { CURRENT_USER_MEDIA_SCHEMA_VERSION } from '../../../schema-versions.js';
import { getUserVersion, setUserVersion } from '../../shared/schema-version.js';
import type { Database } from '../../shared/types.js';
import { ensureCurrentUserMediaSchema } from './schema.js';

export async function ensureUserMediaSchemaVersion(database: Database): Promise<void> {
	const currentVersion = await getUserVersion(database);
	if (currentVersion > CURRENT_USER_MEDIA_SCHEMA_VERSION) throw new Error(`database_schema_from_future:${currentVersion}`);
	await ensureCurrentUserMediaSchema(database);
	await setUserVersion(database, CURRENT_USER_MEDIA_SCHEMA_VERSION);
}

