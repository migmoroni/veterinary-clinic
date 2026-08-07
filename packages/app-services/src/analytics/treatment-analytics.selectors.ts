import {
	emptyTreatmentDuePeriodSummary,
	emptyTreatmentStatusSummary,
	getTreatmentDuePeriod,
	matchesTreatmentDueFilter,
	treatmentDuePeriodKeys,
	treatmentHistoryPeriods,
	type TreatmentAnalyticsOverview,
	type TreatmentDuePeriodKey,
	type TreatmentHistoryPeriod,
	type TreatmentDueItem
} from '@vet/types/domain/treatment/analytics.js';

export type TreatmentAnalyticsSortOrder = 'recent' | 'old';

export function normalizeTreatmentAnalyticsDuePeriod(value: string | null): TreatmentDuePeriodKey {
	return treatmentDuePeriodKeys.includes(value as TreatmentDuePeriodKey) ? (value as TreatmentDuePeriodKey) : 'dueWithin30Days';
}

export function normalizeTreatmentAnalyticsPeriod(value: string | null): TreatmentHistoryPeriod {
	return treatmentHistoryPeriods.includes(value as TreatmentHistoryPeriod) ? (value as TreatmentHistoryPeriod) : 'month';
}

export function normalizeTreatmentAnalyticsSortOrder(value: string | null): TreatmentAnalyticsSortOrder {
	return value === 'recent' || value === 'old' ? value : 'recent';
}

export function defaultTreatmentAnalyticsDueOrder(duePeriod: TreatmentDuePeriodKey): TreatmentAnalyticsSortOrder {
	return duePeriod === 'dueAfter30Days' || duePeriod === 'dueWithin30Days' ? 'old' : 'recent';
}

export function summarizeTreatmentAnalyticsDueItems(source: readonly TreatmentDueItem[]): TreatmentAnalyticsOverview {
	const summary = emptyTreatmentStatusSummary();
	const duePeriodSummary = emptyTreatmentDuePeriodSummary();

	for (const item of source) {
		summary[item.status] += 1;
		duePeriodSummary[getTreatmentDuePeriod(item.daysUntilDue)] += 1;
	}

	return { totalTracked: source.length, summary, duePeriodSummary };
}

export function filterTreatmentAnalyticsDueItems(source: readonly TreatmentDueItem[], duePeriod: TreatmentDuePeriodKey): TreatmentDueItem[] {
	return source.filter((item) => matchesTreatmentDueFilter(item, { duePeriod }));
}

export function sortTreatmentAnalyticsDueItems(source: readonly TreatmentDueItem[], order: TreatmentAnalyticsSortOrder): TreatmentDueItem[] {
	const direction = order === 'recent' ? -1 : 1;
	return [...source].sort((first, second) => {
		const dueCompare = first.dueAt.localeCompare(second.dueAt);
		if (dueCompare !== 0) return dueCompare * direction;

		const appliedCompare = first.appliedAt.localeCompare(second.appliedAt);
		if (appliedCompare !== 0) return appliedCompare * direction;

		return treatmentDueItemOwnerName(first).localeCompare(treatmentDueItemOwnerName(second)) || first.petName.localeCompare(second.petName) || first.name.localeCompare(second.name);
	});
}

function treatmentDueItemOwnerName(item: TreatmentDueItem): string {
	return item.ownerName.trim();
}
