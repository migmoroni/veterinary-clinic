import { appConfigDir, dirname, isAbsolute } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from './platform.js';

function looksLikeFilePath(path: string): boolean {
	const leaf = path.replace(/\\/g, '/').split('/').pop() ?? '';
	return /\.[^./\\]+$/.test(leaf);
}

async function directoryForDisplayPath(path: string): Promise<string> {
	const trimmedPath = path.trim();
	if (!trimmedPath) throw new Error('path_empty');

	if (!(await isAbsolute(trimmedPath))) return appConfigDir();
	return looksLikeFilePath(trimmedPath) ? dirname(trimmedPath) : trimmedPath;
}

export async function openInFileManager(path: string): Promise<void> {
	if (!isTauriRuntime()) throw new Error('Tauri runtime required to open local paths.');

	await invoke('open_file_manager', { path: await directoryForDisplayPath(path) });
}
