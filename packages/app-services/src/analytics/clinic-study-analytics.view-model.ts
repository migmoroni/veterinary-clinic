import type {
	AnalyticsBucket,
	AnalyticsNamedBucket,
	ClinicAnalyticsAntiparasiticStatusKey,
	ClinicAnalyticsOwnerStudyItem,
	ClinicAnalyticsPetCountBandKey,
	ClinicAnalyticsPetStudyItem,
	ClinicAnalyticsStudyTarget,
	ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import { analyticsPercent, limitAnalyticsRows, queryAnalytics } from './analytics-query.js';
import {
	clinicAnalyticsQueryDimensions,
	defaultClinicAnalyticsPrimaryDimension,
	defaultClinicAnalyticsSecondaryDimension,
	listClinicAnalyticsQueryRows,
	listClinicAnalyticsTargetDimensions,
	normalizeClinicAnalyticsQueryDimensions
} from './analytics-dimensions.js';
import { clinicAnalyticsOwnerPetCountBand } from './clinic-owner-analytics.selectors.js';
import {
	countClinicAnalyticsStudyTargetForFilter,
	filterClinicAnalyticsStudyTargetByBucket,
	hasClinicAnalyticsStudyFilters,
	listClinicAnalyticsStudyAntiparasitics,
	listClinicAnalyticsStudyVaccines,
	resolveClinicAnalyticsStudyTarget
} from './clinic-study-analytics.selectors.js';
import { toAnalyticsBuckets } from './analytics-bucket.selectors.js';
import type {
	ClinicAnalyticsStudyBucket,
	ClinicAnalyticsStudyBucketSelection,
	ClinicAnalyticsStudyDimension,
	ClinicAnalyticsStudyFilterFactor,
	ClinicAnalyticsStudyFilters,
	ClinicAnalyticsStudyResolvedTarget,
	ClinicAnalyticsStudyTreatmentSummary
} from './clinic-study-analytics.types.js';

export interface ClinicAnalyticsStudyFilterOptions {
	species: AnalyticsBucket[];
	breeds: AnalyticsBucket[];
	sexes: AnalyticsBucket[];
	ages: AnalyticsBucket[];
	vaccines: AnalyticsNamedBucket[];
	vaccineStatuses: AnalyticsBucket<ClinicAnalyticsVaccineStatusKey>[];
	antiparasitics: AnalyticsNamedBucket[];
	antiparasiticStatuses: AnalyticsBucket<ClinicAnalyticsAntiparasiticStatusKey>[];
	cities: AnalyticsNamedBucket[];
	ownerPetCounts: AnalyticsBucket<ClinicAnalyticsPetCountBandKey>[];
}

export interface ClinicAnalyticsStudyActiveFactor {
	factor: ClinicAnalyticsStudyFilterFactor;
	valueKey: string;
	count: number;
}

export interface ClinicAnalyticsStudyBucketView extends ClinicAnalyticsStudyBucket {
	percent: number;
}

export interface ClinicAnalyticsStudyViewModelInput {
	target: ClinicAnalyticsStudyTarget;
	primaryDimension: ClinicAnalyticsStudyDimension;
	secondaryDimension: ClinicAnalyticsStudyDimension;
	selectedBucket: ClinicAnalyticsStudyBucketSelection | null;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	filters: ClinicAnalyticsStudyFilters;
	bucketLimit: number;
	listLimit: number;
}

export interface ClinicAnalyticsStudyViewModel {
	availableDimensions: ClinicAnalyticsStudyDimension[];
	primaryDimension: ClinicAnalyticsStudyDimension;
	secondaryDimension: ClinicAnalyticsStudyDimension;
	defaultPrimaryDimension: ClinicAnalyticsStudyDimension;
	defaultSecondaryDimension: ClinicAnalyticsStudyDimension;
	filterOptions: ClinicAnalyticsStudyFilterOptions;
	activeFactors: ClinicAnalyticsStudyActiveFactor[];
	buckets: ClinicAnalyticsStudyBucketView[];
	limitedBuckets: ClinicAnalyticsStudyBucketView[];
	bucketTotal: number;
	bucketMaxCount: number;
	selectedBucket: ClinicAnalyticsStudyBucketSelection | null;
	listedPets: ClinicAnalyticsPetStudyItem[];
	listedOwners: ClinicAnalyticsOwnerStudyItem[];
	listedVaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
	listedAntiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
	limitedListedPets: ClinicAnalyticsPetStudyItem[];
	limitedListedOwners: ClinicAnalyticsOwnerStudyItem[];
	limitedListedVaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
	limitedListedAntiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}

export function buildClinicAnalyticsStudyViewModel(input: ClinicAnalyticsStudyViewModelInput): ClinicAnalyticsStudyViewModel {
	const allPets = input.pets;
	const allOwners = input.owners;
	const vaccines = listClinicAnalyticsStudyVaccines(allPets);
	const antiparasitics = listClinicAnalyticsStudyAntiparasitics(allPets);
	const normalizedDimensions = normalizeClinicAnalyticsQueryDimensions({
		target: input.target,
		primaryDimension: input.primaryDimension,
		secondaryDimension: input.secondaryDimension
	});
	const resolvedTarget = resolveClinicAnalyticsStudyTarget({
		target: input.target,
		pets: allPets,
		owners: allOwners,
		vaccines,
		antiparasitics,
		filters: input.filters
	});
	const rows = listClinicAnalyticsQueryRows({
		target: input.target,
		pets: resolvedTarget.pets,
		owners: resolvedTarget.owners,
		vaccines: resolvedTarget.vaccines,
		antiparasitics: resolvedTarget.antiparasitics
	});
	const selectedBucket = normalizeSelectedBucket(input.selectedBucket, normalizedDimensions.primaryDimension, normalizedDimensions.secondaryDimension);
	const queryResult = queryAnalytics({
		target: input.target,
		rows,
		dimensions: clinicAnalyticsQueryDimensions,
		groupBy: [normalizedDimensions.primaryDimension, normalizedDimensions.secondaryDimension],
		measure: 'count',
		selectedBucket: selectedBucket ? { groupBy: [selectedBucket.primaryDimension, selectedBucket.secondaryDimension], keys: [selectedBucket.primaryKey, selectedBucket.secondaryKey] } : null
	});
	const buckets = queryResult.buckets.map((bucket) => ({
		primaryKey: bucket.keys[0] ?? 'unknown',
		secondaryKey: bucket.keys[1] ?? bucket.keys[0] ?? 'unknown',
		count: bucket.count,
		percent: analyticsPercent({ value: bucket.count, total: queryResult.totalCount })
	}));
	const validSelection = queryResult.selectedBucket ? { primaryDimension: normalizedDimensions.primaryDimension, secondaryDimension: normalizedDimensions.secondaryDimension, primaryKey: queryResult.selectedBucket.keys[0] ?? 'unknown', secondaryKey: queryResult.selectedBucket.keys[1] ?? 'unknown', count: queryResult.selectedBucket.count } : null;
	const listedTarget = validSelection ? filterClinicAnalyticsStudyTargetByBucket({ ...resolvedTarget, selection: validSelection }) : resolvedTarget;

	return {
		availableDimensions: listClinicAnalyticsTargetDimensions(input.target),
		primaryDimension: normalizedDimensions.primaryDimension,
		secondaryDimension: normalizedDimensions.secondaryDimension,
		defaultPrimaryDimension: defaultClinicAnalyticsPrimaryDimension(input.target),
		defaultSecondaryDimension: defaultClinicAnalyticsSecondaryDimension(input.target),
		filterOptions: buildStudyFilterOptions({ target: input.target, pets: allPets, owners: allOwners, vaccines, antiparasitics, filters: input.filters }),
		activeFactors: buildStudyActiveFactors({ target: input.target, pets: allPets, owners: allOwners, vaccines, antiparasitics, filters: input.filters }),
		buckets,
		limitedBuckets: limitAnalyticsRows(buckets, input.bucketLimit),
		bucketTotal: buckets.reduce((total, bucket) => total + bucket.count, 0),
		bucketMaxCount: buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0),
		selectedBucket: validSelection,
		listedPets: listedTarget.pets,
		listedOwners: listedTarget.owners,
		listedVaccines: listedTarget.vaccines,
		listedAntiparasitics: listedTarget.antiparasitics,
		limitedListedPets: limitAnalyticsRows(listedTarget.pets, input.listLimit),
		limitedListedOwners: limitAnalyticsRows(listedTarget.owners, input.listLimit),
		limitedListedVaccines: limitAnalyticsRows(listedTarget.vaccines, input.listLimit),
		limitedListedAntiparasitics: limitAnalyticsRows(listedTarget.antiparasitics, input.listLimit)
	};
}

function buildStudyFilterOptions(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
	antiparasitics: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
	filters: ClinicAnalyticsStudyFilters;
}): ClinicAnalyticsStudyFilterOptions {
	const breedSource = input.filters.species ? input.pets.filter((pet) => pet.species === input.filters.species) : input.pets;
	return {
		species: studyBuckets(input.pets, (pet) => pet.species),
		breeds: studyBuckets(breedSource, (pet) => pet.breed),
		sexes: studyBuckets(input.pets, (pet) => pet.sex),
		ages: studyBuckets(input.pets, (pet) => pet.age),
		vaccines: namedTreatmentBuckets(input.vaccines),
		vaccineStatuses: vaccineStatusBuckets(input),
		antiparasitics: namedTreatmentBuckets(input.antiparasitics),
		antiparasiticStatuses: antiparasiticStatusBuckets(input),
		cities: namedOwnerBuckets(input.owners, (owner) => owner.cityKey, (owner) => owner.cityLabel),
		ownerPetCounts: studyBuckets(input.owners, (owner) => clinicAnalyticsOwnerPetCountBand(owner.petCount))
	};
}

function buildStudyActiveFactors(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
	antiparasitics: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
	filters: ClinicAnalyticsStudyFilters;
}): ClinicAnalyticsStudyActiveFactor[] {
	if (!hasClinicAnalyticsStudyFilters(input.filters)) return [];
	const factors: ClinicAnalyticsStudyFilterFactor[] = ['vaccine', 'vaccineStatus', 'antiparasitic', 'antiparasiticStatus', 'species', 'breed', 'sex', 'age', 'city', 'ownerPetCount'];
	const ownerIndex = new Map(input.owners.map((owner) => [owner.id, owner]));
	return factors
		.map((factor) => ({ factor, valueKey: studyFilterValueKey(input.filters, factor), count: countClinicAnalyticsStudyTargetForFilter({ ...input, factor, ownerIndex }) }))
		.filter((factor) => factor.valueKey.trim().length > 0);
}

function vaccineStatusBuckets(input: { target: ClinicAnalyticsStudyTarget; pets: readonly ClinicAnalyticsPetStudyItem[]; vaccines: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[]; filters: ClinicAnalyticsStudyFilters }): AnalyticsBucket<ClinicAnalyticsVaccineStatusKey>[] {
	if (input.filters.vaccineNormalizedName) return studyBuckets(input.vaccines.filter((vaccine) => vaccine.normalizedName === input.filters.vaccineNormalizedName), (vaccine) => vaccine.status);
	if (input.target === 'vaccines') return studyBuckets(input.vaccines, (vaccine) => vaccine.status);
	return studyBuckets(input.pets, (pet) => pet.vaccineStatus);
}

function antiparasiticStatusBuckets(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	antiparasitics: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
	filters: ClinicAnalyticsStudyFilters;
}): AnalyticsBucket<ClinicAnalyticsAntiparasiticStatusKey>[] {
	if (input.filters.antiparasiticNormalizedName) return studyBuckets(input.antiparasitics.filter((antiparasitic) => antiparasitic.normalizedName === input.filters.antiparasiticNormalizedName), (antiparasitic) => antiparasitic.status);
	if (input.target === 'antiparasitics') return studyBuckets(input.antiparasitics, (antiparasitic) => antiparasitic.status);
	return studyBuckets(input.pets, (pet) => pet.antiparasiticStatus);
}

function namedTreatmentBuckets(treatments: readonly { normalizedName: string; name: string }[]): AnalyticsNamedBucket[] {
	const counts = new Map<string, number>();
	const labels = new Map<string, string | null>();
	for (const treatment of treatments) {
		const key = treatment.normalizedName.trim() || 'untracked';
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (!labels.has(key)) labels.set(key, treatment.name.trim() || null);
	}
	return [...counts.entries()]
		.map(([key, count]) => ({ key, label: labels.get(key) ?? null, count }))
		.sort((first, second) => second.count - first.count || (first.label ?? '').localeCompare(second.label ?? ''));
}

function namedOwnerBuckets(owners: readonly ClinicAnalyticsOwnerStudyItem[], getKey: (owner: ClinicAnalyticsOwnerStudyItem) => string, getLabel: (owner: ClinicAnalyticsOwnerStudyItem) => string | null): AnalyticsNamedBucket[] {
	const counts = new Map<string, number>();
	const labels = new Map<string, string | null>();
	for (const owner of owners) {
		const key = getKey(owner).trim() || 'unknown';
		counts.set(key, (counts.get(key) ?? 0) + 1);
		if (!labels.has(key)) labels.set(key, getLabel(owner));
	}
	return [...counts.entries()]
		.map(([key, count]) => ({ key, label: labels.get(key) ?? null, count }))
		.sort((first, second) => second.count - first.count || (first.label ?? '').localeCompare(second.label ?? ''));
}

function studyBuckets<Item, Key extends string>(items: readonly Item[], getKey: (item: Item) => Key): AnalyticsBucket<Key>[] {
	const buckets = new Map<Key, number>();
	for (const item of items) {
		const key = getKey(item);
		buckets.set(key, (buckets.get(key) ?? 0) + 1);
	}
	return toAnalyticsBuckets(buckets);
}

function studyFilterValueKey(filters: ClinicAnalyticsStudyFilters, factor: ClinicAnalyticsStudyFilterFactor): string {
	if (factor === 'vaccine') return filters.vaccineNormalizedName;
	if (factor === 'vaccineStatus') return filters.vaccineStatus;
	if (factor === 'antiparasitic') return filters.antiparasiticNormalizedName;
	if (factor === 'antiparasiticStatus') return filters.antiparasiticStatus;
	if (factor === 'species') return filters.species;
	if (factor === 'breed') return filters.breed;
	if (factor === 'sex') return filters.sex;
	if (factor === 'age') return filters.age;
	if (factor === 'city') return filters.city;
	return filters.ownerPetCount;
}

function normalizeSelectedBucket(
	selection: ClinicAnalyticsStudyBucketSelection | null,
	primaryDimension: ClinicAnalyticsStudyDimension,
	secondaryDimension: ClinicAnalyticsStudyDimension
): ClinicAnalyticsStudyBucketSelection | null {
	if (!selection) return null;
	if (selection.primaryDimension !== primaryDimension || selection.secondaryDimension !== secondaryDimension) return null;
	return selection;
}
