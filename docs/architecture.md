# Architecture

Veterinary Clinic is a local-first SvelteKit + Tauri 2 application. It uses a static SPA shell, Tailwind CSS, shadcn-style local UI components, and SQLite through `tauri-plugin-sql`.

The app does not depend on `rusqlite` directly. Data access flows through TypeScript services and repositories:

```text
UI -> stores -> services -> repositories -> tauri-plugin-sql -> SQLite
```

The runtime database is `sqlite:veterinary_clinic.db` in the Tauri app config directory. On first launch, the app detects that the file is missing and shows a setup screen with two choices: import an existing SQLite file or create a new local database. Creating a new database uses the current TypeScript schema setup through `tauri-plugin-sql`. Version `0.2.0` is the first single-client production test baseline.

The app currently has no multi-client database migration contract. `PRAGMA user_version` intentionally stays at `0` during the `0.2.0` single-client production test, and the main app expects imported databases to already follow the current canonical SQLite schema. Version-to-version data adaptation belongs outside the runtime app: `legacy-to-sqlite/to-sqlite.ts` converts the original CSV export, and `legacy-to-sqlite/exported-db-to-sqlite.ts` rebuilds an exported app SQLite database into a validated `build/veterinary_clinic.db`. Future schema update logic for production exports should be added to those external converters instead of adding compatibility branches to the app runtime migrations.

Implemented workflows:

- Owner, pet, and medical record CRUD with profile/detail routes. Medical records store an attendance period with `admitted_at` and optional `discharged_at` instead of a single appointment date.
- Owners store one or more phone contacts in `owner_contacts`; each contact is typed as `phone` or `mobile` instead of using fixed phone columns on `owners`.
- ViaCEP lookup in owner forms to fill street, neighborhood, city, state, and postal code. Owner countries are selected from an offline ISO country catalog in `src/lib/domain/geo/country-data` and stored as three-letter country codes. The catalog is organized as one file per country code, with labels keyed by locale for Portuguese, Guarani, English, Spanish variants, French variants, Italian variants, and German variants when available. Brazil is currently the only country with a full offline state/city catalog for structured state and city selection; countries without an offline subdivision/city catalog keep state and city as free text. Addresses are stored as `street`, `street_number`, and `address_complement`.
- Pet taxonomy stores species and breed as text fields. Canine/feline species and curated breed lists are canonical suggestions for UI, analytics labels, and validation, but the pet form also allows manual species and breed values for real-world cases not covered by the lists.
- Preventive records use editable name catalogs in `preventive_catalog_items` with separate `kind` values for vaccines and antiparasitics. Catalog items store target `species` and searchable `aliases` as JSON arrays, so professional item names such as `DHPPI+L` can also be found through generic or legacy terms such as `V10`. Vaccine and antiparasitic applications store free-text `dose` plus `validity_value` and `validity_unit` (`days`, `months`, or `years`). Optional presets live in `preventive_protocols`, `preventive_protocol_items`, and `preventive_protocol_doses`; protocols also store target `species`, and the application UI filters catalog/protocol choices by the current pet species while keeping application rows as historical snapshots. Vaccine due-date equivalence remains rooted in `vaccine_normalized_name`: when a new application of the same vaccine name is saved for a pet, older active applications are marked with `validity_ignored_at` so only the latest contributes to alerts and analytics.
- Local professional identity is stored as singleton rows in `veterinarian_profiles` and `workplaces`; the clinic address lives in `workplace_addresses`. The existing `owner_contacts` table is also the shared contact store for owners, additional responsibles, the veterinarian profile, and the workplace. A database check constraint requires exactly one parent per contact, and parent-specific unique constraints prevent duplicate contact rows. The app header displays the workplace name first, then the veterinarian name, then the built-in app name.
- Multiple images use the reusable `image_collections` and `image_collection_items` tables. Collections identify their owning domain entity through `entity_type` plus `entity_id` and store policy metadata separately from the image rows. Each item stores both the normalized uncropped source (`original_image_blob`) and the display-ready crop (`image_blob`), plus its optional description, display order, and primary flag. Keeping the processed source allows a saved image to be reframed later without repeatedly cropping an earlier crop. A partial unique index permits at most one primary item per collection. Domain repositories decide whether a primary image or item limit is required. The workplace collection requires one primary whenever it has images and allows at most nine, while future medical-record or exam collections can use no limit and no required primary without changing the tables or capture dialog.
- Soft delete for owners, pets, medical records, preventive applications, and preventive protocols with a 90-day purge window.
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
- `legacy-to-sqlite` — external database conversion tools. `to-sqlite.ts` converts the original legacy CSV; `exported-db-to-sqlite.ts` rebuilds an exported app SQLite database for import into the current app version.
