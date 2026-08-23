import type { TreatmentDueFilter, TreatmentHistoryFilter } from '@vet/types/domain/treatment/analytics.js';
import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import { getTreatmentAnalyticsOverview, getTreatmentDueAnalytics, listAnalyticsTreatments, listTreatmentDueItems, listTreatmentHistory } from './treatment-analytics.read-model.js';

export async function loadTreatmentAnalyticsOverview(kind: TreatmentKind) {
	return getTreatmentAnalyticsOverview(kind);
}

export async function loadTreatmentDueAnalytics(kind: TreatmentKind) {
	return getTreatmentDueAnalytics(kind);
}

export async function loadTreatmentDueItems(kind: TreatmentKind, filter: Partial<TreatmentDueFilter> | string | null | undefined) {
	return listTreatmentDueItems(kind, filter);
}

export async function loadTreatmentHistory(kind: TreatmentKind, filter: Partial<TreatmentHistoryFilter>) {
	return listTreatmentHistory(kind, filter);
}

export async function loadAnalyticsTreatments(kind: TreatmentKind) {
	return listAnalyticsTreatments(kind);
}
