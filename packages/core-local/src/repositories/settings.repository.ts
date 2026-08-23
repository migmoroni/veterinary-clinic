import { FIELD_LIMITS, nullableLimitedText, requireLimitedText } from '@vet/types/domain/shared/field-limits.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { execute, selectOne } from '@vet/core-local/sqlite/client.js';

interface SettingRow {
	value: string | null;
}

export async function getSetting(key: string): Promise<string | null> {
	const row = await selectOne<SettingRow>('SELECT value FROM app_settings WHERE key = $1 AND removed_at IS NULL', [key]);
	return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
	const normalizedKey = requireLimitedText(key, FIELD_LIMITS.settingKey);
	const normalizedValue = nullableLimitedText(value, FIELD_LIMITS.settingValue) ?? '';
	const updatedAt = nowIso();
	await execute(
		`INSERT INTO app_settings (id, key, value, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $4)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, removed_at = NULL`,
		[createUuidV7(), normalizedKey, normalizedValue, updatedAt]
	);
}
