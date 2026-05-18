# Build Targets

Current app version: `0.2.0`.

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

When changing version-to-version update rules for exported app databases, rebuild and run the exported database converter:

```sh
cd legacy-to-sqlite
npm run build:exported-db
npm run exported-db
```

`exported-db-to-sqlite.ts` reads a SQLite export from `legacy-to-sqlite/dist` and writes `legacy-to-sqlite/build/veterinary_clinic.db`. For `0.2.0`, it is a validated rebuild with no structural transformations.

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