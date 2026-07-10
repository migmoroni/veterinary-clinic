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
npm run version:bump -- minor "Add runtime schema migration for vaccine protocols"
npm run check
npm run test:run
npm run build
```

The version bump script calculates the next `major`, `minor`, or `patch` version. It also prepends a release entry to `CHANGELOG.md` and to the AppStream metainfo used by Linux package viewers. Use repeated `--change` flags for multiple release notes.

Before release, also test migration from the previous production database and run the target Tauri bundle for the client platform.

## Desktop bundles

```sh
npm run tauri:appimage
npm run tauri:deb
npm run tauri:flatpak
npm run tauri:msi
```

Flatpak support is implemented with `flatpak-builder`, not a native Tauri bundle target. See `flatpak/README.md` for required runtimes and local install commands.

The MSI bundle should be produced on Windows or a compatible CI runner.

Linux bundles include a desktop entry, AppStream metainfo, license files, and the root changelog as package metadata.

## Android

Android is planned through Tauri Android:

```sh
npm run tauri:android:dev
npm run tauri:android:build
```

Run `tauri android init` after the desktop build is healthy and the Android SDK is configured.
