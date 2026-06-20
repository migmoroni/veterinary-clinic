import Database from '@tauri-apps/plugin-sql';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { assertDatabaseCanMigrate } from '$lib/persistence/sqlite/migrations.js';
import {
	copyExternalDatabaseToAppConfig,
	makeDatabaseCopyName,
	removeAppConfigFile,
	replaceDatabaseWithAppConfigFile
} from '$lib/native/database-file.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';

interface DatabaseImportResult {
	importedPath: string;
	safetyBackupName: string;
}

async function validateDatabaseFile(fileName: string): Promise<void> {
	const databaseUrl = `sqlite:${fileName}`;
	const database = await Database.load(databaseUrl);
	try {
		await assertDatabaseCanMigrate(database);
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
