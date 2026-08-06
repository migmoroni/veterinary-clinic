import { hasDatabaseFile } from '@vet/core-local/native/database-file.js';
import { createEmptyDatabase, getDatabase } from '@vet/core-local/sqlite/client.js';
import type { ClinicAnalyticsOverview } from '@vet/app-services/analytics';
import { loadClinicAnalyticsOverview } from '@vet/app-services/analytics';
import { importDatabase } from '@vet/core-local/services/database-import.service.js';
import { loadLocalePreference } from '@vet/core-local/services/preferences.service.js';
import { requestPracticeIdentityRefresh } from '@vet/modules/registry';

export type ClinicDashboard = ClinicAnalyticsOverview;

export async function initializeClinic(): Promise<void> {
	await getDatabase();
	await loadLocalePreference();
}

export async function hasClinicDatabase(): Promise<boolean> {
	return hasDatabaseFile();
}

export async function createNewClinicDatabase(): Promise<void> {
	await createEmptyDatabase();
	requestPracticeIdentityRefresh();
}

export async function importClinicDatabase(title: string): Promise<boolean> {
	const result = await importDatabase(title);
	if (result) requestPracticeIdentityRefresh();
	return result !== null;
}

export async function loadDashboard(): Promise<ClinicDashboard> {
	return loadClinicAnalyticsOverview();
}
