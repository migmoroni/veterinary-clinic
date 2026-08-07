import { describe, expect, it } from 'vitest';
import { analyticsBucketKey, analyticsPercent, compareAnalyticsMissingLast, limitAnalyticsRows, normalizeAnalyticsKeys, queryAnalytics, type AnalyticsDimensionSpec, type AnalyticsFilterSpec } from '../analytics-query.js';

type PetRow = {
	id: string;
	breed: string;
	status: string;
	city: string;
	tags?: string[];
};

type PetDimension = 'petBreed' | 'petVaccineStatus' | 'ownerCity' | 'tag';
type PetFilter = 'breed' | 'status' | 'city';

const rows: PetRow[] = [
	{ id: '1', breed: 'spitz_alemao', status: 'overdue', city: 'bh', tags: ['small', 'small'] },
	{ id: '2', breed: 'vira_lata', status: 'current', city: 'bh', tags: ['medium'] },
	{ id: '3', breed: 'unknown', status: 'expired', city: 'sp', tags: [] },
	{ id: '4', breed: 'spitz_alemao', status: 'current', city: 'sp', tags: ['small'] }
];

const dimensions: Record<PetDimension, AnalyticsDimensionSpec<PetRow, PetDimension>> = {
	petBreed: {
		id: 'petBreed',
		keys: (row) => [row.breed],
		fallbackKey: 'unknown',
		missingKeys: ['unknown']
	},
	petVaccineStatus: {
		id: 'petVaccineStatus',
		keys: (row) => [row.status],
		fallbackKey: 'untracked',
		compareKeys: (first, second) => statusWeight[first] - statusWeight[second]
	},
	ownerCity: {
		id: 'ownerCity',
		keys: (row) => [row.city],
		fallbackKey: 'unknown',
		missingKeys: ['unknown']
	},
	tag: {
		id: 'tag',
		keys: (row) => row.tags ?? [],
		fallbackKey: 'unknown',
		missingKeys: ['unknown']
	}
};

const statusWeight: Record<string, number> = {
	untracked: 0,
	current: 1,
	expired: 2,
	overdue: 3
};

function filters(input: { breed?: string; status?: string; city?: string }): AnalyticsFilterSpec<PetRow, PetFilter>[] {
	return [
		{ id: 'breed', valueKey: input.breed ?? '', isActive: !!input.breed, matches: (row) => row.breed === input.breed },
		{ id: 'status', valueKey: input.status ?? '', isActive: !!input.status, matches: (row) => row.status === input.status },
		{ id: 'city', valueKey: input.city ?? '', isActive: !!input.city, matches: (row) => row.city === input.city }
	];
}

describe('queryAnalytics', () => {
	it('builds a simple bucket query sorted by count', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['petBreed'],
			measure: 'count',
			sort: { by: 'count', direction: 'desc' }
		});

		expect(result.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['spitz_alemao'], count: 2 },
			{ keys: ['vira_lata'], count: 1 },
			{ keys: ['unknown'], count: 1 }
		]);
		expect(result.totalCount).toBe(4);
		expect(result.topBucket?.keys).toEqual(['spitz_alemao']);
	});

	it('builds cross buckets and resolves a valid selected bucket', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			filters: filters({ city: 'bh' }),
			groupBy: ['petBreed', 'petVaccineStatus'],
			measure: 'count',
			sort: { by: 'count', direction: 'desc' },
			selectedBucket: {
				groupBy: ['petBreed', 'petVaccineStatus'],
				keys: ['spitz_alemao', 'overdue']
			},
			limit: 16
		});

		expect(result.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['spitz_alemao', 'overdue'], count: 1 },
			{ keys: ['vira_lata', 'current'], count: 1 }
		]);
		expect(result.selectedBucket?.key).toBe(analyticsBucketKey(['spitz_alemao', 'overdue']));
		expect(result.listedRows.map((row) => row.id)).toEqual(['1']);
		expect(result.selectedCount).toBe(1);
		expect(result.selectedPercent).toBe(50);
	});

	it('applies active filters with AND and ignores inactive filters', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			filters: filters({ breed: 'spitz_alemao', status: 'current' }),
			groupBy: ['ownerCity'],
			measure: 'count'
		});

		expect(result.rows.map((row) => row.id)).toEqual(['4']);
		expect(result.activeFactors).toEqual([
			{ id: 'breed', valueKey: 'spitz_alemao', count: 2 },
			{ id: 'status', valueKey: 'current', count: 2 }
		]);
	});

	it('keeps listedRows unchanged when selectedBucket is invalid', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['petBreed'],
			measure: 'count',
			selectedBucket: { groupBy: ['petVaccineStatus'], keys: ['overdue'] }
		});

		expect(result.selectedBucket).toBeNull();
		expect(result.listedRows).toEqual(result.rows);
	});

	it('limits buckets without mutating the full bucket list', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['petBreed'],
			measure: 'count',
			limit: 1
		});

		expect(result.limitedBuckets).toHaveLength(1);
		expect(result.buckets).toHaveLength(3);
	});

	it('sorts by count asc and desc', () => {
		const asc = queryAnalytics({ target: 'pets', rows, dimensions, groupBy: ['petBreed'], measure: 'count', sort: { by: 'count', direction: 'asc' } });
		const desc = queryAnalytics({ target: 'pets', rows, dimensions, groupBy: ['petBreed'], measure: 'count', sort: { by: 'count', direction: 'desc' } });

		expect(asc.buckets.map((bucket) => bucket.count)).toEqual([1, 1, 2]);
		expect(desc.buckets.map((bucket) => bucket.count)).toEqual([2, 1, 1]);
	});

	it('sorts by semantic analysis asc and desc while keeping missing keys last', () => {
		const asc = queryAnalytics({ target: 'pets', rows, dimensions, groupBy: ['petBreed'], measure: 'count', sort: { by: 'analysis', direction: 'asc' } });
		const desc = queryAnalytics({ target: 'pets', rows, dimensions, groupBy: ['petBreed'], measure: 'count', sort: { by: 'analysis', direction: 'desc' } });

		expect(asc.buckets.map((bucket) => bucket.keys[0])).toEqual(['spitz_alemao', 'vira_lata', 'unknown']);
		expect(desc.buckets.map((bucket) => bucket.keys[0])).toEqual(['vira_lata', 'spitz_alemao', 'unknown']);
	});

	it('uses labelForKey when a dimension has no comparator', () => {
		const labels: Record<string, string> = {
			spitz_alemao: 'Spitz alemao',
			vira_lata: 'Vira-lata',
			unknown: 'Nao informado'
		};
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['petBreed'],
			measure: 'count',
			sort: { by: 'analysis', direction: 'asc' },
			labelForKey: (_dimension, key) => labels[key] ?? key,
			locale: 'pt-BR'
		});

		expect(result.buckets.map((bucket) => bucket.keys[0])).toEqual(['spitz_alemao', 'vira_lata', 'unknown']);
	});

	it('deduplicates keys per row and uses fallback keys', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['tag'],
			measure: 'count',
			sort: { by: 'analysis', direction: 'asc' }
		});

		expect(result.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['medium'], count: 1 },
			{ keys: ['small'], count: 2 },
			{ keys: ['unknown'], count: 1 }
		]);
	});

	it('keeps duplicate groupBy dimensions on diagonal buckets', () => {
		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions,
			groupBy: ['tag', 'tag'],
			measure: 'count',
			sort: { by: 'analysis', direction: 'asc' }
		});

		expect(result.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['medium', 'medium'], count: 1 },
			{ keys: ['small', 'small'], count: 2 },
			{ keys: ['unknown', 'unknown'], count: 1 }
		]);
	});

	it('throws clear errors for invalid dimensions', () => {
		expect(() =>
			queryAnalytics({
				target: 'pets',
				rows,
				dimensions,
				groupBy: ['missing' as PetDimension],
				measure: 'count'
			})
		).toThrow('unknown groupBy dimension');
		expect(() =>
			queryAnalytics({
				target: 'pets',
				rows,
				dimensions,
				groupBy: ['petBreed'],
				measure: 'count',
				sort: { by: 'ownerCity', direction: 'asc' }
			})
		).toThrow('sort dimension must be present in groupBy');
	});
});

describe('analytics query helpers', () => {
	it('normalizes keys with fallback and stable bucket keys', () => {
		expect(normalizeAnalyticsKeys([], 'unknown')).toEqual(['unknown']);
		expect(normalizeAnalyticsKeys(['a', 'a', 'b'], 'unknown')).toEqual(['a', 'b']);
		expect(analyticsBucketKey(['a', 'b'])).toBe('["a","b"]');
	});

	it('compares missing keys last and calculates rounded percentages', () => {
		expect(compareAnalyticsMissingLast('unknown', 'a', ['unknown'])).toBe(1);
		expect(compareAnalyticsMissingLast('a', 'unknown', ['unknown'])).toBe(-1);
		expect(analyticsPercent({ value: 1, total: 3 })).toBe(33.3);
		expect(analyticsPercent({ value: 0, total: 3 })).toBe(0);
		expect(limitAnalyticsRows(rows, 2).map((row) => row.id)).toEqual(['1', '2']);
	});
});
