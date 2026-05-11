# Architecture

Veterinary Clinic is a local-first SvelteKit + Tauri 2 application. It uses a static SPA shell, Tailwind CSS, shadcn-style local UI components, and SQLite through `tauri-plugin-sql`.

The app does not depend on `rusqlite` directly. Data access flows through TypeScript services and repositories:

```text
UI -> stores -> services -> repositories -> tauri-plugin-sql -> SQLite
```

The runtime database is `sqlite:veterinary_clinic.db` in the Tauri app config directory. On first launch, the app detects that the file is missing and shows a setup screen with two choices: import an existing SQLite file or create a new empty database. Creating a new database uses the TypeScript schema setup through `tauri-plugin-sql`.

The app currently has no released database migration contract. `PRAGMA user_version` intentionally stays at `0`, and the main app expects imported databases to already follow the current canonical SQLite schema. Legacy adaptation belongs outside the runtime app: the `legacy-to-sqlite` tool converts the old clinic export into the canonical schema before import. While the product is pre-launch, schema changes should update both the schema setup and `legacy-to-sqlite`, instead of adding compatibility branches to the app.

Implemented workflows:

- Owner, pet, and medical record CRUD with profile/detail routes. Medical records store an attendance period with `admitted_at` and optional `discharged_at` instead of a single appointment date.
- Owners store one or more phone contacts in `owner_contacts`; each contact is typed as `phone` or `mobile` instead of using fixed phone columns on `owners`.
- ViaCEP lookup in owner forms to fill address, neighborhood, city, state, and postal code.
- Pet vaccination records based on required vaccine presets. A vaccination stores `vaccine_preset_id` as the stable reference and `vaccine_name` as a snapshot for display/history. Due-date tracking uses a single `validity_ignored_at` marker: the application code marks older equal applications when a booster is saved, and the same marker can be set manually when a different replacement vaccine should stop an old due-date alert.
- Soft delete for owners, pets, and medical records with a 90-day purge window.
- Trash restore, permanent delete, and expired-item purge actions.
- First-run database import/new database setup.
- Manual database backup/export/import using Tauri dialog/fs plugins and `tauri-plugin-sql` validation.

Main folders:

- `src/lib/domain` — TypeScript domain types and pure helpers.
- `src/lib/persistence/sqlite` — SQLite connection and current schema setup.
- `src/lib/persistence/repositories` — typed SQL repositories.
- `src/lib/services` — workflow services consumed by stores.
- `src/lib/stores` — Svelte 5 rune stores.
- `src/lib/native` — small wrappers around Tauri plugins.
- `src/lib/components/ui` — local shadcn-style primitives.
- `legacy-to-sqlite` — legacy clinic export converter that generates a compatible `veterinary_clinic.db` for app import.