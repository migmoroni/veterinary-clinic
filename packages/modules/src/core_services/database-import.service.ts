import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '@vet/modules/core_repositories/backup.repository.js';
import { closeDatabase, closeUserMediaDatabase, getDatabase } from '@vet/core-local/sqlite/client.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';
import { setBackupTargetPath } from './replication-backup.service.js';

interface DatabaseImportResult {
	importedPath: string;
	safetyExportPath: string;
	replicationTargetPath: string;
}

interface PackageResponse {
	path: string;
	safetyExportPath: string | null;
	replicationTargetPath: string | null;
}

async function reopenUserStorageAfterImport(): Promise<void> {
	await closeDatabase();
	await closeUserMediaDatabase();
	await getDatabase();
}

async function finishImport(response: PackageResponse): Promise<DatabaseImportResult> {
	await reopenUserStorageAfterImport();
	await addBackupHistory(response.path, 'import');
	if (response.safetyExportPath) await addBackupHistory(response.safetyExportPath, 'pre_import_backup');
	clearClientStateAfterDatabaseImport();
	if (response.replicationTargetPath) await setBackupTargetPath(response.replicationTargetPath);
	return {
		importedPath: response.path,
		safetyExportPath: response.safetyExportPath ?? '',
		replicationTargetPath: response.replicationTargetPath ?? ''
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
