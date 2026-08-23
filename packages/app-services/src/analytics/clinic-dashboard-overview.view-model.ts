import type { AnalyticsBarChartModel, AnalyticsChartDatum, AnalyticsChartTone, AnalyticsTrendChartModel } from '@vet/types/domain/analytics/charts.js';
import type { AnalyticsBucket, AnalyticsNamedBucket, ClinicAnalyticsAgeBandKey, ClinicAnalyticsPetCountBandKey, ClinicAnalyticsPetTreatmentSnapshot } from '@vet/types/clinic-analytics.js';
import { clinicAnalyticsAgeBandYear } from '@vet/types/clinic-analytics.js';
import type { TreatmentHistoryPoint } from '@vet/types/domain/treatment/analytics.js';
import { analyticsPercent, limitAnalyticsRows } from './analytics-query.js';
import type { ClinicAnalyticsOverview } from './clinic-analytics.service.js';

export type ClinicDashboardAgeRangeKey = 'underOne' | 'oneToThree' | 'fourToSeven' | 'eightPlus' | 'unknown';

export const clinicDashboardAgeRangeKeys = ['underOne', 'oneToThree', 'fourToSeven', 'eightPlus', 'unknown'] as const satisfies readonly ClinicDashboardAgeRangeKey[];

export interface ClinicDashboardOverviewLabels {
	pets: string;
	owners: string;
	records: string;
	vaccines: string;
	antiparasitics: string;
	tracked: string;
	notInformed: string;
	ageRanges: Record<ClinicDashboardAgeRangeKey, string>;
	species: (key: string) => string;
	breed: (key: string) => string;
	ownerLocation: (key: string, label: string | null) => string;
	ownerPetCount: (key: ClinicAnalyticsPetCountBandKey) => string;
}

export interface ClinicDashboardOverviewViewModelInput {
	overview: ClinicAnalyticsOverview | null | undefined;
	labels: ClinicDashboardOverviewLabels;
	chartLimit?: number;
}

export interface ClinicDashboardOverviewViewModel {
	kpis: AnalyticsChartDatum[];
	attention: AnalyticsChartDatum[];
	species: AnalyticsBarChartModel;
	breeds: AnalyticsBarChartModel;
	ageRanges: AnalyticsBarChartModel;
	ownerLocations: AnalyticsBarChartModel;
	ownerPetCounts: AnalyticsBarChartModel;
	vaccineHistory: AnalyticsTrendChartModel;
	antiparasiticHistory: AnalyticsTrendChartModel;
}

type TreatmentSnapshot = ClinicAnalyticsPetTreatmentSnapshot<string>;

export function buildClinicDashboardOverviewViewModel(input: ClinicDashboardOverviewViewModelInput): ClinicDashboardOverviewViewModel {
	const chartLimit = Math.max(1, Math.trunc(input.chartLimit ?? 8));
	const overview = input.overview;
	const vaccines = overview?.analytics.study.pets.flatMap((pet) => pet.vaccines) ?? [];
	const antiparasitics = overview?.analytics.study.pets.flatMap((pet) => pet.antiparasitics) ?? [];

	return {
		kpis: buildKpis(overview, input.labels),
		attention: buildAttention({ labels: input.labels, vaccines, antiparasitics }),
		species: buildBucketBarChart({
			buckets: overview?.analytics.pets.bySpecies ?? [],
			total: overview?.analytics.pets.total ?? 0,
			limit: chartLimit,
			labelForBucket: (bucket) => input.labels.species(bucket.key)
		}),
		breeds: buildBucketBarChart({
			buckets: overview?.analytics.pets.byBreed ?? [],
			total: overview?.analytics.pets.total ?? 0,
			limit: chartLimit,
			labelForBucket: (bucket) => input.labels.breed(bucket.key)
		}),
		ageRanges: buildAgeRangeChart({
			buckets: overview?.analytics.pets.byAge ?? [],
			total: overview?.analytics.pets.total ?? 0,
			labels: input.labels
		}),
		ownerLocations: buildBucketBarChart({
			buckets: overview?.analytics.owners.byLocation ?? [],
			total: overview?.analytics.owners.total ?? 0,
			limit: chartLimit,
			labelForBucket: (bucket) => input.labels.ownerLocation(bucket.key, 'label' in bucket ? bucket.label : null)
		}),
		ownerPetCounts: buildOwnerPetCountChart({
			buckets: overview?.analytics.owners.byPetCount ?? [],
			total: overview?.analytics.owners.total ?? 0,
			labels: input.labels
		}),
		vaccineHistory: buildTrendChart(overview?.vaccines.history ?? []),
		antiparasiticHistory: buildTrendChart(overview?.antiparasitics.history ?? [])
	};
}

function buildKpis(overview: ClinicAnalyticsOverview | null | undefined, labels: ClinicDashboardOverviewLabels): AnalyticsChartDatum[] {
	return [
		{ key: 'pets', label: labels.pets, value: overview?.counts.pets ?? 0, tone: 'info' },
		{ key: 'owners', label: labels.owners, value: overview?.counts.owners ?? 0, tone: 'neutral' },
		{ key: 'records', label: labels.records, value: overview?.counts.records ?? 0, tone: 'neutral' },
		{ key: 'vaccines', label: labels.vaccines, value: overview?.vaccines.totalTracked ?? 0, detail: labels.tracked, tone: 'success' },
		{ key: 'antiparasitics', label: labels.antiparasitics, value: overview?.antiparasitics.totalTracked ?? 0, detail: labels.tracked, tone: 'warning' }
	];
}

function buildAttention(input: { labels: ClinicDashboardOverviewLabels; vaccines: readonly TreatmentSnapshot[]; antiparasitics: readonly TreatmentSnapshot[] }): AnalyticsChartDatum[] {
	const vaccineCount = countAttentionTreatments(input.vaccines);
	const antiparasiticCount = countAttentionTreatments(input.antiparasitics);
	const vaccineTotal = input.vaccines.length;
	const antiparasiticTotal = input.antiparasitics.length;

	return [
		{
			key: 'vaccines',
			label: input.labels.vaccines,
			value: vaccineCount,
			percent: analyticsPercent({ value: vaccineCount, total: vaccineTotal }),
			tone: attentionTone(vaccineCount)
		},
		{
			key: 'antiparasitics',
			label: input.labels.antiparasitics,
			value: antiparasiticCount,
			percent: analyticsPercent({ value: antiparasiticCount, total: antiparasiticTotal }),
			tone: attentionTone(antiparasiticCount)
		}
	];
}

function countAttentionTreatments(items: readonly TreatmentSnapshot[]): number {
	return items.filter((item) => item.daysUntilDue <= 30).length;
}

function attentionTone(value: number): AnalyticsChartTone {
	return value > 0 ? 'danger' : 'success';
}

function buildBucketBarChart<Key extends string>(input: {
	buckets: readonly (AnalyticsBucket<Key> | AnalyticsNamedBucket<Key>)[];
	total: number;
	limit: number;
	labelForBucket: (bucket: AnalyticsBucket<Key> | AnalyticsNamedBucket<Key>) => string;
}): AnalyticsBarChartModel {
	const data = limitAnalyticsRows(sortBuckets(input.buckets), input.limit).map((bucket) => ({
		key: bucket.key,
		label: input.labelForBucket(bucket),
		value: bucket.count,
		percent: analyticsPercent({ value: bucket.count, total: input.total }),
		tone: 'info' as AnalyticsChartTone
	}));

	return { total: input.total, orientation: 'horizontal', data };
}

function buildAgeRangeChart(input: { buckets: readonly AnalyticsBucket<ClinicAnalyticsAgeBandKey>[]; total: number; labels: ClinicDashboardOverviewLabels }): AnalyticsBarChartModel {
	const counts = new Map<ClinicDashboardAgeRangeKey, number>(clinicDashboardAgeRangeKeys.map((key) => [key, 0]));
	for (const bucket of input.buckets) {
		const range = ageRange(bucket.key);
		counts.set(range, (counts.get(range) ?? 0) + bucket.count);
	}

	return {
		total: input.total,
		orientation: 'horizontal',
		data: clinicDashboardAgeRangeKeys.map((key) => ({
			key,
			label: input.labels.ageRanges[key],
			value: counts.get(key) ?? 0,
			percent: analyticsPercent({ value: counts.get(key) ?? 0, total: input.total }),
			tone: key === 'unknown' ? 'neutral' : 'info'
		}))
	};
}

function ageRange(key: ClinicAnalyticsAgeBandKey): ClinicDashboardAgeRangeKey {
	if (key === 'unknown') return 'unknown';
	if (key === 'months0To3' || key === 'months3To6' || key === 'months6To12') return 'underOne';

	const year = clinicAnalyticsAgeBandYear(key);
	if (year === null) return 'unknown';
	if (year <= 3) return 'oneToThree';
	if (year <= 7) return 'fourToSeven';
	return 'eightPlus';
}

function buildOwnerPetCountChart(input: { buckets: readonly AnalyticsBucket<ClinicAnalyticsPetCountBandKey>[]; total: number; labels: ClinicDashboardOverviewLabels }): AnalyticsBarChartModel {
	const bucketsByKey = new Map(input.buckets.map((bucket) => [bucket.key, bucket.count]));
	const keys = ['one', 'two', 'threePlus', 'none'] as const satisfies readonly ClinicAnalyticsPetCountBandKey[];

	return {
		total: input.total,
		orientation: 'horizontal',
		data: keys.map((key) => ({
			key,
			label: input.labels.ownerPetCount(key),
			value: bucketsByKey.get(key) ?? 0,
			percent: analyticsPercent({ value: bucketsByKey.get(key) ?? 0, total: input.total }),
			tone: key === 'none' ? 'neutral' : 'info'
		}))
	};
}

function buildTrendChart(points: readonly TreatmentHistoryPoint[]): AnalyticsTrendChartModel {
	return {
		total: points.reduce((total, point) => total + point.count, 0),
		data: points.map((point) => ({ key: point.key, label: point.label, value: point.count }))
	};
}

function sortBuckets<Key extends string>(buckets: readonly (AnalyticsBucket<Key> | AnalyticsNamedBucket<Key>)[]): (AnalyticsBucket<Key> | AnalyticsNamedBucket<Key>)[] {
	return [...buckets].sort((first, second) => {
		if (first.key === 'unknown' && second.key !== 'unknown') return 1;
		if (first.key !== 'unknown' && second.key === 'unknown') return -1;
		return second.count - first.count || labelOfBucket(first).localeCompare(labelOfBucket(second));
	});
}

function labelOfBucket<Key extends string>(bucket: AnalyticsBucket<Key> | AnalyticsNamedBucket<Key>): string {
	return 'label' in bucket && bucket.label ? bucket.label : bucket.key;
}
