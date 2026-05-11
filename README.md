# Veterinary Clinic

Local-first veterinary clinic app built with SvelteKit, Tailwind CSS and Tauri 2.

On first launch, the app asks whether to import an existing compatible SQLite database or start a new empty clinic database. After setup, the MVP opens directly on the latest medical record, supports global search, and includes real CRUD flows for owners, pets, medical records, and preset-based pet vaccinations, owner/pet profile screens, ViaCEP address lookup, a functional trash screen, and manual backup/export/import actions.

SQLite access goes through `tauri-plugin-sql`; the app does not depend on `rusqlite` directly.

The app uses a current canonical SQLite schema and intentionally keeps `PRAGMA user_version` at `0` while pre-launch. Legacy database adaptation is handled by `ods-to-sqlite`, which generates a compatible `veterinary_clinic.db` before import.

## Stack

- SvelteKit SPA with `adapter-static`
- Svelte 5 runes and TypeScript
- Tailwind CSS 4 with local shadcn-style components
- Tauri 2 desktop/mobile shell
- SQLite via `tauri-plugin-sql`
- Runtime SQLite database at `veterinary_clinic.db` in the Tauri app config directory

## Development

```sh
npm install
npm run dev
npm run tauri:dev
```

## Checks

```sh
npm run check
npm run test:run
npm run build
```

## Legacy import converter

```sh
cd ods-to-sqlite
npx tsc to-sqlite.ts --ignoreConfig
node to-sqlite.js
```

The converter reads `old-clinic.csv` and writes a compatible `veterinary_clinic.db` using the app's current schema. Legacy `TELEFONE` values become `owner_contacts.kind = 'phone'`, and `CELULAR` values become `owner_contacts.kind = 'mobile'`. Medical record periods are derived from dated entries in the legacy record text: the earliest valid date becomes `admitted_at`, and the latest valid date becomes `discharged_at` when there is more than one dated entry. When the same pet has repeated applications of the same vaccine preset, older applications are marked with `validity_ignored_at` so only the latest one contributes to due-date alerts and vaccine status analytics.

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
