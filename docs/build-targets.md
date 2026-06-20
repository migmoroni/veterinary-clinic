# Build Targets

Current app version: `0.2.0`.

Schema migration and release rules are documented in [Database Versioning And Release Ritual](database-versioning.md).

## Development

```sh
npm run dev
npm run tauri:dev
```

## Checks

```sh
npm run check
npm run test:run
npm run build
```

When changing the canonical SQLite schema or import rules, also rebuild the legacy converter:

```sh
cd legacy-to-sqlite
npm run build:csv
```

The generated `to-sqlite.js` is the script used to create a compatible `veterinary_clinic.db` from the legacy clinic export.

When changing the runtime SQLite schema, add a new app migration, increment `CURRENT_SCHEMA_VERSION`, and bump the public app version:

```sh
npm run version:bump -- 2.1.0
npm run check
npm run test:run
npm run build
```

Before release, also test migration from the previous production database and run the target Tauri bundle for the client platform.

## Desktop bundles

```sh
npm run tauri:appimage
npm run tauri:deb
npm run tauri:msi
```

The MSI bundle should be produced on Windows or a compatible CI runner.

## Android

Android is planned through Tauri Android:

```sh
npm run tauri:android:dev
npm run tauri:android:build
```

Run `tauri android init` after the desktop build is healthy and the Android SDK is configured.
