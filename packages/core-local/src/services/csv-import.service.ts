import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '@vet/core-local/repositories/backup.repository.js';
import { closeDatabase, closeUserMediaDatabase, getDatabase } from '@vet/core-local/sqlite/client.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';
import { setBackupTargetPath } from './replication-backup.service.js';

interface CsvImportResult {
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
	if (response.safetyExportPath) await addBackupHistory(response.safetyExportPath, 'pre_import_backup');
	clearClientStateAfterDatabaseImport();
	if (response.replicationTargetPath) await setBackupTargetPath(response.replicationTargetPath);
	return {
		importedPath: response.path,
		safetyExportPath: response.safetyExportPath ?? '',
		replicationTargetPath: response.replicationTargetPath ?? ''
	};
}
