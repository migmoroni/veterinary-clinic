import { execute, selectOne } from '$lib/persistence/sqlite/client.js';

interface SettingRow {
	value: string | null;
}

export async function getSetting(key: string): Promise<string | null> {
	const row = await selectOne<SettingRow>('SELECT value FROM app_settings WHERE key = $1', [key]);
	return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	await execute(
		`INSERT INTO app_settings (key, value, updated_at)
		 VALUES ($1, $2, CURRENT_TIMESTAMP)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
		[key, value]
	);
}