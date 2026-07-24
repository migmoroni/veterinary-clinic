import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { getDatabase } from '$lib/persistence/sqlite/client.js';

interface PackageResponse {
	path: string;
	safetyBackupPath: string | null;
}

function timestampForFile(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function makeCsvExportZipName(): string {
	return `export-veterinary-clinic-csv-${timestampForFile()}.zip`;
}

export async function exportDatabaseAsCsv(title: string): Promise<string | null> {
	await getDatabase();
	const destinationPath = await save({
		title,
		defaultPath: makeCsvExportZipName(),
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!destinationPath) return null;

	const response = await invoke<PackageResponse>('export_user_csv_package', {
		request: { destinationPath }
	});
	await addBackupHistory(response.path, 'export');
	return response.path;
}
