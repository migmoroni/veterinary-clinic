import { describe, expect, it } from 'vitest';
import type { TreatmentAnalyticsOverview, TreatmentHistoryPoint } from '@vet/types/domain/treatment/analytics.js';
import { buildTreatmentDuePeriodChart, buildTreatmentHistoryBarChart, type TreatmentAnalyticsChartLabels } from '../treatment-analytics.view-model.js';

const labels: TreatmentAnalyticsChartLabels = {
	centerLabel: 'Vacinas',
	duePeriods: {
		dueAfter30Days: 'Mais de 30 dias para vencer',
		dueWithin30Days: '30 ou menos dias para vencer',
		expiredWithin30Days: '30 ou menos dias vencido',
		expiredAfter30Days: 'Mais de 30 dias vencido'
	}
};

const overview: TreatmentAnalyticsOverview = {
	totalTracked: 10,
	summary: { current: 4, dueSoon: 2, dueVerySoon: 1, expired: 1, overdue: 2 },
	duePeriodSummary: { dueAfter30Days: 4, dueWithin30Days: 3, expiredWithin30Days: 1, expiredAfter30Days: 2 }
};

describe('treatment analytics chart view model', () => {
	it('builds a due period donut model from the treatment overview', () => {
		const chart = buildTreatmentDuePeriodChart({ overview, labels, locale: 'pt-BR' });

		expect(chart.total).toBe(10);
		expect(chart.centerValue).toBe('10');
		expect(chart.centerLabel).toBe('Vacinas');
		expect(chart.data.map((item) => [item.key, item.value, item.percent])).toEqual([
			['dueAfter30Days', 4, 40],
			['dueWithin30Days', 3, 30],
			['expiredWithin30Days', 1, 10],
			['expiredAfter30Days', 2, 20]
		]);
	});

	it('builds a recent-first treatment history bar model', () => {
		const points: TreatmentHistoryPoint[] = [
			{ key: '2026-01', label: '2026-01', count: 2 },
			{ key: '2026-02', label: '2026-02', count: 3 }
		];

		expect(buildTreatmentHistoryBarChart(points)).toEqual({
			orientation: 'horizontal',
			total: 5,
			data: [
				{ key: '2026-02', label: '2026-02', value: 3 },
				{ key: '2026-01', label: '2026-01', value: 2 }
			]
		});
	});
});
