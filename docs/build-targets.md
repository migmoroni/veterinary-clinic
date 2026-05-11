# Build Targets

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
cd ods-to-sqlite
npx tsc to-sqlite.ts --ignoreConfig
```

The generated `to-sqlite.js` is the script used to create a compatible `veterinary_clinic.db` from the legacy clinic export.

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