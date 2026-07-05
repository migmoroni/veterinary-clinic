import type { AntiparasiticTreatmentDueFilter, AntiparasiticTreatmentHistoryFilter } from '$lib/domain/antiparasitic/analytics.js';
import {
	getAntiparasiticTreatmentAnalyticsOverview,
	listAnalyticsAntiparasitics,
	listAntiparasiticTreatmentHistory,
	listAntiparasiticTreatmentStatusItems
} from '$lib/persistence/repositories/antiparasitic-analytics.repository.js';

export async function loadAntiparasiticTreatmentAnalyticsOverview() {
	return getAntiparasiticTreatmentAnalyticsOverview();
}

export async function loadAntiparasiticTreatmentStatusItems(filter: Partial<AntiparasiticTreatmentDueFilter> | string | null | undefined) {
	return listAntiparasiticTreatmentStatusItems(filter);
}

export async function loadAntiparasiticTreatmentHistory(filter: Partial<AntiparasiticTreatmentHistoryFilter>) {
	return listAntiparasiticTreatmentHistory(filter);
}

export async function loadAnalyticsAntiparasitics() {
	return listAnalyticsAntiparasitics();
}