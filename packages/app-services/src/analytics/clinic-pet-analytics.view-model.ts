import type {
	AnalyticsBucket,
	AnalyticsBucketSortField,
	AnalyticsSortDirection,
	ClinicAnalytics,
	ClinicAnalyticsPetDimension,
	ClinicAnalyticsPetStudyItem
} from '@vet/types/clinic-analytics.js';
import { clinicAnalyticsPetDimensions } from '@vet/types/clinic-analytics.js';
import { analyticsPercent, queryAnalytics, type AnalyticsDimensionSpec } from './analytics-query.js';
import { selectClinicPetAnalyticsBuckets, sortClinicAnalyticsPets, sortClinicPetAnalyticsBuckets, type ClinicAnalyticsPetSortOrder } from './clinic-pet-analytics.selectors.js';

type PetQueryDimension = 'petSpecies' | 'petBreed' | 'petSex' | 'petAge' | 'petVaccineStatus';

export interface ClinicPetAnalyticsBucketView extends AnalyticsBucket {
	percent: number;
}

export interface ClinicPetAnalyticsViewModelInput {
	analytics: ClinicAnalytics | null | undefined;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	activeDimension: ClinicAnalyticsPetDimension;
	selectedBucketKey: string;
	bucketSortField: AnalyticsBucketSortField;
	bucketSortDirection: AnalyticsSortDirection;
	listSortOrder: ClinicAnalyticsPetSortOrder;
	bucketLimit: number;
	labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
	locale: string;
}

export interface ClinicPetAnalyticsViewModel {
	buckets: ClinicPetAnalyticsBucketView[];
	limitedBuckets: ClinicPetAnalyticsBucketView[];
	selectedBucket: ClinicPetAnalyticsBucketView | null;
	listedPets: ClinicAnalyticsPetStudyItem[];
	totalCount: number;
	selectedCount: number;
	selectedPercent: number;
	topBucket: ClinicPetAnalyticsBucketView | null;
}

export type ClinicPetAnalyticsSummaryViewModels = Record<ClinicAnalyticsPetDimension, ClinicPetAnalyticsSummaryViewModel>;

export interface ClinicPetAnalyticsSummaryViewModelInput {
	analytics: ClinicAnalytics | null | undefined;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	bucketLimit: number;
	labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
	locale: string;
}

export interface ClinicPetAnalyticsSummaryViewModel {
	buckets: ClinicPetAnalyticsBucketView[];
	limitedBuckets: ClinicPetAnalyticsBucketView[];
	totalCount: number;
	topBucket: ClinicPetAnalyticsBucketView | null;
}

export function buildClinicPetAnalyticsViewModel(input: ClinicPetAnalyticsViewModelInput): ClinicPetAnalyticsViewModel {
	const dimension = petQueryDimension(input.activeDimension);
	const dimensions = petQueryDimensions(input.activeDimension);
	const universeBuckets = input.analytics ? selectClinicPetAnalyticsBuckets(input.analytics, input.activeDimension) : [];
	const queryResult = queryAnalytics({
		target: 'pets',
		rows: input.pets,
		dimensions,
		groupBy: [dimension],
		measure: 'count',
		sort: { by: input.bucketSortField, direction: input.bucketSortDirection },
		selectedBucket: input.selectedBucketKey ? { groupBy: [dimension], keys: [input.selectedBucketKey] } : null,
		labelForKey: (_dimension, key) => input.labelForKey(input.activeDimension, key),
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

	const sortedBuckets = sortClinicPetAnalyticsBuckets({
		buckets: mergedBuckets,
		dimension: input.activeDimension,
		field: input.bucketSortField,
		direction: input.bucketSortDirection,
		labelForKey: input.labelForKey,
		locale: input.locale
	});
	const bucketViews = addPetBucketPercents(sortedBuckets, queryResult.totalCount);
	const selectedBucket = input.selectedBucketKey ? (bucketViews.find((bucket) => bucket.key === input.selectedBucketKey) ?? null) : null;
	const listedRows = input.selectedBucketKey && selectedBucket && !queryResult.selectedBucket ? [] : queryResult.listedRows;
	const listedPets = sortClinicAnalyticsPets(listedRows, input.listSortOrder);
	const selectedPercent = input.selectedBucketKey && selectedBucket ? analyticsPercent({ value: listedPets.length, total: queryResult.totalCount }) : queryResult.selectedPercent;

	return {
		buckets: bucketViews,
		limitedBuckets: bucketViews.slice(0, Math.max(0, Math.trunc(input.bucketLimit))),
		selectedBucket,
		listedPets,
		totalCount: queryResult.totalCount,
		selectedCount: listedPets.length,
		selectedPercent,
		topBucket: bucketViews[0] ?? null
	};
}

export function buildClinicPetAnalyticsSummaryViewModels(input: ClinicPetAnalyticsSummaryViewModelInput): ClinicPetAnalyticsSummaryViewModels {
	const summaries = {} as ClinicPetAnalyticsSummaryViewModels;
	for (const dimension of clinicAnalyticsPetDimensions) summaries[dimension] = buildClinicPetAnalyticsSummaryViewModel(input, dimension);
	return summaries;
}

function buildClinicPetAnalyticsSummaryViewModel(input: ClinicPetAnalyticsSummaryViewModelInput, dimension: ClinicAnalyticsPetDimension): ClinicPetAnalyticsSummaryViewModel {
	const sourceBuckets = input.analytics ? selectClinicPetAnalyticsBuckets(input.analytics, dimension) : buildPetBucketsFromItems(input.pets, dimension);
	const sortedBuckets = sortClinicPetAnalyticsBuckets({
		buckets: sourceBuckets.map((bucket) => ({ ...bucket })),
		dimension,
		field: 'count',
		direction: 'desc',
		labelForKey: input.labelForKey,
		locale: input.locale
	});
	const bucketViews = addPetBucketPercents(sortedBuckets, input.pets.length);

	return {
		buckets: bucketViews,
		limitedBuckets: bucketViews.slice(0, Math.max(0, Math.trunc(input.bucketLimit))),
		totalCount: input.pets.length,
		topBucket: bucketViews[0] ?? null
	};
}

function petQueryDimension(dimension: ClinicAnalyticsPetDimension): PetQueryDimension {
	if (dimension === 'species') return 'petSpecies';
	if (dimension === 'breed') return 'petBreed';
	if (dimension === 'sex') return 'petSex';
	if (dimension === 'age') return 'petAge';
	return 'petVaccineStatus';
}

function petQueryDimensions(activeDimension: ClinicAnalyticsPetDimension): Record<PetQueryDimension, AnalyticsDimensionSpec<ClinicAnalyticsPetStudyItem, PetQueryDimension>> {
	return {
		petSpecies: { id: 'petSpecies', keys: (pet) => [pet.species], fallbackKey: 'unknown', missingKeys: ['unknown'] },
		petBreed: { id: 'petBreed', keys: (pet) => [pet.breed], fallbackKey: 'unknown', missingKeys: ['unknown'] },
		petSex: { id: 'petSex', keys: (pet) => [pet.sex], fallbackKey: 'unknown', missingKeys: ['unknown'] },
		petAge: {
			id: 'petAge',
			keys: (pet) => [pet.age],
			fallbackKey: 'unknown',
			missingKeys: ['unknown'],
			compareKeys: (_first, _second) => 0
		},
		petVaccineStatus: { id: 'petVaccineStatus', keys: (pet) => [pet.vaccineStatus], fallbackKey: 'untracked' }
	};
}

function buildPetBucketsFromItems(pets: readonly ClinicAnalyticsPetStudyItem[], dimension: ClinicAnalyticsPetDimension): AnalyticsBucket[] {
	const buckets = new Map<string, number>();
	for (const pet of pets) {
		const key = petBucketKey(pet, dimension);
		buckets.set(key, (buckets.get(key) ?? 0) + 1);
	}
	return [...buckets.entries()].map(([key, count]) => ({ key, count }));
}

function petBucketKey(pet: ClinicAnalyticsPetStudyItem, dimension: ClinicAnalyticsPetDimension): string {
	if (dimension === 'species') return pet.species;
	if (dimension === 'breed') return pet.breed;
	if (dimension === 'sex') return pet.sex;
	if (dimension === 'age') return pet.age;
	return pet.vaccineStatus;
}

function addPetBucketPercents(buckets: AnalyticsBucket[], total: number): ClinicPetAnalyticsBucketView[] {
	return buckets.map((bucket) => ({ ...bucket, percent: analyticsPercent({ value: bucket.count, total }) }));
}
