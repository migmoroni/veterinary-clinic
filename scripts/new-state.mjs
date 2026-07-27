#!/usr/bin/env node
import { access, readFile, rm } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const tauriConfig = JSON.parse(await readFile(join(projectRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const appIdentifier = tauriConfig.identifier ?? 'app.veterinary-clinic.local';
const databaseFiles = (tauriConfig.plugins?.sql?.preload ?? [])
	.filter((item) => typeof item === 'string' && item.startsWith('sqlite:'))
	.map((item) => item.replace(/^sqlite:/, ''));
if (databaseFiles.length === 0) {
	databaseFiles.push('veterinary_clinic_user.db');
	databaseFiles.push('veterinary_clinic_user_media.db');
	
	databaseFiles.push('veterinary_clinic_system.db');
	databaseFiles.push('veterinary_clinic_system_media.db');

	databaseFiles.push('veterinary_clinic_user_logs.db');
}

function appConfigRoot() {
	if (platform() === 'win32') return process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
	if (platform() === 'darwin') return join(homedir(), 'Library', 'Application Support');
	return process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
}

function appDataRoots() {
	if (platform() === 'win32') {
		return [process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')];
	}

	if (platform() === 'darwin') return [join(homedir(), 'Library', 'Application Support')];
	return [process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')];
}

function appCacheRoots() {
	if (platform() === 'win32') return [process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')];
	if (platform() === 'darwin') return [join(homedir(), 'Library', 'Caches')];
	return [process.env.XDG_CACHE_HOME || join(homedir(), '.cache')];
}

async function removeIfPresent(filePath) {
	let existed = true;
	try {
		await access(filePath);
	} catch {
		existed = false;
	}

	await rm(filePath, { force: true, recursive: true });
	if (existed) console.log(`[tauri:dev:new] removed ${filePath}`);
}

const appConfigDir = join(appConfigRoot(), appIdentifier);
for (const databaseFile of databaseFiles) {
	for (const fileName of [databaseFile, `${databaseFile}-wal`, `${databaseFile}-shm`, `${databaseFile}-journal`]) {
		await removeIfPresent(join(appConfigDir, fileName));
	}
}

const webStorageNames = ['localstorage', 'Local Storage', 'Session Storage', 'IndexedDB', 'databases', 'CacheStorage', 'Service Worker', 'blob_storage'];
for (const root of appDataRoots()) {
	const appDataDir = join(root, appIdentifier);
	for (const name of webStorageNames) {
		await removeIfPresent(join(appDataDir, name));
	}
}

for (const root of appCacheRoots()) {
	await removeIfPresent(join(root, appIdentifier));
}

console.log(`[tauri:dev:new] clean local database and web storage state ready`);
