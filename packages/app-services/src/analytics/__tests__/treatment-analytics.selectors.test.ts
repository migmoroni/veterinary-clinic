import { describe, expect, it } from 'vitest';
import { shiftIsoDate, todayIsoDate, type TreatmentHistoryPoint, type TreatmentStatusItem } from '@vet/types/domain/treatment/analytics.js';
import {
	normalizeTreatmentAnalyticsDueFilterMode,
	normalizeTreatmentAnalyticsPeriod,
	normalizeTreatmentAnalyticsPeriodEndDate,
	normalizeTreatmentAnalyticsPeriodStartDate,
	normalizeTreatmentAnalyticsSortOrder,
	normalizeTreatmentAnalyticsStatus,
	sortTreatmentAnalyticsHistoryPoints,
	sortTreatmentAnalyticsStatusItems
} from '../treatment-analytics.selectors.js';

function statusItem(input: Partial<TreatmentStatusItem> & Pick<TreatmentStatusItem, 'petId' | 'petName' | 'name' | 'appliedAt' | 'dueAt'>): TreatmentStatusItem {
	return {
		ownerId: '',
		ownerName: '',
		ownerContacts: [],
		petAvatarBytes: null,
		normalizedName: input.name,
		daysUntilDue: 0,
		status: 'expired',
		...input
	};
}

describe('treatment analytics selectors', () => {
	it('normalizes query parameter values', () => {
		const today = todayIsoDate();
		expect(normalizeTreatmentAnalyticsStatus('overdue')).toBe('overdue');
		expect(normalizeTreatmentAnalyticsStatus('missing')).toBe('expired');
		expect(normalizeTreatmentAnalyticsDueFilterMode('period')).toBe('period');
		expect(normalizeTreatmentAnalyticsDueFilterMode('missing')).toBe('status');
		expect(normalizeTreatmentAnalyticsPeriod('quarter')).toBe('quarter');
		expect(normalizeTreatmentAnalyticsPeriod('missing')).toBe('month');
		expect(normalizeTreatmentAnalyticsSortOrder('old')).toBe('old');
		expect(normalizeTreatmentAnalyticsSortOrder('missing')).toBe('recent');
		expect(normalizeTreatmentAnalyticsPeriodStartDate(today)).toBe(today);
		expect(normalizeTreatmentAnalyticsPeriodStartDate('not-a-date')).toBe(shiftIsoDate(today, -30));
		expect(normalizeTreatmentAnalyticsPeriodEndDate(today)).toBe(today);
		expect(normalizeTreatmentAnalyticsPeriodEndDate('not-a-date')).toBe(shiftIsoDate(today, 30));
	});

	it('sorts status items by recency with stable fallbacks', () => {
		const sorted = sortTreatmentAnalyticsStatusItems(
			[
				statusItem({ petId: 'p1', petName: 'Bia', name: 'V10', appliedAt: '2026-01-01', dueAt: '2026-02-01' }),
				statusItem({ petId: 'p2', petName: 'Ana', name: 'Raiva', appliedAt: '2026-02-01', dueAt: '2026-03-01' }),
				statusItem({ petId: 'p3', petName: 'Caio', name: 'Giardia', appliedAt: '2026-01-15', dueAt: '2026-02-01' })
			],
			'recent'
		);

		expect(sorted.map((item) => item.petName)).toEqual(['Ana', 'Caio', 'Bia']);
	});

	it('sorts history points by period key', () => {
		const history: TreatmentHistoryPoint[] = [
			{ key: '2026-01', label: '2026-01', count: 1 },
			{ key: '2026-03', label: '2026-03', count: 1 },
			{ key: '2026-02', label: '2026-02', count: 1 }
		];

		expect(sortTreatmentAnalyticsHistoryPoints(history, 'recent').map((point) => point.key)).toEqual(['2026-03', '2026-02', '2026-01']);
		expect(sortTreatmentAnalyticsHistoryPoints(history, 'old').map((point) => point.key)).toEqual(['2026-01', '2026-02', '2026-03']);
	});
});
