import {
	clinicAnalyticsAgeBandSortValue,
	clinicAnalyticsPetCountBandWeight,
	clinicAnalyticsTreatmentStatusWeight,
	type AnalyticsBucket,
	type AnalyticsBucketSortField,
	type AnalyticsSortDirection,
	type ClinicAnalytics,
	type ClinicAnalyticsAntiparasiticStatusKey,
	type ClinicAnalyticsOwnerDimension,
	type ClinicAnalyticsOwnerStudyItem,
	type ClinicAnalyticsPetCountBandKey,
	type ClinicAnalyticsSpeciesKey,
	type ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import { compareAnalyticsUnknownLast, sortAnalyticsBuckets } from './analytics-bucket.selectors.js';

export type ClinicAnalyticsOwnerSortOrder = 'name' | 'location' | 'petCount' | 'vaccineStatus';
export type ClinicAnalyticsOwnerBucket = AnalyticsBucket & { label?: string | null };

export function clinicAnalyticsOwnerPetCountBand(value: number): ClinicAnalyticsPetCountBandKey {
	if (value <= 0) return 'none';
	if (value === 1) return 'one';
	if (value === 2) return 'two';
	return 'threePlus';
}

export function clinicAnalyticsOwnerVaccineStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsVaccineStatusKey {
	let status: ClinicAnalyticsVaccineStatusKey = 'untracked';
	for (const pet of owner.pets) if (clinicAnalyticsTreatmentStatusWeight[pet.vaccineStatus] > clinicAnalyticsTreatmentStatusWeight[status]) status = pet.vaccineStatus;
	return status;
}

export function clinicAnalyticsOwnerAntiparasiticStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsAntiparasiticStatusKey {
	let status: ClinicAnalyticsAntiparasiticStatusKey = 'untracked';
	for (const pet of owner.pets) if (clinicAnalyticsTreatmentStatusWeight[pet.antiparasiticStatus] > clinicAnalyticsTreatmentStatusWeight[status]) status = pet.antiparasiticStatus;
	return status;
}

export function listClinicAnalyticsOwnerPetSpeciesKeys(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsSpeciesKey[] {
	const keys: string[] = [];
	for (const pet of owner.pets) addUnique(keys, pet.species);
	return (keys.length > 0 ? keys : ['unknown']) as ClinicAnalyticsSpeciesKey[];
}

export function listClinicAnalyticsOwnerPetAgeKeys(owner: ClinicAnalyticsOwnerStudyItem): string[] {
	const keys: string[] = [];
	for (const pet of owner.pets) addUnique(keys, pet.age);
	return keys.length > 0 ? keys : ['unknown'];
}

export function selectClinicOwnerAnalyticsBuckets(input: {
	analytics: ClinicAnalytics;
	owners: ClinicAnalyticsOwnerStudyItem[];
	dimension: ClinicAnalyticsOwnerDimension;
}): ClinicAnalyticsOwnerBucket[] {
	const { analytics, owners, dimension } = input;
	if (dimension === 'location') return analytics.owners.byLocation.map((bucket) => ({ key: bucket.key, label: bucket.label, count: bucket.count }));
	if (dimension === 'petCount') return analytics.owners.byPetCount.map((bucket) => ({ key: bucket.key, count: bucket.count }));
	if (dimension === 'petSpecies') return clinicAnalyticsOwnerPetSpeciesBuckets(owners);
	if (dimension === 'petAge') return clinicAnalyticsOwnerPetAgeBuckets(analytics, owners);
	return analytics.owners.byPetVaccineStatus.map((bucket) => ({ key: bucket.key, count: bucket.count }));
}

export function sortClinicOwnerAnalyticsBuckets(input: {
	buckets: ClinicAnalyticsOwnerBucket[];
	dimension: ClinicAnalyticsOwnerDimension;
	field: AnalyticsBucketSortField;
	direction: AnalyticsSortDirection;
	labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
	locale: string;
}): ClinicAnalyticsOwnerBucket[] {
	const { buckets, dimension, field, direction, labelForBucket, locale } = input;
	return sortAnalyticsBuckets({
		buckets,
		field,
		direction,
		compareByAnalysis: (first, second) => compareClinicOwnerAnalyticsBucketKeys({ first, second, dimension, labelForBucket, locale })
	});
}

export function filterClinicAnalyticsOwnersByBucket(owners: ClinicAnalyticsOwnerStudyItem[], dimension: ClinicAnalyticsOwnerDimension, bucketKey: string): ClinicAnalyticsOwnerStudyItem[] {
	if (!bucketKey) return owners;
	return owners.filter((owner) => clinicAnalyticsOwnerMatchesBucket(owner, dimension, bucketKey));
}

export function sortClinicAnalyticsOwners(owners: ClinicAnalyticsOwnerStudyItem[], order: ClinicAnalyticsOwnerSortOrder, locale: string): ClinicAnalyticsOwnerStudyItem[] {
	return [...owners].sort((first, second) => {
		if (order === 'location') {
			const locationCompare = clinicAnalyticsOwnerLocationText(first).localeCompare(clinicAnalyticsOwnerLocationText(second), locale);
			if (locationCompare !== 0) return locationCompare;
		}

		if (order === 'petCount') {
			const petCountCompare = second.petCount - first.petCount;
			if (petCountCompare !== 0) return petCountCompare;
		}

		if (order === 'vaccineStatus') {
			const statusCompare = clinicAnalyticsTreatmentStatusWeight[clinicAnalyticsOwnerVaccineStatus(second)] - clinicAnalyticsTreatmentStatusWeight[clinicAnalyticsOwnerVaccineStatus(first)];
			if (statusCompare !== 0) return statusCompare;
		}

		return first.name.localeCompare(second.name, locale);
	});
}

function clinicAnalyticsOwnerPetSpeciesBuckets(owners: ClinicAnalyticsOwnerStudyItem[]): ClinicAnalyticsOwnerBucket[] {
	const buckets = new Map<string, ClinicAnalyticsOwnerBucket>();
	for (const owner of owners) for (const key of listClinicAnalyticsOwnerPetSpeciesKeys(owner)) incrementBucket(buckets, key);
	return toOwnerBuckets(buckets);
}

function clinicAnalyticsOwnerPetAgeBuckets(analytics: ClinicAnalytics, owners: ClinicAnalyticsOwnerStudyItem[]): ClinicAnalyticsOwnerBucket[] {
	const buckets = new Map<string, ClinicAnalyticsOwnerBucket>();
	for (const owner of owners) for (const key of listClinicAnalyticsOwnerPetAgeKeys(owner)) incrementBucket(buckets, key);
	for (const bucket of analytics.pets.byAge) if (bucket.key !== 'unknown') ensureBucket(buckets, bucket.key);
	return toOwnerBuckets(buckets);
}

function compareClinicOwnerAnalyticsBucketKeys(input: {
	first: ClinicAnalyticsOwnerBucket;
	second: ClinicAnalyticsOwnerBucket;
	dimension: ClinicAnalyticsOwnerDimension;
	labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
	locale: string;
}): number {
	const { first, second, dimension, labelForBucket, locale } = input;
	const unknownCompare = compareAnalyticsUnknownLast(first.key, second.key);
	if (unknownCompare !== 0) return unknownCompare;

	if (dimension === 'petCount') return clinicAnalyticsPetCountBandWeight[first.key as ClinicAnalyticsPetCountBandKey] - clinicAnalyticsPetCountBandWeight[second.key as ClinicAnalyticsPetCountBandKey];
	if (dimension === 'petAge') return clinicAnalyticsAgeBandSortValue(first.key) - clinicAnalyticsAgeBandSortValue(second.key);
	if (dimension === 'petVaccineStatus') return clinicAnalyticsTreatmentStatusWeight[first.key as ClinicAnalyticsVaccineStatusKey] - clinicAnalyticsTreatmentStatusWeight[second.key as ClinicAnalyticsVaccineStatusKey];
	return labelForBucket(dimension, first).localeCompare(labelForBucket(dimension, second), locale);
}

function clinicAnalyticsOwnerMatchesBucket(owner: ClinicAnalyticsOwnerStudyItem, dimension: ClinicAnalyticsOwnerDimension, key: string): boolean {
	if (dimension === 'location') return owner.locationKey === key;
	if (dimension === 'petCount') return clinicAnalyticsOwnerPetCountBand(owner.petCount) === key;
	if (dimension === 'petSpecies') return listClinicAnalyticsOwnerPetSpeciesKeys(owner).includes(key as ClinicAnalyticsSpeciesKey);
	if (dimension === 'petAge') return listClinicAnalyticsOwnerPetAgeKeys(owner).includes(key);
	return clinicAnalyticsOwnerVaccineStatus(owner) === key;
}

function clinicAnalyticsOwnerLocationText(owner: ClinicAnalyticsOwnerStudyItem): string {
	return owner.locationLabel ?? owner.cityLabel ?? owner.locationKey ?? owner.cityKey;
}

function incrementBucket(buckets: Map<string, ClinicAnalyticsOwnerBucket>, key: string, label: string | null = null): void {
	const bucket = buckets.get(key) ?? { key, label, count: 0 };
	bucket.count += 1;
	if (label) bucket.label = label;
	buckets.set(key, bucket);
}

function ensureBucket(buckets: Map<string, ClinicAnalyticsOwnerBucket>, key: string, label: string | null = null): void {
	if (!buckets.has(key)) buckets.set(key, { key, label, count: 0 });
}

function toOwnerBuckets(buckets: Map<string, ClinicAnalyticsOwnerBucket>): ClinicAnalyticsOwnerBucket[] {
	return [...buckets.values()].sort((first, second) => second.count - first.count || bucketLabelText(first).localeCompare(bucketLabelText(second)));
}

function addUnique(values: string[], value: string): void {
	if (!values.includes(value)) values.push(value);
}

function bucketLabelText(bucket: ClinicAnalyticsOwnerBucket): string {
	return bucket.label?.trim() || bucket.key;
}
