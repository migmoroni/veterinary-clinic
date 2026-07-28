# Veterinary Clinic

[Portuguese README](README.pt-BR.md) | English

Veterinary Clinic is a local-first desktop application for veterinary clinic
workflows. It is built with SvelteKit, Tauri 2, Rust and SQLite, with the data
model moving toward durable offline ownership, explicit import/export, and
continuous replication through small SQLite changesets.

The project is developer-facing and under active development. The current public
application version is `0.2.0`.

## What This Project Is About

Veterinary Clinic focuses on keeping clinical data usable without depending on a
remote service:

- owners, pets and medical records live in local SQLite databases;
- reference catalogs are separated from user-owned operational data;
- original media files are stored through content-addressable storage instead of
  operational SQLite BLOB columns;
- full import/export is handled as a distribution concern;
- continuous backup and synchronization are handled as replication patches.

## Architecture Snapshot

```text
Svelte UI -> TypeScript services -> Tauri commands -> Rust -> SQLite + CAS
```

The persistence boundary is intentionally split into three Rust modules:

| Module | Responsibility |
| --- | --- |
| `storage` | Active SQLite connections, database paths, CAS files and low-level primitives. |
| `distribution` | Complete native/CSV import and export packages. |
| `replication` | Continuous local-first backup and synchronization through patches. |

## Stack

| Layer | Technology |
| --- | --- |
| UI | Svelte 5, SvelteKit, TypeScript |
| Styling | Tailwind CSS 4 and local component primitives |
| Shell | Tauri 2 |
| Native layer | Rust |
| Database | SQLite through `rusqlite` |
| Media storage | CAS files on disk plus SQLite media indexes |
| Tests/checks | Vitest, `svelte-check`, Cargo |

## Quick Start

```sh
npm ci
npm run tauri:dev
```

For a clean development state:

```sh
npm run tauri:dev:new
```

## Common Checks

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Desktop bundles:

```sh
npm run tauri:appimage
npm run tauri:deb
npm run tauri:flatpak
npm run tauri:msi
```

## Documentation

Detailed architecture documentation is currently maintained in Portuguese only.
Start with [README.pt-BR.md](README.pt-BR.md).

English documentation for the full architecture map is still to do.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE.md](LICENSE.md).
