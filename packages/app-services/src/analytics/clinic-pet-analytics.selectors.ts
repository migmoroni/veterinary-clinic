import {
	clinicAnalyticsAgeBandSortValue,
	clinicAnalyticsTreatmentStatusWeight,
	type AnalyticsBucket,
	type AnalyticsBucketSortField,
	type AnalyticsSortDirection,
	type ClinicAnalytics,
	type ClinicAnalyticsPetDimension,
	type ClinicAnalyticsPetStudyItem,
	type ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import { compareAnalyticsUnknownLast, sortAnalyticsBuckets } from './analytics-bucket.selectors.js';

export type ClinicAnalyticsPetSortOrder = 'name' | 'age' | 'vaccineStatus' | 'owner';

export function selectClinicPetAnalyticsBuckets(analytics: ClinicAnalytics, dimension: ClinicAnalyticsPetDimension): AnalyticsBucket[] {
	if (dimension === 'species') return analytics.pets.bySpecies;
	if (dimension === 'breed') return analytics.pets.byBreed;
	if (dimension === 'sex') return analytics.pets.bySex;
	if (dimension === 'age') return analytics.pets.byAge;
	return analytics.pets.byVaccineStatus;
}

export function sortClinicPetAnalyticsBuckets(input: {
	buckets: AnalyticsBucket[];
	dimension: ClinicAnalyticsPetDimension;
	field: AnalyticsBucketSortField;
	direction: AnalyticsSortDirection;
	labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
	locale: string;
}): AnalyticsBucket[] {
	const { buckets, dimension, field, direction, labelForKey, locale } = input;
	return sortAnalyticsBuckets({
		buckets,
		field,
		direction,
		compareByAnalysis: (first, second) => compareClinicPetAnalyticsBucketKeys({ firstKey: first.key, secondKey: second.key, dimension, labelForKey, locale })
	});
}

export function filterClinicAnalyticsPetsByBucket(pets: ClinicAnalyticsPetStudyItem[], dimension: ClinicAnalyticsPetDimension, bucketKey: string): ClinicAnalyticsPetStudyItem[] {
	if (!bucketKey) return pets;
	return pets.filter((pet) => clinicAnalyticsPetMatchesBucket(pet, dimension, bucketKey));
}

export function sortClinicAnalyticsPets(pets: ClinicAnalyticsPetStudyItem[], order: ClinicAnalyticsPetSortOrder): ClinicAnalyticsPetStudyItem[] {
	return [...pets].sort((first, second) => {
		if (order === 'age') {
			const ageCompare = clinicAnalyticsAgeBandSortValue(first.age) - clinicAnalyticsAgeBandSortValue(second.age);
			if (ageCompare !== 0) return ageCompare;
		}

		if (order === 'vaccineStatus') {
			const statusCompare = clinicAnalyticsTreatmentStatusWeight[second.vaccineStatus] - clinicAnalyticsTreatmentStatusWeight[first.vaccineStatus];
			if (statusCompare !== 0) return statusCompare;
		}

		if (order === 'owner') {
			const ownerCompare = clinicAnalyticsPetOwnerText(first).localeCompare(clinicAnalyticsPetOwnerText(second));
			if (ownerCompare !== 0) return ownerCompare;
		}

		return first.name.localeCompare(second.name);
	});
}

function compareClinicPetAnalyticsBucketKeys(input: {
	firstKey: string;
	secondKey: string;
	dimension: ClinicAnalyticsPetDimension;
	labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
	locale: string;
}): number {
	const { firstKey, secondKey, dimension, labelForKey, locale } = input;
	const unknownCompare = compareAnalyticsUnknownLast(firstKey, secondKey);
	if (unknownCompare !== 0) return unknownCompare;

	if (dimension === 'age') return clinicAnalyticsAgeBandSortValue(firstKey) - clinicAnalyticsAgeBandSortValue(secondKey);
	if (dimension === 'vaccineStatus') return clinicAnalyticsTreatmentStatusWeight[firstKey as ClinicAnalyticsVaccineStatusKey] - clinicAnalyticsTreatmentStatusWeight[secondKey as ClinicAnalyticsVaccineStatusKey];
	return labelForKey(dimension, firstKey).localeCompare(labelForKey(dimension, secondKey), locale);
}

function clinicAnalyticsPetMatchesBucket(pet: ClinicAnalyticsPetStudyItem, dimension: ClinicAnalyticsPetDimension, key: string): boolean {
	if (dimension === 'species') return pet.species === key;
	if (dimension === 'breed') return pet.breed === key;
	if (dimension === 'sex') return pet.sex === key;
	if (dimension === 'age') return pet.age === key;
	return pet.vaccineStatus === key;
}

function clinicAnalyticsPetOwnerText(pet: ClinicAnalyticsPetStudyItem): string {
	return pet.owners.map((owner) => owner.name).join(' - ');
}
