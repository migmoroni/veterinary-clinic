# Schema Migration Files

Add one file per schema version after the baseline.

Expected pattern:

```text
0002_add_x_to_y.ts
0003_migrate_old_field_to_new_table.ts
```

Each file should export a `SchemaMigration` object:

```ts
import type { SchemaMigration } from '../types.js';

export const migration0002AddXToY = {
	version: 2,
	name: '0002_add_x_to_y',
	introducedInAppVersion: '2.1.0',
	async up(database) {
		// SQL changes here.
	},
	async verify(database) {
		// Optional migration-specific checks here.
	}
} satisfies SchemaMigration;
```

Then import it in `../registry.ts` and add it to `incrementalSchemaMigrations`.
