import Database from '@tauri-apps/plugin-sql';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import {
	copyExternalDatabaseToAppConfig,
	makeDatabaseCopyName,
	removeAppConfigFile,
	replaceDatabaseWithAppConfigFile
} from '$lib/native/database-file.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';

interface TableColumnRow {
	name: string;
}

interface DatabaseImportResult {
	importedPath: string;
	safetyBackupName: string;
}

async function tableHasColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${table})`);
	const names = new Set(rows.map((row) => row.name));
	return columns.every((column) => names.has(column));
}

async function validateDatabaseFile(fileName: string): Promise<void> {
	const databaseUrl = `sqlite:${fileName}`;
	const database = await Database.load(databaseUrl);
	try {
		const valid =
			(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information'])) &&
			(await tableHasColumns(database, 'owner_contacts', ['id', 'owner_id', 'kind', 'label', 'value'])) &&
			(await tableHasColumns(database, 'owner_additional_responsibles', ['id', 'owner_id', 'name', 'avatar_blob'])) &&
			(await tableHasColumns(database, 'owner_additional_responsible_contacts', ['id', 'responsible_id', 'kind', 'label', 'value'])) &&
			(await tableHasColumns(database, 'pets', ['id', 'name', 'species', 'breed'])) &&
			(await tableHasColumns(database, 'pet_owners', ['id', 'pet_id', 'owner_id'])) &&
			(await tableHasColumns(database, 'medical_records', ['id', 'pet_id', 'description', 'admitted_at', 'discharged_at'])) &&
			(await tableHasColumns(database, 'vaccines', ['id', 'name', 'normalized_name', 'hidden_at'])) &&
			(await tableHasColumns(database, 'vaccine_dose_types', ['id', 'name', 'normalized_name', 'requires_dose_number', 'sort_order', 'hidden_at'])) &&
			(await tableHasColumns(database, 'vaccine_validity_options', ['id', 'validity_value', 'validity_unit', 'sort_order', 'hidden_at'])) &&
			(await tableHasColumns(database, 'pet_vaccinations', ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose_type', 'dose_number', 'validity_value', 'validity_unit', 'validity_ignored_at'])) &&
			(await tableHasColumns(database, 'backup_history', ['id', 'path', 'kind', 'created_at']));

		if (!valid) throw new Error('database_schema_invalid');
	} finally {
		await database.close(databaseUrl);
	}
}

export async function importDatabase(title: string): Promise<DatabaseImportResult | null> {
	const selectedPath = await open({
		title,
		multiple: false,
		filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }]
	});

	if (!selectedPath || Array.isArray(selectedPath)) return null;

	const tempName = makeDatabaseCopyName('import-candidate');
	await copyExternalDatabaseToAppConfig(selectedPath, tempName);

	try {
		await validateDatabaseFile(tempName);
		await closeDatabase();
		const safetyBackupName = await replaceDatabaseWithAppConfigFile(tempName);
		await getDatabase();
		await addBackupHistory(selectedPath, 'import');
		if (safetyBackupName) await addBackupHistory(safetyBackupName, 'pre_import_backup');
		clearClientStateAfterDatabaseImport();
		return { importedPath: selectedPath, safetyBackupName: safetyBackupName ?? '' };
	} catch (error) {
		await removeAppConfigFile(tempName);
		throw error;
	}
}