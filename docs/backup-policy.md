# Backup Policy

The MVP stores all clinic data in a local SQLite file named `veterinary_clinic.db`.

Implemented behavior:

- Manual backup and export close the current SQL pool, checkpoint WAL when available, and copy `veterinary_clinic.db` through `tauri-plugin-fs`.
- First-run import copies the selected SQLite file into the app config directory, validates the required canonical tables, and opens it as the runtime database.
- Import over an existing database validates the selected file, closes the active SQL pool, creates a preventive local copy, and replaces the runtime database.
- Backup/import/export events are recorded in `backup_history`.
- Exported app databases can be used as input for the external version update pipeline in `legacy-to-sqlite/exported-db-to-sqlite.ts`.

Import contract:

- The main app expects imported databases to already use the current canonical schema.
- `PRAGMA user_version` is intentionally unused and remains `0` during the `0.2.0` single-client production test.
- Runtime migrations create the current schema and seed default vaccine data for new databases; they should not carry one-off compatibility rebuilds for earlier internal schemas unless explicitly requested.
- Legacy data must be converted before import. `legacy-to-sqlite/to-sqlite.ts` generates `veterinary_clinic.db` from the original CSV export with the current app tables, indexes, vaccine names, dose type catalogs, validity catalogs, and pet vaccination rows.
- Exported app databases should be rebuilt before reuse in future app versions with `legacy-to-sqlite/exported-db-to-sqlite.ts`. In `0.2.0`, this rebuild applies no structural transformations; it validates schema, runs SQLite integrity checks, and writes a clean `build/veterinary_clinic.db`.
- Vaccination rows store snapshots in `vaccine_name`, `vaccine_normalized_name`, `dose_type`, `dose_number`, `validity_value`, and `validity_unit`; new applications are created from the editable catalogs.
- Repeated applications of the same normalized vaccine name for the same pet should keep only the latest application active for due-date tracking. Older equivalent applications use `validity_ignored_at` and are excluded from due-date alerts and status analytics.

Planned follow-up behavior:

- Create an automatic backup at most once per day.
- Always create a preventive backup before permanently purging trash.
- Prefer `VACUUM INTO` through `tauri-plugin-sql` for consistent exports.