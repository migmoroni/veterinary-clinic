import { FIELD_LIMITS, requireLimitedText } from '@vet/types/domain/shared/field-limits.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { execute, selectMany } from '@vet/core-local/sqlite/client.js';

export type BackupKind = 'manual_backup' | 'export' | 'import' | 'pre_import_backup';

export interface BackupHistoryItem {
	id: string;
	path: string;
	kind: BackupKind;
	createdAt: string;
}

interface BackupHistoryRow {
	id: string;
	path: string;
	kind: BackupKind;
	created_at: string;
}

export async function addBackupHistory(path: string, kind: BackupKind): Promise<void> {
	const createdAt = nowIso();
	await execute('INSERT INTO backup_history (id, path, kind, created_at, updated_at) VALUES ($1, $2, $3, $4, $4)', [
		createUuidV7(),
		requireLimitedText(path, FIELD_LIMITS.backupPath),
		requireLimitedText(kind, FIELD_LIMITS.backupKind),
		createdAt
	]);
}

export async function listBackupHistory(limit = 20): Promise<BackupHistoryItem[]> {
	const rows = await selectMany<BackupHistoryRow>(
		`SELECT id, path, kind, created_at
		 FROM backup_history
		 WHERE removed_at IS NULL
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
