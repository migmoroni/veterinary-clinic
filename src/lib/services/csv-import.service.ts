import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, closeUserMediaDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';
import { setBackupTargetPath } from './replication-backup.service.js';

interface CsvImportResult {
	importedPath: string;
	safetyBackupName: string;
	backupTargetPath: string;
}

interface PackageResponse {
	path: string;
	safetyBackupPath: string | null;
	backupTargetPath: string | null;
}

async function reopenUserStorageAfterImport(): Promise<void> {
	await closeDatabase();
	await closeUserMediaDatabase();
	await getDatabase();
}

export async function importDatabaseFromCsv(title: string): Promise<CsvImportResult | null> {
	const selectedPath = await open({
		title,
		multiple: false,
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!selectedPath || Array.isArray(selectedPath)) return null;

	const response = await invoke<PackageResponse>('import_user_csv_package', {
		request: { sourcePath: selectedPath }
	});
	await reopenUserStorageAfterImport();
	await addBackupHistory(response.path, 'import');
	if (response.safetyBackupPath) await addBackupHistory(response.safetyBackupPath, 'pre_import_backup');
	clearClientStateAfterDatabaseImport();
	if (response.backupTargetPath) await setBackupTargetPath(response.backupTargetPath);
	return {
		importedPath: response.path,
		safetyBackupName: response.safetyBackupPath ?? '',
		backupTargetPath: response.backupTargetPath ?? ''
	};
}
