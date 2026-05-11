import { appConfigDir } from '@tauri-apps/api/path';
import { BaseDirectory, copyFile, exists, mkdir, remove, rename } from '@tauri-apps/plugin-fs';
import { isTauriRuntime } from './platform.js';

export const DATABASE_FILE = 'veterinary_clinic.db';

export const DATABASE_URL = `sqlite:${DATABASE_FILE}`;

function timestampForFile(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function hasDatabaseFile(): Promise<boolean> {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}

	return exists(DATABASE_FILE, { baseDir: BaseDirectory.AppConfig });
}

export async function ensureDatabaseDirectory(): Promise<void> {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}

	const configDir = await appConfigDir();
	await mkdir(configDir, { recursive: true });
}

export async function requireDatabaseFile(): Promise<string> {
	if (await hasDatabaseFile()) return DATABASE_URL;

	throw new Error('database_missing');
}

export function makeDatabaseCopyName(prefix: string): string {
	return `${prefix}-${timestampForFile()}.db`;
}

export async function copyDatabaseToPath(destinationPath: string): Promise<void> {
	await requireDatabaseFile();
	await copyFile(DATABASE_FILE, destinationPath, { fromPathBaseDir: BaseDirectory.AppConfig });
}

export async function copyExternalDatabaseToAppConfig(sourcePath: string, targetName: string): Promise<void> {
	await copyFile(sourcePath, targetName, { toPathBaseDir: BaseDirectory.AppConfig });
}

export async function removeAppConfigFile(fileName: string): Promise<void> {
	if (await exists(fileName, { baseDir: BaseDirectory.AppConfig })) {
		await remove(fileName, { baseDir: BaseDirectory.AppConfig });
	}
}

export async function replaceDatabaseWithAppConfigFile(fileName: string): Promise<string | null> {
	let safetyBackupName: string | null = null;

	if (await exists(DATABASE_FILE, { baseDir: BaseDirectory.AppConfig })) {
		safetyBackupName = makeDatabaseCopyName('pre-import-veterinary-clinic');
		await copyFile(DATABASE_FILE, safetyBackupName, {
			fromPathBaseDir: BaseDirectory.AppConfig,
			toPathBaseDir: BaseDirectory.AppConfig
		});
		await remove(DATABASE_FILE, { baseDir: BaseDirectory.AppConfig });
	}

	await rename(fileName, DATABASE_FILE, {
		oldPathBaseDir: BaseDirectory.AppConfig,
		newPathBaseDir: BaseDirectory.AppConfig
	});

	return safetyBackupName;
}