import type { CurrentRecordSummary } from '$lib/domain/medical-record/medical-record.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import type { DashboardAnalytics } from '$lib/domain/dashboard/analytics.js';
import { hasDatabaseFile } from '$lib/native/database-file.js';
import { createEmptyDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { getLastEditedRecord } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnerAssociatedContactsByOwnerIds, listOwnerAvatarBytesByIds } from '$lib/persistence/repositories/owner.repository.js';
import { listPetAvatarBytesByIds } from '$lib/persistence/repositories/pet.repository.js';
import { searchClinic, type SearchResult } from '$lib/persistence/repositories/search.repository.js';
import { getClinicCounts } from '$lib/persistence/repositories/stats.repository.js';
import type { VaccineAnalyticsOverview } from '$lib/persistence/repositories/vaccine-analytics.repository.js';
import type { VaccineHistoryPoint } from '$lib/domain/vaccine/analytics.js';
import { loadLocalePreference } from './preferences.service.js';
import { importDatabase } from './backup.service.js';
import { shouldResetOverviewLastRecordOnce } from './client-state.service.js';
import { loadVaccineAnalyticsOverview, loadVaccineHistory } from './vaccine-analytics.service.js';
import { loadDashboardAnalytics } from './dashboard-analytics.service.js';


export interface ClinicVaccineDashboard extends VaccineAnalyticsOverview {
	history: VaccineHistoryPoint[];
}

export interface ClinicDashboard {
	record: CurrentRecordSummary | null;
	counts: {
		owners: number;
		pets: number;
		records: number;
	};
	vaccines: ClinicVaccineDashboard;
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
}

export async function importClinicDatabase(title: string): Promise<boolean> {
	const result = await importDatabase(title);
	return result !== null;
}

export async function loadDashboard(): Promise<ClinicDashboard> {
	const [record, counts, vaccineOverview, vaccineHistory, analytics] = await Promise.all([
		getLastEditedRecord(),
		getClinicCounts(),
		loadVaccineAnalyticsOverview(),
		loadVaccineHistory({ period: 'month', vaccineNormalizedName: null }),
		loadDashboardAnalytics()
	]);
	return {
		record: shouldResetOverviewLastRecordOnce() ? null : record,
		counts,
		vaccines: { ...vaccineOverview, history: vaccineHistory },
		analytics
	};
}

export async function searchEverywhere(query: string): Promise<SearchResult[]> {
	return searchClinic(query);
}

export async function loadOwnerAssociatedContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerAssociatedContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	if (uniqueIds.length === 0) return new Map<number, OwnerAssociatedContact[]>();

	return listOwnerAssociatedContactsByOwnerIds(uniqueIds);
}

export async function loadOwnerAvatarsByOwnerIds(ownerIds: number[]): Promise<Map<number, Uint8Array | null>> {
	return listOwnerAvatarBytesByIds(ownerIds);
}

export async function loadPetAvatarsByPetIds(petIds: number[]): Promise<Map<number, Uint8Array | null>> {
	return listPetAvatarBytesByIds(petIds);
}
