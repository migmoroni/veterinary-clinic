import { getVersion } from '@tauri-apps/api/app';
import { APP_VERSION } from '$lib/generated/app-version.js';
import { isTauriRuntime } from '$lib/native/platform.js';

export async function loadAppVersion(): Promise<string> {
	if (!isTauriRuntime()) return APP_VERSION;

	try {
		return await getVersion();
	} catch {
		return APP_VERSION;
	}
}
