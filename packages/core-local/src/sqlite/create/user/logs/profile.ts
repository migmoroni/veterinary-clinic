import type { SqliteSchemaFeature } from '../../profiles.js';
import { USER_LOGS_TABLES } from './schema.js';

export const userLogsFeature = {
	id: 'user-logs',
	tables: USER_LOGS_TABLES
} satisfies SqliteSchemaFeature;
