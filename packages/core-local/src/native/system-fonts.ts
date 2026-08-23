import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from './platform.js';

export async function listSystemFonts(extraDirectories: string[] = []): Promise<string[]> {
	if (!isTauriRuntime()) return [];

	return invoke<string[]>('list_system_fonts', { extraDirectories });
}