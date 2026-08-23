import type {
	AnalyticsBucketSortField,
	AnalyticsSortDirection,
	ClinicAnalytics,
	ClinicAnalyticsOwnerDimension,
	ClinicAnalyticsOwnerStudyItem
} from '@vet/types/clinic-analytics.js';
import { clinicAnalyticsOwnerDimensions } from '@vet/types/clinic-analytics.js';
import { analyticsPercent, queryAnalytics, type AnalyticsDimensionSpec } from './analytics-query.js';
import {
	clinicAnalyticsOwnerPetCountBand,
	clinicAnalyticsOwnerVaccineStatus,
	listClinicAnalyticsOwnerPetAgeKeys,
	listClinicAnalyticsOwnerPetSpeciesKeys,
	selectClinicOwnerAnalyticsBuckets,
	sortClinicAnalyticsOwners,
	sortClinicOwnerAnalyticsBuckets,
	type ClinicAnalyticsOwnerBucket,
	type ClinicAnalyticsOwnerSortOrder
} from './clinic-owner-analytics.selectors.js';

type OwnerQueryDimension = 'ownerLocation' | 'ownerPetCount' | 'ownerPetSpecies' | 'petAge' | 'ownerPetVaccineStatus';

export interface ClinicOwnerAnalyticsBucketView extends ClinicAnalyticsOwnerBucket {
	percent: number;
}

export interface ClinicOwnerAnalyticsViewModelInput {
	analytics: ClinicAnalytics | null | undefined;
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	activeDimension: ClinicAnalyticsOwnerDimension;
	selectedBucketKey: string;
	bucketSortField: AnalyticsBucketSortField;
	bucketSortDirection: AnalyticsSortDirection;
	listSortOrder: ClinicAnalyticsOwnerSortOrder;
	bucketLimit: number;
	labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
	locale: string;
}

export interface ClinicOwnerAnalyticsViewModel {
	buckets: ClinicOwnerAnalyticsBucketView[];
	limitedBuckets: ClinicOwnerAnalyticsBucketView[];
	selectedBucket: ClinicOwnerAnalyticsBucketView | null;
	listedOwners: ClinicAnalyticsOwnerStudyItem[];
	totalCount: number;
	selectedCount: number;
	selectedPercent: number;
	topBucket: ClinicOwnerAnalyticsBucketView | null;
}

export type ClinicOwnerAnalyticsSummaryViewModels = Record<ClinicAnalyticsOwnerDimension, ClinicOwnerAnalyticsSummaryViewModel>;

export interface ClinicOwnerAnalyticsSummaryViewModelInput {
	analytics: ClinicAnalytics | null | undefined;
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	bucketLimit: number;
	labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
	locale: string;
}

export interface ClinicOwnerAnalyticsSummaryViewModel {
	buckets: ClinicOwnerAnalyticsBucketView[];
	limitedBuckets: ClinicOwnerAnalyticsBucketView[];
	totalCount: number;
	topBucket: ClinicOwnerAnalyticsBucketView | null;
}

export function buildClinicOwnerAnalyticsViewModel(input: ClinicOwnerAnalyticsViewModelInput): ClinicOwnerAnalyticsViewModel {
	const dimension = ownerQueryDimension(input.activeDimension);
	const dimensions = ownerQueryDimensions(input.activeDimension);
	const universeBuckets = input.analytics ? selectClinicOwnerAnalyticsBuckets({ analytics: input.analytics, owners: input.owners, dimension: input.activeDimension }) : [];
	const queryResult = queryAnalytics({
		target: 'owners',
		rows: input.owners,
		dimensions,
		groupBy: [dimension],
		measure: 'count',
		sort: { by: input.bucketSortField, direction: input.bucketSortDirection },
		selectedBucket: input.selectedBucketKey ? { groupBy: [dimension], keys: [input.selectedBucketKey] } : null,
		labelForKey: (_dimension, key) => input.labelForBucket(input.activeDimension, { key, count: 0 }),
		locale: input.locale
	});
	const queryBuckets = new Map(queryResult.buckets.map((bucket) => [bucket.keys[0] ?? '', bucket.count]));
	const mergedBuckets = universeBuckets.map((bucket) => ({ ...bucket, count: queryBuckets.get(bucket.key) ?? 0 }));
	const mergedBucketKeys = new Set(mergedBuckets.map((bucket) => bucket.key));
	for (const bucket of queryResult.buckets) {
		const key = bucket.keys[0] ?? '';
		if (!key || mergedBucketKeys.has(key)) continue;
		mergedBuckets.push({ key, count: bucket.count });
		mergedBucketKeys.add(key);
	}

	const sortedBuckets = sortClinicOwnerAnalyticsBuckets({
		buckets: mergedBuckets,
		dimension: input.activeDimension,
		field: input.bucketSortField,
		direction: input.bucketSortDirection,
		labelForBucket: input.labelForBucket,
		locale: input.locale
	});
	const bucketViews = addOwnerBucketPercents(sortedBuckets, queryResult.totalCount);
	const selectedBucket = input.selectedBucketKey ? (bucketViews.find((bucket) => bucket.key === input.selectedBucketKey) ?? null) : null;
	const listedRows = input.selectedBucketKey && selectedBucket && !queryResult.selectedBucket ? [] : queryResult.listedRows;
	const listedOwners = sortClinicAnalyticsOwners(listedRows, input.listSortOrder, input.locale);
	const selectedPercent = input.selectedBucketKey && selectedBucket ? analyticsPercent({ value: listedOwners.length, total: queryResult.totalCount }) : queryResult.selectedPercent;

	return {
		buckets: bucketViews,
		limitedBuckets: bucketViews.slice(0, Math.max(0, Math.trunc(input.bucketLimit))),
		selectedBucket,
		listedOwners,
		totalCount: queryResult.totalCount,
		selectedCount: listedOwners.length,
		selectedPercent,
		topBucket: bucketViews[0] ?? null
	};
}

export function buildClinicOwnerAnalyticsSummaryViewModels(input: ClinicOwnerAnalyticsSummaryViewModelInput): ClinicOwnerAnalyticsSummaryViewModels {
	const summaries = {} as ClinicOwnerAnalyticsSummaryViewModels;
	for (const dimension of clinicAnalyticsOwnerDimensions) summaries[dimension] = buildClinicOwnerAnalyticsSummaryViewModel(input, dimension);
	return summaries;
}

function buildClinicOwnerAnalyticsSummaryViewModel(input: ClinicOwnerAnalyticsSummaryViewModelInput, dimension: ClinicAnalyticsOwnerDimension): ClinicOwnerAnalyticsSummaryViewModel {
	const sourceBuckets = input.analytics ? selectClinicOwnerAnalyticsBuckets({ analytics: input.analytics, owners: input.owners, dimension }) : buildOwnerBucketsFromItems(input.owners, dimension);
	const sortedBuckets = sortClinicOwnerAnalyticsBuckets({
		buckets: sourceBuckets.map((bucket) => ({ ...bucket })),
		dimension,
		field: 'count',
		direction: 'desc',
		labelForBucket: input.labelForBucket,
		locale: input.locale
	});
	const bucketViews = addOwnerBucketPercents(sortedBuckets, input.owners.length);

	return {
		buckets: bucketViews,
		limitedBuckets: bucketViews.slice(0, Math.max(0, Math.trunc(input.bucketLimit))),
		totalCount: input.owners.length,
		topBucket: bucketViews[0] ?? null
	};
}

function ownerQueryDimension(dimension: ClinicAnalyticsOwnerDimension): OwnerQueryDimension {
	if (dimension === 'location') return 'ownerLocation';
	if (dimension === 'petCount') return 'ownerPetCount';
	if (dimension === 'petSpecies') return 'ownerPetSpecies';
	if (dimension === 'petAge') return 'petAge';
	return 'ownerPetVaccineStatus';
}

function ownerQueryDimensions(activeDimension: ClinicAnalyticsOwnerDimension): Record<OwnerQueryDimension, AnalyticsDimensionSpec<ClinicAnalyticsOwnerStudyItem, OwnerQueryDimension>> {
	return {
		ownerLocation: { id: 'ownerLocation', keys: (owner) => [owner.locationKey], fallbackKey: 'unknown', missingKeys: ['unknown'] },
		ownerPetCount: { id: 'ownerPetCount', keys: (owner) => [clinicAnalyticsOwnerPetCountBand(owner.petCount)], fallbackKey: 'unknown', missingKeys: ['unknown'] },
		ownerPetSpecies: { id: 'ownerPetSpecies', keys: listClinicAnalyticsOwnerPetSpeciesKeys, fallbackKey: 'unknown', missingKeys: ['unknown'] },
		petAge: { id: 'petAge', keys: listClinicAnalyticsOwnerPetAgeKeys, fallbackKey: 'unknown', missingKeys: ['unknown'] },
		ownerPetVaccineStatus: { id: 'ownerPetVaccineStatus', keys: (owner) => [clinicAnalyticsOwnerVaccineStatus(owner)], fallbackKey: 'untracked' }
	};
}

function buildOwnerBucketsFromItems(owners: readonly ClinicAnalyticsOwnerStudyItem[], dimension: ClinicAnalyticsOwnerDimension): ClinicAnalyticsOwnerBucket[] {
	const buckets = new Map<string, ClinicAnalyticsOwnerBucket>();
	for (const owner of owners) for (const bucket of ownerBuckets(owner, dimension)) incrementOwnerBucket(buckets, bucket.key, bucket.label);
	return [...buckets.values()];
}

function ownerBuckets(owner: ClinicAnalyticsOwnerStudyItem, dimension: ClinicAnalyticsOwnerDimension): ClinicAnalyticsOwnerBucket[] {
	if (dimension === 'location') return [{ key: owner.locationKey, label: owner.locationLabel, count: 0 }];
	if (dimension === 'petCount') return [{ key: clinicAnalyticsOwnerPetCountBand(owner.petCount), count: 0 }];
	if (dimension === 'petSpecies') return listClinicAnalyticsOwnerPetSpeciesKeys(owner).map((key) => ({ key, count: 0 }));
	if (dimension === 'petAge') return listClinicAnalyticsOwnerPetAgeKeys(owner).map((key) => ({ key, count: 0 }));
	return [{ key: clinicAnalyticsOwnerVaccineStatus(owner), count: 0 }];
}

function incrementOwnerBucket(buckets: Map<string, ClinicAnalyticsOwnerBucket>, key: string, label: string | null = null): void {
	const bucket = buckets.get(key) ?? { key, label, count: 0 };
	bucket.count += 1;
	if (label && !bucket.label) bucket.label = label;
	buckets.set(key, bucket);
}

function addOwnerBucketPercents(buckets: ClinicAnalyticsOwnerBucket[], total: number): ClinicOwnerAnalyticsBucketView[] {
	return buckets.map((bucket) => ({ ...bucket, percent: analyticsPercent({ value: bucket.count, total }) }));
}
