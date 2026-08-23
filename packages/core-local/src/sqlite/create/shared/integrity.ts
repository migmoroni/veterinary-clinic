import type { Database } from './types.js';

interface IntegrityCheckRow {
	integrity_check: string;
}

interface ForeignKeyCheckRow {
	table: string;
	rowid: number;
	parent: string;
	fkid: number;
}

export async function validateDatabaseIntegrity(database: Database): Promise<void> {
	const integrityRows = await database.select<IntegrityCheckRow[]>('PRAGMA integrity_check');
	const integrityResult = integrityRows[0]?.integrity_check;
	if (integrityResult !== 'ok') throw new Error(`database_integrity_check_failed:${integrityResult ?? 'unknown'}`);

	const foreignKeyRows = await database.select<ForeignKeyCheckRow[]>('PRAGMA foreign_key_check');
	if (foreignKeyRows.length > 0) {
		const violation = foreignKeyRows[0];
		throw new Error(`database_foreign_key_check_failed:${violation.table}.${violation.rowid}->${violation.parent}`);
	}
}

