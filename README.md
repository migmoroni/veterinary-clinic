# Veterinary Clinic

[Portuguese README](README.pt-BR.md) | English

Veterinary Clinic is a local-first desktop application for veterinary clinic
workflows. It is built with SvelteKit, Tauri 2, Rust and SQLite, with a data
model designed for durable offline ownership, explicit import/export, and
continuous replication through small SQLite changesets.

The project is developer-facing and under active development. The current public
application version is `0.2.0`.

## What This Project Is About

Veterinary Clinic focuses on keeping clinical data usable without depending on a
remote service:

- owners, pets and medical records live in local SQLite databases;
- reference catalogs are separated from user-owned operational data;
- analytics and search live as reusable headless application services;
- original media files are stored through content-addressable storage instead of
  operational SQLite BLOB columns;
- full import/export is handled as a distribution concern;
- continuous backup and synchronization are handled as replication patches.

## Architecture Snapshot

```text
apps/vet-app -> (@vet/app-services, @vet/modules, @vet/ui) -> @vet/core-local -> Tauri commands -> vet-engine -> SQLite + CAS
```

The workspace is intentionally split by runtime boundary:

| Package | Responsibility |
| --- | --- |
| `apps/vet-app` | SvelteKit/Tauri shell, routes and cross-module composition. |
| `packages/types` | Pure domain contracts and data rules. |
| `packages/core-local` | Local TypeScript runtime, SQLite bridge, i18n, preferences, import/export clients and media repositories. |
| `packages/ui` | Reusable Svelte UI primitives. |
| `packages/modules` | Business modules: `knowledge`, `registry` and `medical_records`. |
| `packages/app-services` | Headless application services: `analytics` and `search`. |
| `packages/engine` | Native product engine for storage, distribution, replication and platform integrations. |

The TypeScript dependency DAG is:

```text
@vet/types <- @vet/core-local <- @vet/ui <- @vet/modules <- @vet/app-services <- apps/vet-app
```

Each item imports only packages to its left. `@vet/app-services` stays headless:
no UI, routes, Svelte stores or app-local `$lib` imports.

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
nvm use
pnpm install --frozen-lockfile
pnpm tauri:dev
```

For a clean development state:

```sh
pnpm tauri:dev:new
```

## Common Checks

```sh
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

Desktop bundles:

```sh
pnpm tauri:appimage
pnpm tauri:deb
pnpm tauri:flatpak
pnpm tauri:msi
```

## Documentation

Detailed architecture documentation is currently maintained in Portuguese only.
Start with [README.pt-BR.md](README.pt-BR.md) and
[docs/modular-architecture.md](docs/modular-architecture.md).

English documentation for the full architecture map is still to do.

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [LICENSE.md](LICENSE.md).
