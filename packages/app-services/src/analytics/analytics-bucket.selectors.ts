import type { AnalyticsBucket, AnalyticsBucketSortField, AnalyticsSortDirection } from '@vet/types/clinic-analytics.js';
import { compareAnalyticsMissingLast } from './analytics-query.js';

export function toAnalyticsBuckets<Key extends string>(buckets: Map<Key, number>): AnalyticsBucket<Key>[] {
	return [...buckets.entries()]
		.map(([key, count]) => ({ key, count }))
		.sort((first, second) => second.count - first.count || compareAnalyticsUnknownLast(first.key, second.key) || first.key.localeCompare(second.key));
}

export function compareAnalyticsUnknownLast(firstKey: string, secondKey: string): number {
	return compareAnalyticsMissingLast(firstKey, secondKey, ['unknown']);
}

export function sortAnalyticsBuckets<Key extends string>(input: {
	buckets: AnalyticsBucket<Key>[];
	field: AnalyticsBucketSortField;
	direction: AnalyticsSortDirection;
	compareByAnalysis: (first: AnalyticsBucket<Key>, second: AnalyticsBucket<Key>) => number;
}): AnalyticsBucket<Key>[] {
	const { buckets, field, direction, compareByAnalysis } = input;
	return [...buckets].sort((first, second) => {
		if (field === 'count') {
			const countCompare = first.count - second.count;
			const orderedCountCompare = direction === 'asc' ? countCompare : -countCompare;
			if (orderedCountCompare !== 0) return orderedCountCompare;
			return compareAnalyticsUnknownLast(first.key, second.key) || compareByAnalysis(first, second);
		}

		const unknownCompare = compareAnalyticsUnknownLast(first.key, second.key);
		if (unknownCompare !== 0) return unknownCompare;
		const analysisCompare = compareByAnalysis(first, second);
		return direction === 'asc' ? analysisCompare : -analysisCompare;
	});
}
