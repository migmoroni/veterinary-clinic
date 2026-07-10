# Veterinary Clinic

Local-first veterinary clinic app built with SvelteKit, Tailwind CSS and Tauri 2.

On first launch, the app asks whether to import an existing compatible SQLite database or start a new clinic database with the current preventive catalog schema. After setup, the MVP opens directly on the latest medical record, supports global search, and includes real CRUD flows for owners, pets, medical records, catalog-assisted pet vaccinations and antiparasitic treatments, owner/pet profile screens, ViaCEP address lookup, a functional trash screen, and manual backup/export/import actions.

SQLite access goes through `tauri-plugin-sql`; the app does not depend on `rusqlite` directly.

The app uses versioned SQLite runtime migrations. `PRAGMA user_version` stores the schema version, `schema_migrations` records applied migrations, and the current baseline schema is `v1`. See [docs/database-versioning.md](docs/database-versioning.md) for the migration and release ritual.

## Stack

- SvelteKit SPA with `adapter-static`
- Svelte 5 runes and TypeScript
- Tailwind CSS 4 with local shadcn-style components
- Tauri 2 desktop/mobile shell
- SQLite via `tauri-plugin-sql`
- Runtime SQLite database at `veterinary_clinic.db` in the Tauri app config directory

## Development

For the current Linux development environment on Debian 13, see [docs/development-debian13.md](docs/development-debian13.md).

```sh
npm install
npm run dev
npm run tauri:dev
npm run tauri:dev:new
```

Use `npm run tauri:dev:new` to remove the local development SQLite state and WebView storage, wait one second, and then start the normal `tauri:dev` flow.

## Checks

```sh
npm run check
npm run test:run
npm run build
```

When changing the SQLite schema, add an incremental runtime migration and use the version bump script with the semantic level and release note:

```sh
npm run version:bump -- minor "Add runtime schema migration for vaccine protocols"
```

The version bump script calculates the next `major`, `minor`, or `patch` version and updates package metadata, the generated app version, the root changelog, and the AppStream release metadata used by Linux software centers. Use repeated `--change` flags when a release needs multiple changelog bullets.

## External database converters

### Legacy CSV converter

```sh
cd legacy-to-sqlite
npm run build:csv
npm run csv
```

The converter reads `legacy-to-sqlite/dist/old-clinic.csv` and writes `legacy-to-sqlite/build/veterinary_clinic.db` using the app's current canonical schema. Legacy `TELEFONE` values become `contacts.kind = 'phone'`, and `CELULAR` values become `contacts.kind = 'mobile'`. Medical record periods are derived from dated entries in the legacy record text: the earliest valid date becomes `admitted_at`, and the latest valid date becomes `discharged_at` when there is more than one dated entry. Legacy vaccination rows are imported with vaccine names plus dose and validity snapshots backed by the editable catalogs.

### Exported app database rebuild

```sh
cd legacy-to-sqlite
npm run build:exported-db
npm run exported-db
```

The rebuild converter reads an exported SQLite database from `legacy-to-sqlite/dist` and writes a validated `legacy-to-sqlite/build/veterinary_clinic.db`. If there is more than one `.db`, `.sqlite`, or `.sqlite3` file in `dist`, pass the source explicitly: `npm run exported-db -- --source dist/exported.db`. A bare filename such as `--source exported.db` is resolved inside `dist` when present. These tools are for external data preparation; normal app schema upgrades belong to the runtime migration system documented in `docs/database-versioning.md`.

## Desktop bundles

```sh
npm run tauri:appimage
npm run tauri:deb
npm run tauri:msi
```

## Android

```sh
npm run tauri:android:dev
npm run tauri:android:build
```
