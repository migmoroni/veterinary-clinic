import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { addBackupHistory, type BackupKind } from '@vet/modules/core_repositories/backup.repository.js';
import { getDatabase } from '@vet/core-local/sqlite/client.js';

interface PackageResponse {
	path: string;
	safetyExportPath: string | null;
}

function timestampForFile(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function makeNativePackageName(prefix: string): string {
	return `${prefix}-${timestampForFile()}.zip`;
}

export async function exportDatabase(kind: Extract<BackupKind, 'manual_backup' | 'export'>, title: string): Promise<string | null> {
	await getDatabase();
	const defaultPath = makeNativePackageName(kind === 'manual_backup' ? 'backup-veterinary-clinic' : 'export-veterinary-clinic');
	const destinationPath = await save({
		title,
		defaultPath,
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!destinationPath) return null;

	const response = await invoke<PackageResponse>('export_user_native_package', {
		request: { destinationPath }
	});
	await addBackupHistory(response.path, kind);
	return response.path;
}
