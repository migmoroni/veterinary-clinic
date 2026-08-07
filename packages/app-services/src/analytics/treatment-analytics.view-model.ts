import type { AnalyticsBarChartModel, AnalyticsChartTone, AnalyticsDonutChartModel } from '@vet/types/domain/analytics/charts.js';
import type { TreatmentAnalyticsOverview, TreatmentDuePeriodKey, TreatmentHistoryPoint } from '@vet/types/domain/treatment/analytics.js';
import { treatmentDuePeriodKeys } from '@vet/types/domain/treatment/analytics.js';
import { analyticsPercent } from './analytics-query.js';

export interface TreatmentAnalyticsChartLabels {
	centerLabel: string;
	duePeriods: Record<TreatmentDuePeriodKey, string>;
}

export interface TreatmentDuePeriodChartInput {
	overview: TreatmentAnalyticsOverview | null | undefined;
	labels: TreatmentAnalyticsChartLabels;
	locale: string;
}

export function buildTreatmentDuePeriodChart(input: TreatmentDuePeriodChartInput): AnalyticsDonutChartModel {
	const total = input.overview?.totalTracked ?? 0;
	const formatter = new Intl.NumberFormat(input.locale);

	return {
		total,
		centerLabel: input.labels.centerLabel,
		centerValue: formatter.format(total),
		data: treatmentDuePeriodKeys.map((key) => {
			const value = input.overview?.duePeriodSummary[key] ?? 0;
			return {
				key,
				label: input.labels.duePeriods[key],
				value,
				percent: analyticsPercent({ value, total }),
				tone: treatmentDuePeriodTone(key)
			};
		})
	};
}

export function buildTreatmentHistoryBarChart(points: readonly TreatmentHistoryPoint[]): AnalyticsBarChartModel {
	const recentFirst = [...points].sort((first, second) => second.key.localeCompare(first.key));

	return {
		orientation: 'horizontal',
		total: recentFirst.reduce((sum, point) => sum + point.count, 0),
		data: recentFirst.map((point) => ({ key: point.key, label: point.label, value: point.count }))
	};
}

function treatmentDuePeriodTone(key: TreatmentDuePeriodKey): AnalyticsChartTone {
	if (key === 'dueAfter30Days') return 'success';
	if (key === 'dueWithin30Days') return 'warning';
	if (key === 'expiredWithin30Days') return 'danger';
	return 'danger';
}
