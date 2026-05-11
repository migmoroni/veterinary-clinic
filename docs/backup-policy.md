# Backup Policy

The MVP stores all clinic data in a local SQLite file named `veterinary_clinic.db`.

Implemented behavior:

- Manual backup and export close the current SQL pool, checkpoint WAL when available, and copy `veterinary_clinic.db` through `tauri-plugin-fs`.
- First-run import copies the selected SQLite file into the app config directory, validates the required canonical tables, and opens it as the runtime database.
- Import over an existing database validates the selected file, closes the active SQL pool, creates a preventive local copy, and replaces the runtime database.
- Backup/import/export events are recorded in `backup_history`.

Import contract:

- The main app expects imported databases to already use the current canonical schema.
- `PRAGMA user_version` is intentionally unused and remains `0` while the app is pre-launch.
- Legacy data must be converted before import. The supported converter is `legacy-to-sqlite`, which generates `veterinary_clinic.db` with the app tables, indexes, vaccine presets, and pet vaccination rows.
- Vaccination rows must reference an existing vaccine preset through `vaccine_preset_id`; free-text vaccinations are not valid in the canonical schema.
- Repeated applications of the same vaccine preset for the same pet should keep only the latest application active for due-date tracking. Older equivalent applications use `validity_ignored_at` and are excluded from due-date alerts and status analytics.

Planned follow-up behavior:

- Create an automatic backup at most once per day.
- Always create a preventive backup before permanently purging trash.
- Prefer `VACUUM INTO` through `tauri-plugin-sql` for consistent exports.