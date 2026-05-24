import { save } from '@tauri-apps/plugin-dialog';
import { addBackupHistory, type BackupKind } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { copyDatabaseToPath, makeDatabaseCopyName } from '$lib/native/database-file.js';

export async function exportDatabase(kind: Extract<BackupKind, 'manual_backup' | 'export'>, title: string): Promise<string | null> {
	await getDatabase();
	const defaultPath = makeDatabaseCopyName(kind === 'manual_backup' ? 'backup-veterinary-clinic' : 'export-veterinary-clinic');
	const destinationPath = await save({
		title,
		defaultPath,
		filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }]
	});

	if (!destinationPath) return null;

	await closeDatabase();
	await copyDatabaseToPath(destinationPath);
	await addBackupHistory(destinationPath, kind);
	return destinationPath;
}