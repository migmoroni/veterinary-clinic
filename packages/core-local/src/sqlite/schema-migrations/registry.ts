import type { SchemaMigration } from './types.js';

// Add v2+ migrations here, importing one file per schema version from ./versions.
export const incrementalSchemaMigrations = [] satisfies SchemaMigration[];
