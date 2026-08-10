import type { Database, UserVersionRow } from './types.js';

export async function getUserVersion(database: Database): Promise<number> {
	const rows = await database.select<UserVersionRow[]>('PRAGMA user_version');
	return Number(rows[0]?.user_version ?? 0);
}

export async function setUserVersion(database: Database, version: number): Promise<void> {
	if (!Number.isInteger(version) || version < 0) throw new Error(`database_schema_invalid_version:${version}`);
	await database.execute(`PRAGMA user_version = ${version}`);
}

