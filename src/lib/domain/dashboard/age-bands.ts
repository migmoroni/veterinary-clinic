import type { DashboardAgeBandKey } from '$lib/domain/dashboard/analytics.js';
import { computeAgeFromBirthDate } from '$lib/domain/shared/time.js';

export const dashboardAgeMonthBandKeys = ['months0To3', 'months3To6', 'months6To12'] as const satisfies DashboardAgeBandKey[];

export function dashboardAgeBand(value: string | null | undefined, now = new Date()): DashboardAgeBandKey {
	if (!value) return 'unknown';

	const age = computeAgeFromBirthDate(value, now);
	if (!age) return 'unknown';

	const totalMonths = age.years * 12 + age.months;
	if (totalMonths < 3) return 'months0To3';
	if (totalMonths < 6) return 'months3To6';
	if (totalMonths < 12) return 'months6To12';
	return `year:${age.years}`;
}

export function dashboardAgeBandYear(key: string): number | null {
	const match = key.match(/^year:(\d+)$/);
	if (!match) return null;

	const year = Number(match[1]);
	return Number.isSafeInteger(year) && year >= 0 ? year : null;
}

export function dashboardAgeBandSortValue(key: string): number {
	if (key === 'months0To3') return 0;
	if (key === 'months3To6') return 3;
	if (key === 'months6To12') return 6;

	const year = dashboardAgeBandYear(key);
	return year === null ? Number.MAX_SAFE_INTEGER : year * 12;
}