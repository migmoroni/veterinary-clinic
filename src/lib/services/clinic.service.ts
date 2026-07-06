import type { CurrentRecordSummary } from '$lib/domain/medical-record/medical-record.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import type { DashboardAnalytics } from '$lib/domain/dashboard/analytics.js';
import { hasDatabaseFile } from '$lib/native/database-file.js';
import { createEmptyDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { getLastEditedRecord } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnerAssociatedContactsByOwnerIds } from '$lib/persistence/repositories/owner.repository.js';
import { filterActiveSearchResults as filterActiveSearchResultsRepository, searchClinic, type SearchResult } from '$lib/persistence/repositories/search.repository.js';
import { getClinicCounts } from '$lib/persistence/repositories/stats.repository.js';
import type { TreatmentHistoryPoint } from '$lib/domain/treatment/analytics.js';
import type { TreatmentAnalyticsOverview } from '$lib/persistence/repositories/treatment-analytics.repository.js';
import { loadLocalePreference } from './preferences.service.js';
import { importDatabase } from './database-import.service.js';
import { shouldResetOverviewLastRecordOnce } from './client-state.service.js';
import { loadTreatmentAnalyticsOverview, loadTreatmentHistory } from './treatment-analytics.service.js';
import { loadDashboardAnalytics } from './dashboard-analytics.service.js';
import { requestPracticeIdentityRefresh } from './practice-profile.service.js';

export { loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds } from './avatar.service.js';

export interface ClinicTreatmentDashboard extends TreatmentAnalyticsOverview {
	history: TreatmentHistoryPoint[];
}

export interface ClinicDashboard {
	record: CurrentRecordSummary | null;
	counts: {
		owners: number;
		pets: number;
		records: number;
	};
	vaccines: ClinicTreatmentDashboard;
	antiparasitics: ClinicTreatmentDashboard;
	analytics: DashboardAnalytics;
}

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
	const [record, counts, vaccineOverview, vaccineHistory, antiparasiticOverview, antiparasiticHistory, analytics] = await Promise.all([
		getLastEditedRecord(),
		getClinicCounts(),
		loadTreatmentAnalyticsOverview('vaccine'),
		loadTreatmentHistory('vaccine', { period: 'month', normalizedName: null }),
		loadTreatmentAnalyticsOverview('antiparasitic'),
		loadTreatmentHistory('antiparasitic', { period: 'month', normalizedName: null }),
		loadDashboardAnalytics()
	]);
	return {
		record: shouldResetOverviewLastRecordOnce() ? null : record,
		counts,
		vaccines: { ...vaccineOverview, history: vaccineHistory },
		antiparasitics: { ...antiparasiticOverview, history: antiparasiticHistory },
		analytics
	};
}

export async function searchEverywhere(query: string): Promise<SearchResult[]> {
	return searchClinic(query);
}

export async function filterActiveSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
	return filterActiveSearchResultsRepository(results);
}

export async function loadOwnerAssociatedContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerAssociatedContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	if (uniqueIds.length === 0) return new Map<number, OwnerAssociatedContact[]>();

	return listOwnerAssociatedContactsByOwnerIds(uniqueIds);
}
