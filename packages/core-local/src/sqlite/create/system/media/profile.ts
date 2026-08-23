import type { SqliteSchemaFeature } from '../../profiles.js';

export const systemMediaFeature = {
	id: 'system-media',
	tables: ['blobs']
} satisfies SqliteSchemaFeature;

