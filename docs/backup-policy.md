# Backup Policy

The MVP stores all clinic data in a local SQLite file named `veterinary_clinic.db`.

Implemented behavior:

- Manual backup and export close the current SQL pool, checkpoint WAL when available, and copy `veterinary_clinic.db` through `tauri-plugin-fs`.
- First-run import copies the selected SQLite file into the app config directory, validates whether it is supported by the schema migrator, and opens it as the runtime database.
- Import over an existing database validates the selected file, closes the active SQL pool, creates a preventive local copy, and replaces the runtime database.
- When opening a database that needs adoption or migration, the app creates a local pre-migration backup at `AppConfig/backups/pre-migration-veterinary-clinic-<timestamp>.db` before changing the database.
- Backup/import/export events are recorded in `backup_history`.
- Runtime migrations run inside a transaction and finish with `PRAGMA integrity_check` and `PRAGMA foreign_key_check`.

Import contract:

- `PRAGMA user_version` is the official SQLite schema version.
- The baseline current schema is `v1`.
- A current unversioned database can be adopted as `v1`.
- A supported older versioned database is migrated sequentially to the current schema.
- A future schema version is refused so an older app does not corrupt newer data.
- An unknown unversioned database is refused.
- Runtime migrations should not carry one-off compatibility rebuilds for external legacy formats.
- Vaccination rows store snapshots in `vaccine_name`, `vaccine_normalized_name`, `dose`, `validity_value`, and `validity_unit` (`days`, `months`, or `years`); optional protocols only prefill application fields and do not replace the saved row data.
- Repeated applications of the same normalized vaccine name for the same pet should keep only the latest application active for due-date tracking. Older equivalent applications use `validity_ignored_at` and are excluded from due-date alerts and status analytics.

For schema migration rules and the release checklist, see [Database Versioning And Release Ritual](database-versioning.md).
