import { describe, expect, it } from 'vitest';
import { computeAgeFromBirthDate, computePurgeAfter } from '../time.js';

describe('trash retention helpers', () => {
	it('computes a 90 day purge date by default', () => {
		expect(computePurgeAfter('2026-05-07T00:00:00.000Z')).toBe('2026-08-05T00:00:00.000Z');
	});

	it('accepts a custom retention period', () => {
		expect(computePurgeAfter('2026-05-07T00:00:00.000Z', 7)).toBe('2026-05-14T00:00:00.000Z');
	});

	it('computes age in years, months and days', () => {
		expect(computeAgeFromBirthDate('2020-05-08', new Date(2026, 4, 8))).toEqual({ years: 6, months: 0, days: 0 });
		expect(computeAgeFromBirthDate('2024-12-25', new Date(2026, 4, 8))).toEqual({ years: 1, months: 4, days: 13 });
	});

	it('returns null for invalid or future birth dates', () => {
		expect(computeAgeFromBirthDate('2026-02-31', new Date(2026, 4, 8))).toBeNull();
		expect(computeAgeFromBirthDate('2099-01-01', new Date(2026, 4, 8))).toBeNull();
	});
});