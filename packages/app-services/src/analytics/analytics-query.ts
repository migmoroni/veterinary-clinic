import type { AnalyticsBucketSortField, AnalyticsSortDirection } from '@vet/types/clinic-analytics.js';

export type AnalyticsKey = string;
export type AnalyticsTargetId = string;
export type AnalyticsDimensionId = string;
export type AnalyticsFilterId = string;
export type AnalyticsMeasure = 'count';

export type AnalyticsKeyComparator<Key extends AnalyticsKey = AnalyticsKey> = (firstKey: Key, secondKey: Key) => number;

export interface AnalyticsDimensionSpec<Row, Id extends AnalyticsDimensionId = AnalyticsDimensionId, Key extends AnalyticsKey = AnalyticsKey> {
	id: Id;
	keys: (row: Row) => readonly Key[];
	fallbackKey: Key;
	compareKeys?: AnalyticsKeyComparator<Key>;
	missingKeys?: readonly Key[];
}

export interface AnalyticsFilterSpec<Row, Id extends AnalyticsFilterId = AnalyticsFilterId> {
	id: Id;
	valueKey: string;
	isActive: boolean;
	matches: (row: Row) => boolean;
}

export interface AnalyticsSort<DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId> {
	by: AnalyticsBucketSortField | DimensionId;
	direction: AnalyticsSortDirection;
}

export interface AnalyticsBucketSelection<DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId> {
	groupBy: readonly DimensionId[];
	keys: readonly AnalyticsKey[];
}

export interface AnalyticsQuery<Row, TargetId extends AnalyticsTargetId = AnalyticsTargetId, DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId, FilterId extends AnalyticsFilterId = AnalyticsFilterId> {
	target: TargetId;
	rows: readonly Row[];
	dimensions: Readonly<Record<DimensionId, AnalyticsDimensionSpec<Row, DimensionId>>>;
	filters?: readonly AnalyticsFilterSpec<Row, FilterId>[];
	groupBy: readonly [DimensionId] | readonly [DimensionId, DimensionId];
	measure: AnalyticsMeasure;
	sort?: AnalyticsSort<DimensionId>;
	selectedBucket?: AnalyticsBucketSelection<DimensionId> | null;
	limit?: number;
	labelForKey?: (dimension: DimensionId, key: AnalyticsKey) => string;
	locale?: string;
}

export interface AnalyticsQueryBucket<DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId> {
	key: string;
	groupBy: readonly DimensionId[];
	keys: readonly AnalyticsKey[];
	count: number;
}

export interface AnalyticsActiveFactor<FilterId extends AnalyticsFilterId = AnalyticsFilterId> {
	id: FilterId;
	valueKey: string;
	count: number;
}

export interface AnalyticsQueryResult<Row, TargetId extends AnalyticsTargetId = AnalyticsTargetId, DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId, FilterId extends AnalyticsFilterId = AnalyticsFilterId> {
	target: TargetId;
	groupBy: readonly DimensionId[];
	rows: Row[];
	listedRows: Row[];
	buckets: AnalyticsQueryBucket<DimensionId>[];
	limitedBuckets: AnalyticsQueryBucket<DimensionId>[];
	selectedBucket: AnalyticsQueryBucket<DimensionId> | null;
	activeFactors: AnalyticsActiveFactor<FilterId>[];
	totalCount: number;
	selectedCount: number;
	selectedPercent: number;
	topBucket: AnalyticsQueryBucket<DimensionId> | null;
}

export function queryAnalytics<Row, TargetId extends AnalyticsTargetId, DimensionId extends AnalyticsDimensionId, FilterId extends AnalyticsFilterId = AnalyticsFilterId>(query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>): AnalyticsQueryResult<Row, TargetId, DimensionId, FilterId> {
	validateAnalyticsQuery(query);

	const groupBy = [...query.groupBy] as DimensionId[];
	const activeFilters = (query.filters ?? []).filter((filter) => filter.isActive);
	const rows = query.rows.filter((row) => activeFilters.every((filter) => filter.matches(row)));
	const buckets = sortQueryBuckets(buildQueryBuckets({ rows, groupBy, dimensions: query.dimensions }), query);
	const selectedBucket = resolveSelectedBucket({ buckets, groupBy, selectedBucket: query.selectedBucket });
	const listedRows = selectedBucket ? rows.filter((row) => rowMatchesBucket({ row, bucket: selectedBucket, dimensions: query.dimensions })) : rows;

	return {
		target: query.target,
		groupBy,
		rows,
		listedRows,
		buckets,
		limitedBuckets: typeof query.limit === 'number' ? limitAnalyticsRows(buckets, query.limit) : buckets.slice(),
		selectedBucket,
		activeFactors: activeFilters.map((filter) => ({
			id: filter.id,
			valueKey: filter.valueKey,
			count: query.rows.filter((row) => filter.matches(row)).length
		})),
		totalCount: rows.length,
		selectedCount: listedRows.length,
		selectedPercent: analyticsPercent({ value: listedRows.length, total: rows.length }),
		topBucket: buckets[0] ?? null
	};
}

export function normalizeAnalyticsKeys<Key extends AnalyticsKey>(keys: readonly Key[], fallbackKey: Key): Key[] {
	return keys.length > 0 ? [...new Set(keys)] : [fallbackKey];
}

export function analyticsBucketKey(keys: readonly AnalyticsKey[]): string {
	return JSON.stringify(keys);
}

export function compareAnalyticsMissingLast<Key extends AnalyticsKey>(firstKey: Key, secondKey: Key, missingKeys: readonly Key[] = []): number {
	const firstMissing = missingKeys.includes(firstKey);
	const secondMissing = missingKeys.includes(secondKey);
	if (firstMissing && !secondMissing) return 1;
	if (!firstMissing && secondMissing) return -1;
	return 0;
}

export function analyticsPercent(input: { value: number; total: number }): number {
	if (input.total <= 0 || input.value <= 0) return 0;
	return Math.round((input.value / input.total) * 1000) / 10;
}

export function limitAnalyticsRows<Row>(rows: readonly Row[], limit: number): Row[] {
	if (!Number.isFinite(limit)) return [...rows];
	return rows.slice(0, Math.max(0, Math.trunc(limit)));
}

function validateAnalyticsQuery<Row, TargetId extends AnalyticsTargetId, DimensionId extends AnalyticsDimensionId, FilterId extends AnalyticsFilterId>(query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>): void {
	if (query.measure !== 'count') throw new Error(`Unsupported analytics measure: ${query.measure}`);
	if (query.groupBy.length < 1 || query.groupBy.length > 2) throw new Error('Analytics query groupBy must contain one or two dimensions.');

	for (const dimension of query.groupBy) {
		if (!query.dimensions[dimension]) throw new Error(`Analytics query references an unknown groupBy dimension: ${dimension}`);
	}

	const sortBy = query.sort?.by;
	if (!sortBy || sortBy === 'count' || sortBy === 'analysis') return;
	if (!query.dimensions[sortBy as DimensionId]) throw new Error(`Analytics query references an unknown sort dimension: ${sortBy}`);
	if (!query.groupBy.includes(sortBy as DimensionId)) throw new Error(`Analytics query sort dimension must be present in groupBy: ${sortBy}`);
}

function buildQueryBuckets<Row, DimensionId extends AnalyticsDimensionId>(input: { rows: readonly Row[]; groupBy: readonly DimensionId[]; dimensions: Readonly<Record<DimensionId, AnalyticsDimensionSpec<Row, DimensionId>>> }): AnalyticsQueryBucket<DimensionId>[] {
	const buckets = new Map<string, AnalyticsQueryBucket<DimensionId>>();

	for (const row of input.rows) {
		const rowBucketKeys = new Set<string>();
		for (const keys of rowKeyCombinations(row, input.groupBy, input.dimensions)) {
			const key = analyticsBucketKey(keys);
			if (rowBucketKeys.has(key)) continue;
			rowBucketKeys.add(key);

			const bucket = buckets.get(key) ?? { key, groupBy: [...input.groupBy], keys, count: 0 };
			bucket.count += 1;
			buckets.set(key, bucket);
		}
	}

	return [...buckets.values()];
}

function rowKeyCombinations<Row, DimensionId extends AnalyticsDimensionId>(row: Row, groupBy: readonly DimensionId[], dimensions: Readonly<Record<DimensionId, AnalyticsDimensionSpec<Row, DimensionId>>>): AnalyticsKey[][] {
	const dimensionKeys = groupBy.map((dimension) => {
		const spec = dimensions[dimension];
		return normalizeAnalyticsKeys(spec.keys(row), spec.fallbackKey);
	});

	if (dimensionKeys.length === 1) return dimensionKeys[0].map((key) => [key]);
	if (groupBy[0] === groupBy[1]) return dimensionKeys[0].map((key) => [key, key]);

	const combinations: AnalyticsKey[][] = [];
	for (const firstKey of dimensionKeys[0]) for (const secondKey of dimensionKeys[1]) combinations.push([firstKey, secondKey]);
	return combinations;
}

function sortQueryBuckets<Row, TargetId extends AnalyticsTargetId, DimensionId extends AnalyticsDimensionId, FilterId extends AnalyticsFilterId>(buckets: AnalyticsQueryBucket<DimensionId>[], query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>): AnalyticsQueryBucket<DimensionId>[] {
	const sort = query.sort ?? { by: 'count', direction: 'desc' as AnalyticsSortDirection };
	return [...buckets].sort((first, second) => {
		if (sort.by === 'count') {
			const countCompare = first.count - second.count;
			const orderedCountCompare = sort.direction === 'asc' ? countCompare : -countCompare;
			if (orderedCountCompare !== 0) return orderedCountCompare;
			return compareBucketByDimensions(first, second, query, query.groupBy);
		}

		const orderedDimensions = sort.by === 'analysis' ? query.groupBy : [sort.by as DimensionId, ...query.groupBy.filter((dimension) => dimension !== sort.by)];
		return compareBucketByDimensions(first, second, query, orderedDimensions, sort.direction);
	});
}

function compareBucketByDimensions<Row, TargetId extends AnalyticsTargetId, DimensionId extends AnalyticsDimensionId, FilterId extends AnalyticsFilterId>(
	first: AnalyticsQueryBucket<DimensionId>,
	second: AnalyticsQueryBucket<DimensionId>,
	query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>,
	dimensions: readonly DimensionId[],
	direction: AnalyticsSortDirection = 'asc'
): number {
	for (const dimension of dimensions) {
		const index = first.groupBy.indexOf(dimension);
		if (index < 0) continue;
		const keyCompare = compareBucketKeys(first.keys[index], second.keys[index], dimension, query, direction);
		if (keyCompare !== 0) return keyCompare;
	}

	return first.key.localeCompare(second.key);
}

function compareBucketKeys<Row, TargetId extends AnalyticsTargetId, DimensionId extends AnalyticsDimensionId, FilterId extends AnalyticsFilterId>(
	firstKey: AnalyticsKey,
	secondKey: AnalyticsKey,
	dimension: DimensionId,
	query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>,
	direction: AnalyticsSortDirection
): number {
	const spec = query.dimensions[dimension];
	const missingCompare = compareAnalyticsMissingLast(firstKey, secondKey, spec.missingKeys);
	if (missingCompare !== 0) return missingCompare;

	let compare = 0;
	if (spec.compareKeys) compare = spec.compareKeys(firstKey, secondKey);
	else if (query.labelForKey) compare = query.labelForKey(dimension, firstKey).localeCompare(query.labelForKey(dimension, secondKey), query.locale);
	else compare = firstKey.localeCompare(secondKey, query.locale);

	return direction === 'asc' ? compare : -compare;
}

function resolveSelectedBucket<DimensionId extends AnalyticsDimensionId>(input: { buckets: readonly AnalyticsQueryBucket<DimensionId>[]; groupBy: readonly DimensionId[]; selectedBucket?: AnalyticsBucketSelection<DimensionId> | null }): AnalyticsQueryBucket<DimensionId> | null {
	const selection = input.selectedBucket;
	if (!selection) return null;
	if (!sameDimensions(input.groupBy, selection.groupBy)) return null;
	if (selection.keys.length !== input.groupBy.length) return null;

	const selectionKey = analyticsBucketKey(selection.keys);
	return input.buckets.find((bucket) => bucket.key === selectionKey) ?? null;
}

function rowMatchesBucket<Row, DimensionId extends AnalyticsDimensionId>(input: { row: Row; bucket: AnalyticsQueryBucket<DimensionId>; dimensions: Readonly<Record<DimensionId, AnalyticsDimensionSpec<Row, DimensionId>>> }): boolean {
	return rowKeyCombinations(input.row, input.bucket.groupBy, input.dimensions).some((keys) => analyticsBucketKey(keys) === input.bucket.key);
}

function sameDimensions<DimensionId extends AnalyticsDimensionId>(first: readonly DimensionId[], second: readonly DimensionId[]): boolean {
	return first.length === second.length && first.every((dimension, index) => dimension === second[index]);
}
