import { describe, expect, it } from 'vitest';

import { dashboardAgeBand, dashboardAgeBandSortValue } from '../age-bands.js';

describe('dashboardAgeBand', () => {
	const now = new Date(2026, 4, 25);

	it('groups pets under one year by precise month ranges', () => {
		expect(dashboardAgeBand('2026-05-25', now)).toBe('months0To3');
		expect(dashboardAgeBand('2026-02-25', now)).toBe('months3To6');
		expect(dashboardAgeBand('2025-11-25', now)).toBe('months6To12');
	});

	it('groups pets from one year on by completed year', () => {
		expect(dashboardAgeBand('2025-05-25', now)).toBe('year:1');
		expect(dashboardAgeBand('2023-04-25', now)).toBe('year:3');
	});

	it('keeps invalid or future dates as unknown', () => {
		expect(dashboardAgeBand(null, now)).toBe('unknown');
		expect(dashboardAgeBand('2026-02-31', now)).toBe('unknown');
		expect(dashboardAgeBand('2099-01-01', now)).toBe('unknown');
	});

	it('sorts month ranges before yearly ranges', () => {
		expect(dashboardAgeBandSortValue('months0To3')).toBeLessThan(dashboardAgeBandSortValue('months3To6'));
		expect(dashboardAgeBandSortValue('months6To12')).toBeLessThan(dashboardAgeBandSortValue('year:1'));
		expect(dashboardAgeBandSortValue('year:1')).toBeLessThan(dashboardAgeBandSortValue('year:2'));
	});
});