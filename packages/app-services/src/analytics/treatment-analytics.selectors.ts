import { formatDateForInput } from '@vet/types/domain/shared/date-input.js';
import {
	shiftIsoDate,
	todayIsoDate,
	treatmentDueFilterModes,
	treatmentHistoryPeriods,
	treatmentStatusKeys,
	type TreatmentDueFilterMode,
	type TreatmentHistoryPeriod,
	type TreatmentHistoryPoint,
	type TreatmentStatusItem,
	type TreatmentStatusKey
} from '@vet/types/domain/treatment/analytics.js';

export type TreatmentAnalyticsSortOrder = 'recent' | 'old';

export function normalizeTreatmentAnalyticsStatus(value: string | null): TreatmentStatusKey {
	return treatmentStatusKeys.includes(value as TreatmentStatusKey) ? (value as TreatmentStatusKey) : 'expired';
}

export function normalizeTreatmentAnalyticsDueFilterMode(value: string | null): TreatmentDueFilterMode {
	return treatmentDueFilterModes.includes(value as TreatmentDueFilterMode) ? (value as TreatmentDueFilterMode) : 'status';
}

export function normalizeTreatmentAnalyticsPeriodStartDate(value: string | null): string {
	const todayDate = todayIsoDate();
	const normalized = formatDateForInput(value);
	return normalized && normalized <= todayDate ? normalized : shiftIsoDate(todayDate, -30);
}

export function normalizeTreatmentAnalyticsPeriodEndDate(value: string | null): string {
	const todayDate = todayIsoDate();
	const normalized = formatDateForInput(value);
	return normalized && normalized >= todayDate ? normalized : shiftIsoDate(todayDate, 30);
}

export function normalizeTreatmentAnalyticsPeriod(value: string | null): TreatmentHistoryPeriod {
	return treatmentHistoryPeriods.includes(value as TreatmentHistoryPeriod) ? (value as TreatmentHistoryPeriod) : 'month';
}

export function normalizeTreatmentAnalyticsSortOrder(value: string | null): TreatmentAnalyticsSortOrder {
	return value === 'recent' || value === 'old' ? value : 'recent';
}

export function sortTreatmentAnalyticsStatusItems(source: TreatmentStatusItem[], order: TreatmentAnalyticsSortOrder): TreatmentStatusItem[] {
	const direction = order === 'recent' ? -1 : 1;
	return [...source].sort((first, second) => {
		const dueCompare = first.dueAt.localeCompare(second.dueAt);
		if (dueCompare !== 0) return dueCompare * direction;

		const appliedCompare = first.appliedAt.localeCompare(second.appliedAt);
		if (appliedCompare !== 0) return appliedCompare * direction;

		return treatmentStatusItemOwnerName(first).localeCompare(treatmentStatusItemOwnerName(second)) || first.petName.localeCompare(second.petName) || first.name.localeCompare(second.name);
	});
}

export function sortTreatmentAnalyticsHistoryPoints(source: TreatmentHistoryPoint[], order: TreatmentAnalyticsSortOrder): TreatmentHistoryPoint[] {
	return [...source].sort((first, second) => (order === 'recent' ? second.key.localeCompare(first.key) : first.key.localeCompare(second.key)));
}

function treatmentStatusItemOwnerName(item: TreatmentStatusItem): string {
	return item.ownerName.trim();
}
