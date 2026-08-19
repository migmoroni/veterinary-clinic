import { appDataDir } from '@tauri-apps/api/path';
import { BaseDirectory, copyFile, exists, mkdir, remove, rename } from '@tauri-apps/plugin-fs';
import { isTauriRuntime } from './platform.js';

export const USER_DATABASE_FILE = 'veterinary_clinic_user.db';
export const SYSTEM_DATABASE_FILE = 'veterinary_clinic_system.db';
export const USER_MEDIA_DATABASE_FILE = 'veterinary_clinic_user_media.db';
export const SYSTEM_MEDIA_DATABASE_FILE = 'veterinary_clinic_system_media.db';
export const DATABASE_FILE = USER_DATABASE_FILE;
export const DATABASE_DIRECTORY = 'databases';

const DATABASE_BACKUP_DIRECTORY = `${DATABASE_DIRECTORY}/backups`;

function databasePath(fileName: string): string {
	return `${DATABASE_DIRECTORY}/${fileName}`;
}

function timestampForFile(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

export async function hasDatabaseFile(): Promise<boolean> {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}

	return exists(databasePath(DATABASE_FILE), { baseDir: BaseDirectory.AppData });
}

export async function hasSystemDatabaseFile(): Promise<boolean> {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}

	return exists(databasePath(SYSTEM_DATABASE_FILE), { baseDir: BaseDirectory.AppData });
}

export async function ensureDatabaseDirectory(): Promise<void> {
	if (!isTauriRuntime()) {
		throw new Error('Tauri runtime required for the local SQLite database.');
	}

	await mkdir(DATABASE_DIRECTORY, { baseDir: BaseDirectory.AppData, recursive: true });
}

export async function requireDatabaseFile(): Promise<void> {
	if (await hasDatabaseFile()) return;

	throw new Error('database_missing');
}

export function makeDatabaseCopyName(prefix: string): string {
	return `${prefix}-${timestampForFile()}.db`;
}

export async function copyDatabaseToPath(destinationPath: string): Promise<void> {
	await requireDatabaseFile();
	await copyFile(databasePath(DATABASE_FILE), destinationPath, { fromPathBaseDir: BaseDirectory.AppData });
}

export async function copyDatabaseToBackup(prefix: string): Promise<string> {
	await requireDatabaseFile();
	await mkdir(DATABASE_BACKUP_DIRECTORY, { baseDir: BaseDirectory.AppData, recursive: true });

	const fileName = makeDatabaseCopyName(prefix);
	const relativePath = `${DATABASE_BACKUP_DIRECTORY}/${fileName}`;
	await copyFile(databasePath(DATABASE_FILE), relativePath, {
		fromPathBaseDir: BaseDirectory.AppData,
		toPathBaseDir: BaseDirectory.AppData
	});

	const dataDir = await appDataDir();
	return `${dataDir.replace(/\/$/, '')}/${relativePath}`;
}

export async function copyExternalDatabaseToDatabaseDirectory(sourcePath: string, targetName: string): Promise<void> {
	await ensureDatabaseDirectory();
	await copyFile(sourcePath, databasePath(targetName), { toPathBaseDir: BaseDirectory.AppData });
}

export async function removeDatabaseFile(fileName: string): Promise<void> {
	const path = databasePath(fileName);
	if (await exists(path, { baseDir: BaseDirectory.AppData })) {
		await remove(path, { baseDir: BaseDirectory.AppData });
	}
}

export async function replaceDatabaseWithFile(fileName: string): Promise<string | null> {
	let safetyBackupName: string | null = null;
	const activeDatabasePath = databasePath(DATABASE_FILE);

	if (await exists(activeDatabasePath, { baseDir: BaseDirectory.AppData })) {
		safetyBackupName = makeDatabaseCopyName('pre-import-veterinary-clinic');
		await copyFile(activeDatabasePath, databasePath(safetyBackupName), {
			fromPathBaseDir: BaseDirectory.AppData,
			toPathBaseDir: BaseDirectory.AppData
		});
		await remove(activeDatabasePath, { baseDir: BaseDirectory.AppData });
	}

	await rename(databasePath(fileName), activeDatabasePath, {
		oldPathBaseDir: BaseDirectory.AppData,
		newPathBaseDir: BaseDirectory.AppData
	});

	return safetyBackupName;
}
