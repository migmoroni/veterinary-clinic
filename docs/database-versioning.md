# Database Versioning And Release Ritual

The app separates two versions:

- App version: public SemVer shown to users and stored in `package.json`, Tauri, and Cargo.
- SQLite schema version: integer stored in `PRAGMA user_version`.

The current unversioned app database is adopted as schema `v1`. Future schema versions must be `v2`, `v3`, and so on.

## Runtime Contract

The runtime database is `veterinary_clinic.db` in the Tauri app config directory. The app owns migrations for databases that already belong to the current application schema lineage.

The migrator lives in `src/lib/persistence/sqlite/migrations.ts` and defines:

- `CURRENT_SCHEMA_VERSION`
- the migration runner
- support/status detection
- transaction, metadata, and integrity handling

Incremental migration files live under `src/lib/persistence/sqlite/schema-migrations`:

- `types.ts` defines the `SchemaMigration` contract.
- `registry.ts` imports and orders schema `v2+` migrations.
- `versions/` stores one file per schema version after the baseline.

`migrations.ts` owns the baseline `v1` because it creates the current schema from scratch. Future migrations should not be implemented inside `migrations.ts`; put their body in `schema-migrations/versions`.

The migration system also defines:

- `schema_migrations`
- integrity validation

`PRAGMA user_version` is the authoritative schema version. The `schema_migrations` table is the audit trail:

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  app_version TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Startup Flow

`src/lib/persistence/sqlite/client.ts` opens the database as follows:

1. Load the database with `tauri-plugin-sql`.
2. Enable foreign keys.
3. Detect schema status.
4. If a migration or adoption is needed, checkpoint WAL, close the connection, and create a backup in `AppConfig/backups/pre-migration-veterinary-clinic-<timestamp>.db`.
5. Reopen the database.
6. Run migrations in a `BEGIN IMMEDIATE` transaction.
7. Validate `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.
8. Commit only if every step succeeds.

If a migration fails, the transaction is rolled back and the pre-migration backup remains available.

## Supported Database States

- Empty database: creates the current schema and records schema `v1`.
- Current unversioned database: adopted as `v1` without rebuilding data.
- Versioned old database: migrations are applied sequentially until `CURRENT_SCHEMA_VERSION`.
- Future database: refused with an app-outdated error.
- Unknown unversioned database: refused. Do not add one-off legacy translators to the runtime migrator.

## Imports And Exports

SQLite import validates whether the selected database is supported by the runtime migrator. After replacing the local database, normal startup opens it and applies required migrations.

CSV export includes `_metadata/schema.json` with the current schema version. CSV import restores `PRAGMA user_version` after rebuilding the local database and refuses metadata from a future schema.

## When A New Schema Version Is Required

Create a new schema migration whenever a change affects persistent database structure or existing persisted data semantics, including:

- adding, renaming, or removing tables or columns
- adding or changing indexes required by behavior
- changing `CHECK`, `UNIQUE`, or foreign-key constraints
- moving data between tables
- transforming existing row values
- changing saved meaning of an existing column
- changing default catalog/protocol data in a way that must update existing rows

Do not create a schema migration for:

- UI-only changes
- pure TypeScript/domain helper changes
- idempotent seed routines that only insert missing defaults without changing existing rows
- external one-off conversion scripts

## How To Add A Migration

Never edit a migration that has already shipped to a client. Add a new one.

1. Decide the next integer schema version.
2. Create a file in `src/lib/persistence/sqlite/schema-migrations/versions`, such as `0002_add_field_to_table.ts`.
3. Export a `SchemaMigration` object from that file.
4. Import it in `src/lib/persistence/sqlite/schema-migrations/registry.ts`.
5. Add it to `incrementalSchemaMigrations`.
6. Increment `CURRENT_SCHEMA_VERSION` in `src/lib/persistence/sqlite/migrations.ts`.
7. Set `introducedInAppVersion` to the app version that first ships the migration.
8. Implement `up(database)`.
9. Add `verify(database)` when the migration has important invariants.
10. Add tests for upgrading from the previous version.
11. Run the full release checks.

Migration names should follow:

```text
0001_baseline_current_schema
0002_add_x_to_y
0003_migrate_old_field_to_new_table
```

Migration file exports should follow this shape:

```ts
import type { SchemaMigration } from '../types.js';

export const migration0002AddXToY = {
  version: 2,
  name: '0002_add_x_to_y',
  introducedInAppVersion: '2.1.0',
  async up(database) {
    await database.execute('ALTER TABLE example ADD COLUMN x TEXT');
  },
  async verify(database) {
    // Optional checks.
  }
} satisfies SchemaMigration;
```

The registry validates duplicate versions, gaps, and migrations above `CURRENT_SCHEMA_VERSION`.

For complex SQLite table changes, prefer the safe rebuild pattern:

1. Create a new table with the desired schema.
2. Copy data from the old table.
3. Validate counts and relationships.
4. Drop the old table.
5. Rename the new table.
6. Recreate indexes and triggers.
7. Run migration-specific verification.

## Version Bump Ritual

Use one command to change the public app version:

```sh
npm run version:bump -- 2.1.0
```

The script updates:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- the app package entry in `src-tauri/Cargo.lock`
- `src/lib/generated/app-version.ts`

The UI shows the app version in Settings. In Tauri, it reads the runtime version; in dev/web, it uses the generated fallback.

## Required Checks Before Release

Before shipping a build with database changes:

```sh
npm run check
npm run test:run
npm run build
```

Also test:

- creating a fresh empty database
- opening the previous production database and migrating it
- preserving owners, pets, medical records, vaccines, antiparasitic treatments, and settings
- pre-migration backup creation
- refusal of a future schema version
- SQLite import of every supported schema version
- CSV export/import schema metadata
- target Tauri build for the client platform

## Current Baseline

Schema `v1` is the first formal schema version. It represents the current SQLite structure at app version `0.2.0`, before future incremental migrations begin.
