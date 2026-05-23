import type { VaccineDueFilter, VaccineHistoryFilter } from '$lib/domain/vaccine/analytics.js';
import {
	getVaccineAnalyticsOverview,
	listAnalyticsVaccines,
	listVaccineHistory,
	listVaccineStatusItems
} from '$lib/persistence/repositories/vaccine-analytics.repository.js';

export async function loadVaccineAnalyticsOverview() {
	return getVaccineAnalyticsOverview();
}

export async function loadVaccineStatusItems(filter: Partial<VaccineDueFilter> | string | null | undefined) {
	return listVaccineStatusItems(filter);
}

export async function loadVaccineHistory(filter: Partial<VaccineHistoryFilter>) {
	return listVaccineHistory(filter);
}

export async function loadAnalyticsVaccines() {
	return listAnalyticsVaccines();
}