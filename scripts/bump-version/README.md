# Version Bump Script

This tool bumps the application version by semantic level and updates the release metadata used by the app and Linux packages.

Run it from the project root through pnpm:

```sh
pnpm version:bump -- <major|minor|patch> "Release note"
```

## Examples

Bump the patch version and add one changelog entry:

```sh
pnpm version:bump -- patch "Fix Linux package metadata"
```

Bump the minor version and add multiple changelog entries:

```sh
pnpm version:bump -- minor --change "Add vaccine protocols" --change "Improve backup exports"
```

Bump the major version with an explicit release date:

```sh
pnpm version:bump -- major --date 2026-07-09 "Prepare the first stable release"
```

If no release note is passed and the command is running in an interactive terminal, it prompts for one:

```sh
pnpm version:bump -- patch
```

## Arguments

- `major`: bumps `x.y.z` to `(x + 1).0.0`.
- `minor`: bumps `x.y.z` to `x.(y + 1).0`.
- `patch`: bumps `x.y.z` to `x.y.(z + 1)`.

## Options

- `--change`, `-c`, `--message`, `-m`: adds one release note. Repeat the option to add multiple notes.
- `--date YYYY-MM-DD`: sets the release date. Defaults to the current local date.

## Updated Files

The script updates these project files:

- `package.json`
- `apps/vet-app/package.json`
- `packages/*/package.json`
- `apps/vet-app/src-tauri/tauri.conf.json`
- `apps/vet-app/src-tauri/Cargo.toml`
- `packages/engine/Cargo.toml`
- `Cargo.lock`
- `packages/core-local/src/generated/app-version.ts`
- `CHANGELOG.md`
- `apps/vet-app/src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml`

## Module Layout

- `index.mjs`: orchestrates the version bump.
- `cli.mjs`: parses command-line arguments and prompts for release notes.
- `semver.mjs`: calculates the next version.
- `app-files.mjs`: updates app, Tauri, Cargo, and generated version files.
- `changelog.mjs`: prepends the release entry to the root changelog.
- `appstream.mjs`: prepends the release entry to AppStream metadata.
- `date.mjs`: formats local dates as `YYYY-MM-DD`.
- `io.mjs`: contains shared file IO helpers.
