import { describe, expect, it } from 'vitest';
import type { TreatmentStatusItem } from '../analytics.js';
import { buildTreatmentStatus, getTreatmentStatus, historyBucket, isPlausibleTreatmentAppliedAt, matchesTreatmentDueFilter } from '../analytics.js';

function statusItem(daysUntilDue: number, dueAt = '2026-05-08'): TreatmentStatusItem {
	return {
		ownerId: '019f9689-0000-7000-8000-000000000001',
		ownerName: 'Owner',
		ownerContacts: [],
		petId: '019f9689-0000-7000-8000-000000000002',
		petName: 'Pet',
		petAvatarBytes: null,
		name: 'Treatment',
		normalizedName: 'treatment',
		appliedAt: '2025-05-08',
		dueAt,
		daysUntilDue,
		status: getTreatmentStatus(daysUntilDue)
	};
}

describe('treatment analytics helpers', () => {
	const now = new Date(2026, 4, 8);

	it('ignores future treatment application dates', () => {
		expect(isPlausibleTreatmentAppliedAt('2026-05-08', now)).toBe(true);
		expect(isPlausibleTreatmentAppliedAt('2026-05-08<script>', now)).toBe(true);
		expect(isPlausibleTreatmentAppliedAt('2026-05-09', now)).toBe(false);
		expect(isPlausibleTreatmentAppliedAt('5018-10-01', now)).toBe(false);
	});

	it('does not build status for future applications', () => {
		expect(buildTreatmentStatus('5018-10-01', 12, 'months', now)).toBeNull();
		expect(buildTreatmentStatus('2026-05-08<script>', 12, 'months', now)).toBeNull();
		expect(buildTreatmentStatus('2026-05-08', 0, 'months', now)).toBeNull();
	});

	it('builds status using validity in days', () => {
		expect(buildTreatmentStatus('2026-04-17', 21, 'days', now)?.dueAt).toBe('2026-05-08');
	});

	it('does not create history buckets for impossible future years', () => {
		expect(historyBucket('5018-10-01', 'month')).toBeNull();
	});

	it('creates stable history buckets for every supported period', () => {
		expect(historyBucket('2026-05-10', 'week')).toEqual({ key: '2026-05-04', label: '2026-05-04', count: 0 });
		expect(historyBucket('2026-05-10', 'month')).toEqual({ key: '2026-05', label: '2026-05', count: 0 });
		expect(historyBucket('2026-05-10', 'quarter')).toEqual({ key: '2026-Q2', label: '2026-Q2', count: 0 });
		expect(historyBucket('2026-05-10', 'semester')).toEqual({ key: '2026-S1', label: '2026-S1', count: 0 });
		expect(historyBucket('2026-05-10', 'year')).toEqual({ key: '2026', label: '2026', count: 0 });
	});

	it('separates due, expired, and overdue treatment windows', () => {
		expect(getTreatmentStatus(31)).toBe('current');
		expect(getTreatmentStatus(30)).toBe('dueSoon');
		expect(getTreatmentStatus(16)).toBe('dueSoon');
		expect(getTreatmentStatus(15)).toBe('dueVerySoon');
		expect(getTreatmentStatus(0)).toBe('dueVerySoon');
		expect(getTreatmentStatus(-1)).toBe('expired');
		expect(getTreatmentStatus(-14)).toBe('expired');
		expect(getTreatmentStatus(-15)).toBe('overdue');
		expect(getTreatmentStatus(-16)).toBe('overdue');
	});

	it('filters due dates inside the selected analysis period', () => {
		const filter = { mode: 'period', status: 'current', startDate: '2026-05-01', endDate: '2026-05-31' } as const;

		expect(matchesTreatmentDueFilter(statusItem(0, '2026-05-01'), filter)).toBe(true);
		expect(matchesTreatmentDueFilter(statusItem(0, '2026-05-08'), filter)).toBe(true);
		expect(matchesTreatmentDueFilter(statusItem(0, '2026-05-31'), filter)).toBe(true);
		expect(matchesTreatmentDueFilter(statusItem(0, '2026-04-30'), filter)).toBe(false);
		expect(matchesTreatmentDueFilter(statusItem(0, '2026-06-01'), filter)).toBe(false);
	});

	it('filters by status when preset mode is selected', () => {
		const filter = { mode: 'status', status: 'expired', startDate: '2026-01-01', endDate: '2026-01-31' } as const;

		expect(matchesTreatmentDueFilter(statusItem(-1, '2030-01-01'), filter)).toBe(true);
		expect(matchesTreatmentDueFilter(statusItem(0, '2026-01-15'), filter)).toBe(false);
	});
});
