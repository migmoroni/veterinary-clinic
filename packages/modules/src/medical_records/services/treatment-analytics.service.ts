import type { TreatmentDueFilter, TreatmentHistoryFilter } from '@vet/types/domain/treatment/analytics.js';
import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import { getTreatmentAnalyticsOverview, listAnalyticsTreatments, listTreatmentHistory, listTreatmentStatusItems } from '@vet/modules/medical_records/repositories/treatment-analytics.repository.js';

export async function loadTreatmentAnalyticsOverview(kind: TreatmentKind) {
	return getTreatmentAnalyticsOverview(kind);
}

export async function loadTreatmentStatusItems(kind: TreatmentKind, filter: Partial<TreatmentDueFilter> | string | null | undefined) {
	return listTreatmentStatusItems(kind, filter);
}

export async function loadTreatmentHistory(kind: TreatmentKind, filter: Partial<TreatmentHistoryFilter>) {
	return listTreatmentHistory(kind, filter);
}

export async function loadAnalyticsTreatments(kind: TreatmentKind) {
	return listAnalyticsTreatments(kind);
}
