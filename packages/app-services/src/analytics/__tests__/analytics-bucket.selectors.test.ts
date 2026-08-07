import { describe, expect, it } from 'vitest';
import { compareAnalyticsUnknownLast, sortAnalyticsBuckets, toAnalyticsBuckets } from '../analytics-bucket.selectors.js';

describe('analytics bucket selectors', () => {
	it('builds sorted buckets from a count map', () => {
		const buckets = toAnalyticsBuckets(
			new Map([
				['canine', 2],
				['feline', 3],
				['avian', 2]
			])
		);

		expect(buckets).toEqual([
			{ key: 'feline', count: 3 },
			{ key: 'avian', count: 2 },
			{ key: 'canine', count: 2 }
		]);
	});

	it('keeps unknown after known keys in semantic comparisons', () => {
		expect(compareAnalyticsUnknownLast('unknown', 'canine')).toBe(1);
		expect(compareAnalyticsUnknownLast('canine', 'unknown')).toBe(-1);
		expect(compareAnalyticsUnknownLast('canine', 'feline')).toBe(0);
	});

	it('sorts buckets by count and uses semantic order for ties', () => {
		const sorted = sortAnalyticsBuckets({
			buckets: [
				{ key: 'b', count: 2 },
				{ key: 'a', count: 3 },
				{ key: 'c', count: 3 }
			],
			field: 'count',
			direction: 'desc',
			compareByAnalysis: (first, second) => first.key.localeCompare(second.key)
		});

		expect(sorted.map((bucket) => bucket.key)).toEqual(['a', 'c', 'b']);
	});
});
