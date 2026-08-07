import { describe, expect, it } from 'vitest';
import type { TreatmentDueItem } from '@vet/types/domain/treatment/analytics.js';
import {
	defaultTreatmentAnalyticsDueOrder,
	filterTreatmentAnalyticsDueItems,
	normalizeTreatmentAnalyticsDuePeriod,
	normalizeTreatmentAnalyticsPeriod,
	normalizeTreatmentAnalyticsSortOrder,
	summarizeTreatmentAnalyticsDueItems,
	sortTreatmentAnalyticsDueItems
} from '../treatment-analytics.selectors.js';

function dueItem(input: Partial<TreatmentDueItem> & Pick<TreatmentDueItem, 'petId' | 'petName' | 'name' | 'appliedAt' | 'dueAt'>): TreatmentDueItem {
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
		expect(normalizeTreatmentAnalyticsDuePeriod('expiredAfter30Days')).toBe('expiredAfter30Days');
		expect(normalizeTreatmentAnalyticsDuePeriod('missing')).toBe('dueWithin30Days');
		expect(normalizeTreatmentAnalyticsPeriod('quarter')).toBe('quarter');
		expect(normalizeTreatmentAnalyticsPeriod('missing')).toBe('month');
		expect(normalizeTreatmentAnalyticsSortOrder('old')).toBe('old');
		expect(normalizeTreatmentAnalyticsSortOrder('missing')).toBe('recent');
	});

	it('chooses the default due order around day zero', () => {
		expect(defaultTreatmentAnalyticsDueOrder('dueAfter30Days')).toBe('old');
		expect(defaultTreatmentAnalyticsDueOrder('dueWithin30Days')).toBe('old');
		expect(defaultTreatmentAnalyticsDueOrder('expiredWithin30Days')).toBe('recent');
		expect(defaultTreatmentAnalyticsDueOrder('expiredAfter30Days')).toBe('recent');
	});

	it('summarizes and filters due items from the same collection', () => {
		const source = [
			dueItem({ petId: 'p1', petName: 'Luna', name: 'V10', appliedAt: '2026-01-01', dueAt: '2026-09-10', daysUntilDue: 34, status: 'current' }),
			dueItem({ petId: 'p2', petName: 'Bella', name: 'Raiva', appliedAt: '2026-01-01', dueAt: '2026-08-20', daysUntilDue: 13, status: 'dueVerySoon' }),
			dueItem({ petId: 'p3', petName: 'Thor', name: 'Giardia', appliedAt: '2026-01-01', dueAt: '2026-08-01', daysUntilDue: -6, status: 'expired' }),
			dueItem({ petId: 'p4', petName: 'Nina', name: 'Bravecto', appliedAt: '2026-01-01', dueAt: '2026-06-01', daysUntilDue: -67, status: 'overdue' })
		];

		expect(summarizeTreatmentAnalyticsDueItems(source).duePeriodSummary).toEqual({
			dueAfter30Days: 1,
			dueWithin30Days: 1,
			expiredWithin30Days: 1,
			expiredAfter30Days: 1
		});
		expect(filterTreatmentAnalyticsDueItems(source, 'expiredWithin30Days').map((item) => item.petName)).toEqual(['Thor']);
	});

	it('sorts due items by recency with stable fallbacks', () => {
		const sorted = sortTreatmentAnalyticsDueItems(
			[
				dueItem({ petId: 'p1', petName: 'Bia', name: 'V10', appliedAt: '2026-01-01', dueAt: '2026-02-01' }),
				dueItem({ petId: 'p2', petName: 'Ana', name: 'Raiva', appliedAt: '2026-02-01', dueAt: '2026-03-01' }),
				dueItem({ petId: 'p3', petName: 'Caio', name: 'Giardia', appliedAt: '2026-01-15', dueAt: '2026-02-01' })
			],
			'recent'
		);

		expect(sorted.map((item) => item.petName)).toEqual(['Ana', 'Caio', 'Bia']);
	});
});
