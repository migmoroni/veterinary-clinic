import { describe, expect, it } from 'vitest';

import { clinicAnalyticsAgeBand, clinicAnalyticsAgeBandSortValue } from '../age-bands.js';

describe('clinicAnalyticsAgeBand', () => {
	const now = new Date(2026, 4, 25);

	it('groups pets under one year by precise month ranges', () => {
		expect(clinicAnalyticsAgeBand('2026-05-25', now)).toBe('months0To3');
		expect(clinicAnalyticsAgeBand('2026-02-25', now)).toBe('months3To6');
		expect(clinicAnalyticsAgeBand('2025-11-25', now)).toBe('months6To12');
	});

	it('groups pets from one year on by completed year', () => {
		expect(clinicAnalyticsAgeBand('2025-05-25', now)).toBe('year:1');
		expect(clinicAnalyticsAgeBand('2023-04-25', now)).toBe('year:3');
	});

	it('keeps invalid or future dates as unknown', () => {
		expect(clinicAnalyticsAgeBand(null, now)).toBe('unknown');
		expect(clinicAnalyticsAgeBand('2026-02-31', now)).toBe('unknown');
		expect(clinicAnalyticsAgeBand('2099-01-01', now)).toBe('unknown');
	});

	it('sorts month ranges before yearly ranges', () => {
		expect(clinicAnalyticsAgeBandSortValue('months0To3')).toBeLessThan(clinicAnalyticsAgeBandSortValue('months3To6'));
		expect(clinicAnalyticsAgeBandSortValue('months6To12')).toBeLessThan(clinicAnalyticsAgeBandSortValue('year:1'));
		expect(clinicAnalyticsAgeBandSortValue('year:1')).toBeLessThan(clinicAnalyticsAgeBandSortValue('year:2'));
	});
});