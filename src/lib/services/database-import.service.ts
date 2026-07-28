import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, closeUserMediaDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';
import { setBackupTargetPath } from './replication-backup.service.js';

interface DatabaseImportResult {
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

async function finishImport(response: PackageResponse): Promise<DatabaseImportResult> {
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

export async function importDatabase(title: string): Promise<DatabaseImportResult | null> {
	const selectedPath = await open({
		title,
		multiple: false,
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!selectedPath || Array.isArray(selectedPath)) return null;

	const response = await invoke<PackageResponse>('import_user_native_package', {
		request: { sourcePath: selectedPath }
	});
	return finishImport(response);
}

export async function importDatabaseFromBackupFolder(title: string): Promise<DatabaseImportResult | null> {
	const selectedPath = await open({
		title,
		directory: true,
		multiple: false
	});

	if (!selectedPath || Array.isArray(selectedPath)) return null;

	const response = await invoke<PackageResponse>('import_user_native_package', {
		request: { sourcePath: selectedPath }
	});
	return finishImport(response);
}
