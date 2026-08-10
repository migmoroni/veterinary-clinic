import type { SqliteSchemaFeature } from '../../profiles.js';

export const userMediaFeature = {
	id: 'user-media',
	tables: ['blobs']
} satisfies SqliteSchemaFeature;

