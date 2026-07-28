#!/usr/bin/env node
import { access, readdir, readFile, rm } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const tauriConfig = JSON.parse(await readFile(join(projectRoot, 'src-tauri', 'tauri.conf.json'), 'utf8'));
const appIdentifier = tauriConfig.identifier ?? 'app.veterinary-clinic.local';
const appName = tauriConfig.productName ?? 'Veterinary Clinic';

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

async function removeDirectoryContentsExcept(directoryPath, preservedNames = new Set(), preservedPrefixes = []) {
	let entries;
	try {
		entries = await readdir(directoryPath, { withFileTypes: true });
	} catch {
		return;
	}

	for (const entry of entries) {
		if (preservedNames.has(entry.name)) continue;
		if (preservedPrefixes.some((prefix) => entry.name.startsWith(prefix))) continue;
		await removeIfPresent(join(directoryPath, entry.name));
	}
}

const preservedUserOutputDirectories = new Set(['backups', 'exports', 'import_safety_exports']);
const preservedUserOutputPrefixes = [`${appName} - `];
const appConfigDir = join(appConfigRoot(), appIdentifier);
await removeDirectoryContentsExcept(appConfigDir, preservedUserOutputDirectories, preservedUserOutputPrefixes);

for (const root of appDataRoots()) {
	const appDataDir = join(root, appIdentifier);
	await removeDirectoryContentsExcept(appDataDir, preservedUserOutputDirectories, preservedUserOutputPrefixes);
}

for (const root of appCacheRoots()) {
	await removeDirectoryContentsExcept(join(root, appIdentifier), preservedUserOutputDirectories, preservedUserOutputPrefixes);
}

console.log(`[tauri:dev:new] clean local database and web storage state ready`);
