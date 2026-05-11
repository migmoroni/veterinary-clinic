import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type BackupKind = 'manual_backup' | 'export' | 'import' | 'pre_import_backup';

export interface BackupHistoryItem {
	id: number;
	path: string;
	kind: BackupKind;
	createdAt: string;
}

interface BackupHistoryRow {
	id: number;
	path: string;
	kind: BackupKind;
	created_at: string;
}

export async function addBackupHistory(path: string, kind: BackupKind): Promise<void> {
	await execute('INSERT INTO backup_history (path, kind) VALUES ($1, $2)', [path, kind]);
}

export async function listBackupHistory(limit = 20): Promise<BackupHistoryItem[]> {
	const rows = await selectMany<BackupHistoryRow>(
		`SELECT id, path, kind, created_at
		 FROM backup_history
		 ORDER BY created_at DESC, id DESC
		 LIMIT $1`,
		[limit]
	);

	return rows.map((row) => ({
		id: row.id,
		path: row.path,
		kind: row.kind,
		createdAt: row.created_at
	}));
}