import { addBackupHistory, listBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { getSetting, setSetting } from '$lib/persistence/repositories/settings.repository.js';
import { copyDatabaseToAppConfigBackup } from '$lib/native/database-file.js';

const BACKUP_POLICY_INTERVAL_SETTING_KEY = 'backup.policyIntervalMinutes';
const LAST_AUTOMATIC_BACKUP_SETTING_KEY = 'backup.lastAutomaticBackupAt';

export const DEFAULT_BACKUP_POLICY_INTERVAL_MINUTES = 7 * 24 * 60;
export const AUTOMATIC_BACKUP_CHECK_INTERVAL_MS = 60 * 60 * 1000;
export const BACKUP_POLICY_INTERVAL_MINUTES = [
	...Array.from({ length: 24 }, (_, index) => (index + 1) * 60),
	...Array.from({ length: 6 }, (_, index) => (index + 2) * 24 * 60)
] as const;

let automaticBackupPromise: Promise<string | null> | null = null;

function normalizeBackupPolicyIntervalMinutes(value: unknown): number {
	const numericValue = typeof value === 'number' ? value : Number(value);
	return BACKUP_POLICY_INTERVAL_MINUTES.includes(numericValue as (typeof BACKUP_POLICY_INTERVAL_MINUTES)[number]) ? numericValue : DEFAULT_BACKUP_POLICY_INTERVAL_MINUTES;
}

function parseStoredDate(value: string | null): Date | null {
	if (!value) return null;
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? date : null;
}

function isAutomaticBackupDue(lastBackupAt: Date | null, intervalMinutes: number, now: Date): boolean {
	if (!lastBackupAt) return true;
	return now.getTime() - lastBackupAt.getTime() >= intervalMinutes * 60_000;
}

export async function getBackupHistory() {
	await getDatabase();
	return listBackupHistory();
}

export async function loadBackupPolicyIntervalMinutes(): Promise<number> {
	await getDatabase();
	return normalizeBackupPolicyIntervalMinutes(await getSetting(BACKUP_POLICY_INTERVAL_SETTING_KEY));
}

export async function saveBackupPolicyIntervalMinutes(intervalMinutes: number): Promise<number> {
	const normalizedInterval = normalizeBackupPolicyIntervalMinutes(intervalMinutes);
	await setSetting(BACKUP_POLICY_INTERVAL_SETTING_KEY, String(normalizedInterval));
	return normalizedInterval;
}

async function createAutomaticBackup(now: Date): Promise<string> {
	await closeDatabase();
	const path = await copyDatabaseToAppConfigBackup('automatic-backup-veterinary-clinic');
	await getDatabase();
	await addBackupHistory(path, 'automatic_backup');
	await setSetting(LAST_AUTOMATIC_BACKUP_SETTING_KEY, now.toISOString());
	return path;
}

export async function createAutomaticBackupIfDue(now = new Date()): Promise<string | null> {
	if (automaticBackupPromise) return automaticBackupPromise;

	automaticBackupPromise = (async () => {
		await getDatabase();
		const [intervalMinutes, lastBackupAt] = await Promise.all([
			loadBackupPolicyIntervalMinutes(),
			getSetting(LAST_AUTOMATIC_BACKUP_SETTING_KEY).then(parseStoredDate)
		]);

		if (!isAutomaticBackupDue(lastBackupAt, intervalMinutes, now)) return null;

		try {
			return await createAutomaticBackup(now);
		} catch (error) {
			await getDatabase().catch(() => undefined);
			throw error;
		}
	})().finally(() => {
		automaticBackupPromise = null;
	});

	return automaticBackupPromise;
}