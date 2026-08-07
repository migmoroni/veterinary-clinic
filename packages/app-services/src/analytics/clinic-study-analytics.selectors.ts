import {
	type ClinicAnalyticsAntiparasiticStatusKey,
	type ClinicAnalyticsOwnerPetSnapshot,
	type ClinicAnalyticsOwnerStudyItem,
	type ClinicAnalyticsPetStudyItem,
	type ClinicAnalyticsPetTreatmentSnapshot,
	type ClinicAnalyticsStudyTarget,
	type ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import { clinicAnalyticsQueryDimensions, listClinicAnalyticsQueryRows } from './analytics-dimensions.js';
import { queryAnalytics } from './analytics-query.js';
import { clinicAnalyticsOwnerAntiparasiticStatus, clinicAnalyticsOwnerPetCountBand, clinicAnalyticsOwnerVaccineStatus } from './clinic-owner-analytics.selectors.js';
import type {
	ClinicAnalyticsStudyBucket,
	ClinicAnalyticsStudyBucketSelection,
	ClinicAnalyticsStudyDimension,
	ClinicAnalyticsStudyFilterFactor,
	ClinicAnalyticsStudyFilters,
	ClinicAnalyticsStudyResolvedTarget,
	ClinicAnalyticsStudyTreatmentSummary
} from './clinic-study-analytics.types.js';

export type {
	ClinicAnalyticsQueryDimension,
	ClinicAnalyticsQueryFilter,
	ClinicAnalyticsQueryRow,
	ClinicAnalyticsQueryTarget,
	ClinicAnalyticsStudyBucket,
	ClinicAnalyticsStudyBucketSelection,
	ClinicAnalyticsStudyDimension,
	ClinicAnalyticsStudyFilterFactor,
	ClinicAnalyticsStudyFilters,
	ClinicAnalyticsStudyResolvedTarget,
	ClinicAnalyticsStudyTreatmentSummary
} from './clinic-study-analytics.types.js';

type StudyPetSnapshot = ClinicAnalyticsPetStudyItem | ClinicAnalyticsOwnerPetSnapshot;
type StudyVaccineSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>;
type StudyAntiparasiticSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>;
type StudyOwnerIndex = ReadonlyMap<string, ClinicAnalyticsOwnerStudyItem>;

const unknownKey = 'unknown';
const untrackedKey = 'untracked';

export function listClinicAnalyticsStudyVaccines(pets: readonly ClinicAnalyticsPetStudyItem[]): StudyVaccineSummary[] {
	return pets.flatMap((pet) => pet.vaccines.map((vaccine) => toStudyTreatmentSummary(pet, vaccine)));
}

export function listClinicAnalyticsStudyAntiparasitics(pets: readonly ClinicAnalyticsPetStudyItem[]): StudyAntiparasiticSummary[] {
	return pets.flatMap((pet) => pet.antiparasitics.map((antiparasitic) => toStudyTreatmentSummary(pet, antiparasitic)));
}

export function filterClinicAnalyticsStudyPets(pets: readonly ClinicAnalyticsPetStudyItem[], filters: ClinicAnalyticsStudyFilters, owners: readonly ClinicAnalyticsOwnerStudyItem[] = []): ClinicAnalyticsPetStudyItem[] {
	const ownerIndex = ownerIndexFromOwners(owners);
	return filterClinicAnalyticsStudyPetsWithIndex(pets, filters, ownerIndex);
}

export function filterClinicAnalyticsStudyOwners(owners: readonly ClinicAnalyticsOwnerStudyItem[], filters: ClinicAnalyticsStudyFilters): ClinicAnalyticsOwnerStudyItem[] {
	const hasPetOrTreatmentFilters = hasClinicAnalyticsStudyPetOrTreatmentFilters(filters);
	return owners.filter((owner) => {
		if (!ownerMatchesOwnerFilters(owner, filters)) return false;
		if (!hasPetOrTreatmentFilters) return true;
		return owner.pets.some((pet) => studyPetMatchesDimensions(pet, filters) && studyPetMatchesVaccine(pet, filters) && studyPetMatchesAntiparasitic(pet, filters));
	});
}

export function resolveClinicAnalyticsStudyTarget(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly StudyVaccineSummary[];
	antiparasitics: readonly StudyAntiparasiticSummary[];
	filters: ClinicAnalyticsStudyFilters;
}): ClinicAnalyticsStudyResolvedTarget {
	const { target, pets, owners, vaccines, antiparasitics, filters } = input;
	const ownerIndex = ownerIndexFromOwners(owners);
	const filteredPets = filterClinicAnalyticsStudyPetsWithIndex(pets, filters, ownerIndex);
	const filteredOwners = filterClinicAnalyticsStudyOwners(owners, filters);
	const filteredVaccines = filterClinicAnalyticsStudyVaccines(vaccines, filters, ownerIndex);
	const filteredAntiparasitics = filterClinicAnalyticsStudyAntiparasitics(antiparasitics, filters, ownerIndex);

	const targetPets = resolveTargetPets({ target, pets, owners: filteredOwners, filteredPets, filteredVaccines, filteredAntiparasitics });
	const targetOwners = target === 'owners' ? filteredOwners : ownersRelatedToPets({ pets: targetPets, owners, filters });
	const targetPetIds = new Set(targetPets.map((pet) => pet.id));
	const targetVaccines = target === 'vaccines' ? filteredVaccines : vaccines.filter((vaccine) => targetPetIds.has(vaccine.pet.id) && studyVaccineMatchesFilters(vaccine, filters));
	const targetAntiparasitics = target === 'antiparasitics' ? filteredAntiparasitics : antiparasitics.filter((antiparasitic) => targetPetIds.has(antiparasitic.pet.id) && studyAntiparasiticMatchesFilters(antiparasitic, filters));

	return {
		pets: targetPets,
		owners: targetOwners,
		vaccines: targetVaccines,
		antiparasitics: targetAntiparasitics
	};
}

export function buildClinicAnalyticsStudyBuckets(input: {
	target: ClinicAnalyticsStudyTarget;
	primaryDimension: ClinicAnalyticsStudyDimension;
	secondaryDimension: ClinicAnalyticsStudyDimension;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly StudyVaccineSummary[];
	antiparasitics: readonly StudyAntiparasiticSummary[];
}): ClinicAnalyticsStudyBucket[] {
	const { target, primaryDimension, secondaryDimension, pets, owners, vaccines, antiparasitics } = input;
	const rows = listClinicAnalyticsQueryRows({ target, pets, owners, vaccines, antiparasitics });
	const result = queryAnalytics({
		target,
		rows,
		dimensions: clinicAnalyticsQueryDimensions,
		groupBy: [primaryDimension, secondaryDimension],
		measure: 'count',
		sort: { by: 'count', direction: 'desc' }
	});

	return result.buckets.map((bucket) => ({
		primaryKey: bucket.keys[0] ?? unknownKey,
		secondaryKey: bucket.keys[1] ?? bucket.keys[0] ?? unknownKey,
		count: bucket.count
	}));
}

export function filterClinicAnalyticsStudyTargetByBucket(input: ClinicAnalyticsStudyResolvedTarget & { selection: ClinicAnalyticsStudyBucketSelection | null }): ClinicAnalyticsStudyResolvedTarget {
	const { selection, pets, owners, vaccines, antiparasitics } = input;
	if (!selection) return { pets, owners, vaccines, antiparasitics };
	const ownerIndex = ownerIndexFromOwners(owners);

	return {
		pets: pets.filter((pet) => studyKeysMatchSelection(clinicAnalyticsStudyPetDimensionKeys(pet, selection.primaryDimension, owners, ownerIndex), clinicAnalyticsStudyPetDimensionKeys(pet, selection.secondaryDimension, owners, ownerIndex), selection)),
		owners: owners.filter((owner) => studyKeysMatchSelection(clinicAnalyticsStudyOwnerDimensionKeys(owner, selection.primaryDimension), clinicAnalyticsStudyOwnerDimensionKeys(owner, selection.secondaryDimension), selection)),
		vaccines: vaccines.filter((vaccine) => studyKeysMatchSelection(clinicAnalyticsStudyVaccineDimensionKeys(vaccine, selection.primaryDimension, owners, ownerIndex), clinicAnalyticsStudyVaccineDimensionKeys(vaccine, selection.secondaryDimension, owners, ownerIndex), selection)),
		antiparasitics: antiparasitics.filter((antiparasitic) => studyKeysMatchSelection(clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, selection.primaryDimension, owners, ownerIndex), clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, selection.secondaryDimension, owners, ownerIndex), selection))
	};
}

export function countClinicAnalyticsStudyTargetForFilter(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly StudyVaccineSummary[];
	antiparasitics: readonly StudyAntiparasiticSummary[];
	filters: ClinicAnalyticsStudyFilters;
	factor: ClinicAnalyticsStudyFilterFactor;
	ownerIndex?: ReadonlyMap<string, ClinicAnalyticsOwnerStudyItem>;
}): number {
	const { target, pets, owners, vaccines, antiparasitics, filters, factor } = input;
	const ownerIndex = input.ownerIndex ?? ownerIndexFromOwners(owners);
	if (target === 'vaccines') return vaccines.filter((vaccine) => vaccineMatchesFactor(vaccine, factor, filters, ownerIndex)).length;
	if (target === 'antiparasitics') return antiparasitics.filter((antiparasitic) => antiparasiticMatchesFactor(antiparasitic, factor, filters, ownerIndex)).length;
	if (target === 'owners') return owners.filter((owner) => ownerMatchesFactor(owner, factor, filters)).length;
	return pets.filter((pet) => petMatchesFactor(pet, factor, filters, ownerIndex)).length;
}

export function hasClinicAnalyticsStudyFilters(filters: ClinicAnalyticsStudyFilters): boolean {
	return !!(filters.species || filters.breed || filters.sex || filters.age || filters.vaccineStatus || filters.vaccineNormalizedName || filters.antiparasiticStatus || filters.antiparasiticNormalizedName || filters.city || filters.ownerPetCount);
}

export function clinicAnalyticsStudyPetDimensionKeys(pet: ClinicAnalyticsPetStudyItem, dimension: ClinicAnalyticsStudyDimension, owners: readonly ClinicAnalyticsOwnerStudyItem[] = [], ownerIndex: StudyOwnerIndex = ownerIndexFromOwners(owners)): string[] {
	if (dimension === 'vaccine') return uniqueKeys(pet.vaccineNormalizedNames, untrackedKey);
	if (dimension === 'vaccineStatus') return uniqueKeys(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccine.status) : [untrackedKey], untrackedKey);
	if (dimension === 'antiparasitic') return uniqueKeys(pet.antiparasiticNormalizedNames, untrackedKey);
	if (dimension === 'antiparasiticStatus') return uniqueKeys(pet.antiparasitics.length > 0 ? pet.antiparasitics.map((antiparasitic) => antiparasitic.status) : [untrackedKey], untrackedKey);
	if (dimension === 'petSpecies') return [pet.species];
	if (dimension === 'petBreed') return [pet.breed];
	if (dimension === 'petSex') return [pet.sex];
	if (dimension === 'petAge') return [pet.age];
	if (dimension === 'petVaccineStatus') return [pet.vaccineStatus];
	if (dimension === 'petAntiparasiticStatus') return [pet.antiparasiticStatus];
	if (dimension === 'ownerCity') return uniqueKeys(pet.ownerCityKeys, unknownKey);
	if (dimension === 'ownerLocation') return uniqueKeys(pet.ownerLocationKeys, unknownKey);
	if (dimension === 'ownerPetCount') {
		return uniqueKeys(
			pet.owners.map((owner) => findStudyOwner(ownerIndex, owner.id)).map((owner) => (owner ? clinicAnalyticsOwnerPetCountBand(owner.petCount) : unknownKey)),
			unknownKey
		);
	}
	return [unknownKey];
}

export function clinicAnalyticsStudyOwnerDimensionKeys(owner: ClinicAnalyticsOwnerStudyItem, dimension: ClinicAnalyticsStudyDimension): string[] {
	if (dimension === 'ownerCity') return [owner.cityKey || unknownKey];
	if (dimension === 'ownerLocation') return [owner.locationKey || unknownKey];
	if (dimension === 'ownerPetCount') return [clinicAnalyticsOwnerPetCountBand(owner.petCount)];
	if (dimension === 'ownerPetVaccineStatus') return [clinicAnalyticsOwnerVaccineStatus(owner)];
	if (dimension === 'ownerPetAntiparasiticStatus') return [clinicAnalyticsOwnerAntiparasiticStatus(owner)];
	if (dimension === 'ownerPetSpecies') return uniqueKeys(owner.pets.map((pet) => pet.species), unknownKey);
	return uniqueKeys(owner.pets.flatMap((pet) => clinicAnalyticsStudyOwnerPetDimensionKeys(pet, dimension)), unknownKey);
}

export function clinicAnalyticsStudyVaccineDimensionKeys(vaccine: StudyVaccineSummary, dimension: ClinicAnalyticsStudyDimension, owners: readonly ClinicAnalyticsOwnerStudyItem[] = [], ownerIndex: StudyOwnerIndex = ownerIndexFromOwners(owners)): string[] {
	if (dimension === 'vaccine') return [vaccine.normalizedName || untrackedKey];
	if (dimension === 'vaccineStatus') return [vaccine.status];
	return clinicAnalyticsStudyPetDimensionKeys(vaccine.pet, dimension, owners, ownerIndex);
}

export function clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic: StudyAntiparasiticSummary, dimension: ClinicAnalyticsStudyDimension, owners: readonly ClinicAnalyticsOwnerStudyItem[] = [], ownerIndex: StudyOwnerIndex = ownerIndexFromOwners(owners)): string[] {
	if (dimension === 'antiparasitic') return [antiparasitic.normalizedName || untrackedKey];
	if (dimension === 'antiparasiticStatus') return [antiparasitic.status];
	return clinicAnalyticsStudyPetDimensionKeys(antiparasitic.pet, dimension, owners, ownerIndex);
}

function clinicAnalyticsStudyOwnerPetDimensionKeys(pet: ClinicAnalyticsOwnerPetSnapshot, dimension: ClinicAnalyticsStudyDimension): string[] {
	if (dimension === 'petSpecies') return [pet.species];
	if (dimension === 'petBreed') return [pet.breed];
	if (dimension === 'petSex') return [pet.sex];
	if (dimension === 'petAge') return [pet.age];
	if (dimension === 'petVaccineStatus') return [pet.vaccineStatus];
	if (dimension === 'petAntiparasiticStatus') return [pet.antiparasiticStatus];
	if (dimension === 'vaccine') return uniqueKeys(pet.vaccineNormalizedNames, untrackedKey);
	if (dimension === 'vaccineStatus') return uniqueKeys(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccine.status) : [untrackedKey], untrackedKey);
	if (dimension === 'antiparasitic') return uniqueKeys(pet.antiparasiticNormalizedNames, untrackedKey);
	if (dimension === 'antiparasiticStatus') return uniqueKeys(pet.antiparasitics.length > 0 ? pet.antiparasitics.map((antiparasitic) => antiparasitic.status) : [untrackedKey], untrackedKey);
	return [unknownKey];
}

function toStudyTreatmentSummary<StatusKey extends string>(pet: ClinicAnalyticsPetStudyItem, treatment: ClinicAnalyticsPetTreatmentSnapshot<StatusKey>): ClinicAnalyticsStudyTreatmentSummary<StatusKey> {
	return { ...treatment, id: `${pet.id}:${treatment.normalizedName}`, pet };
}

function filterClinicAnalyticsStudyPetsWithIndex(pets: readonly ClinicAnalyticsPetStudyItem[], filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): ClinicAnalyticsPetStudyItem[] {
	return pets.filter((pet) => studyPetMatchesDimensions(pet, filters) && studyPetMatchesVaccine(pet, filters) && studyPetMatchesAntiparasitic(pet, filters) && petMatchesOwnerFilters(pet, filters, ownerIndex));
}

function filterClinicAnalyticsStudyVaccines(vaccines: readonly StudyVaccineSummary[], filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): StudyVaccineSummary[] {
	return vaccines.filter((vaccine) => studyPetMatchesDimensions(vaccine.pet, filters) && petMatchesOwnerFilters(vaccine.pet, filters, ownerIndex) && studyPetMatchesAntiparasitic(vaccine.pet, filters) && studyVaccineMatchesFilters(vaccine, filters));
}

function filterClinicAnalyticsStudyAntiparasitics(antiparasitics: readonly StudyAntiparasiticSummary[], filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): StudyAntiparasiticSummary[] {
	return antiparasitics.filter((antiparasitic) => studyPetMatchesDimensions(antiparasitic.pet, filters) && petMatchesOwnerFilters(antiparasitic.pet, filters, ownerIndex) && studyPetMatchesVaccine(antiparasitic.pet, filters) && studyAntiparasiticMatchesFilters(antiparasitic, filters));
}

function resolveTargetPets(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	filteredPets: ClinicAnalyticsPetStudyItem[];
	filteredVaccines: StudyVaccineSummary[];
	filteredAntiparasitics: StudyAntiparasiticSummary[];
}): ClinicAnalyticsPetStudyItem[] {
	const { target, pets, owners, filteredPets, filteredVaccines, filteredAntiparasitics } = input;
	if (target === 'vaccines') return uniquePetsFromVaccines(filteredVaccines);
	if (target === 'antiparasitics') return uniquePetsFromAntiparasitics(filteredAntiparasitics);
	if (target === 'owners') return petsRelatedToOwners(owners, pets);
	return filteredPets;
}

function uniquePetsFromVaccines(vaccines: readonly StudyVaccineSummary[]): ClinicAnalyticsPetStudyItem[] {
	const pets = new Map<string, ClinicAnalyticsPetStudyItem>();
	for (const vaccine of vaccines) pets.set(vaccine.pet.id, vaccine.pet);
	return sortPetsByName([...pets.values()]);
}

function uniquePetsFromAntiparasitics(antiparasitics: readonly StudyAntiparasiticSummary[]): ClinicAnalyticsPetStudyItem[] {
	const pets = new Map<string, ClinicAnalyticsPetStudyItem>();
	for (const antiparasitic of antiparasitics) pets.set(antiparasitic.pet.id, antiparasitic.pet);
	return sortPetsByName([...pets.values()]);
}

function petsRelatedToOwners(owners: readonly ClinicAnalyticsOwnerStudyItem[], pets: readonly ClinicAnalyticsPetStudyItem[]): ClinicAnalyticsPetStudyItem[] {
	const petIds = new Set<string>();
	for (const owner of owners) for (const pet of owner.pets) petIds.add(pet.id);
	return sortPetsByName(pets.filter((pet) => petIds.has(pet.id)));
}

function ownersRelatedToPets(input: { pets: readonly ClinicAnalyticsPetStudyItem[]; owners: readonly ClinicAnalyticsOwnerStudyItem[]; filters: ClinicAnalyticsStudyFilters }): ClinicAnalyticsOwnerStudyItem[] {
	const { pets, owners, filters } = input;
	const ownerIds = new Set<string>();
	for (const pet of pets) for (const owner of pet.owners) ownerIds.add(owner.id);
	return owners.filter((owner) => ownerIds.has(owner.id) && ownerMatchesOwnerFilters(owner, filters)).sort((first, second) => second.petCount - first.petCount || first.name.localeCompare(second.name));
}

function studyPetMatchesVaccine(pet: StudyPetSnapshot, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.vaccineNormalizedName && filters.vaccineStatus) return pet.vaccines.some((vaccine) => vaccine.normalizedName === filters.vaccineNormalizedName && vaccine.status === filters.vaccineStatus);
	if (filters.vaccineNormalizedName) return pet.vaccineNormalizedNames.includes(filters.vaccineNormalizedName);
	if (filters.vaccineStatus) return pet.vaccineStatus === filters.vaccineStatus;
	return true;
}

function studyPetMatchesAntiparasitic(pet: StudyPetSnapshot, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.antiparasiticNormalizedName && filters.antiparasiticStatus) return pet.antiparasitics.some((antiparasitic) => antiparasitic.normalizedName === filters.antiparasiticNormalizedName && antiparasitic.status === filters.antiparasiticStatus);
	if (filters.antiparasiticNormalizedName) return pet.antiparasiticNormalizedNames.includes(filters.antiparasiticNormalizedName);
	if (filters.antiparasiticStatus) return pet.antiparasiticStatus === filters.antiparasiticStatus;
	return true;
}

function studyPetMatchesDimensions(pet: StudyPetSnapshot, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.species && pet.species !== filters.species) return false;
	if (filters.breed && pet.breed !== filters.breed) return false;
	if (filters.sex && pet.sex !== filters.sex) return false;
	if (filters.age && pet.age !== filters.age) return false;
	return true;
}

function ownerMatchesOwnerFilters(owner: ClinicAnalyticsOwnerStudyItem, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.city && owner.cityKey !== filters.city) return false;
	if (filters.ownerPetCount && clinicAnalyticsOwnerPetCountBand(owner.petCount) !== filters.ownerPetCount) return false;
	return true;
}

function petMatchesOwnerFilters(pet: ClinicAnalyticsPetStudyItem, filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): boolean {
	if (!filters.city && !filters.ownerPetCount) return true;
	return pet.owners.some((owner) => petOwnerMatchesOwnerFilters(owner, filters, ownerIndex));
}

function petOwnerMatchesOwnerFilters(owner: { id: string; cityKey: string }, filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): boolean {
	if (filters.city && owner.cityKey !== filters.city) return false;
	if (!filters.ownerPetCount) return true;
	const ownerItem = findStudyOwner(ownerIndex, owner.id);
	return ownerItem ? clinicAnalyticsOwnerPetCountBand(ownerItem.petCount) === filters.ownerPetCount : false;
}

function studyVaccineMatchesFilters(vaccine: StudyVaccineSummary, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.vaccineNormalizedName && vaccine.normalizedName !== filters.vaccineNormalizedName) return false;
	if (filters.vaccineStatus && vaccine.status !== filters.vaccineStatus) return false;
	return true;
}

function studyAntiparasiticMatchesFilters(antiparasitic: StudyAntiparasiticSummary, filters: ClinicAnalyticsStudyFilters): boolean {
	if (filters.antiparasiticNormalizedName && antiparasitic.normalizedName !== filters.antiparasiticNormalizedName) return false;
	if (filters.antiparasiticStatus && antiparasitic.status !== filters.antiparasiticStatus) return false;
	return true;
}

function petMatchesFactor(pet: ClinicAnalyticsPetStudyItem, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): boolean {
	if (factor === 'vaccine') return pet.vaccineNormalizedNames.includes(filters.vaccineNormalizedName);
	if (factor === 'vaccineStatus') return filters.vaccineStatus ? pet.vaccineStatus === filters.vaccineStatus : true;
	if (factor === 'antiparasitic') return pet.antiparasiticNormalizedNames.includes(filters.antiparasiticNormalizedName);
	if (factor === 'antiparasiticStatus') return filters.antiparasiticStatus ? pet.antiparasiticStatus === filters.antiparasiticStatus : true;
	if (factor === 'species') return pet.species === filters.species;
	if (factor === 'breed') return pet.breed === filters.breed;
	if (factor === 'sex') return pet.sex === filters.sex;
	if (factor === 'age') return pet.age === filters.age;
	if (factor === 'city') return pet.ownerCityKeys.includes(filters.city);
	return pet.owners.some((owner) => {
		const ownerItem = findStudyOwner(ownerIndex, owner.id);
		return ownerItem ? clinicAnalyticsOwnerPetCountBand(ownerItem.petCount) === filters.ownerPetCount : false;
	});
}

function vaccineMatchesFactor(vaccine: StudyVaccineSummary, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): boolean {
	if (factor === 'vaccine') return vaccine.normalizedName === filters.vaccineNormalizedName;
	if (factor === 'vaccineStatus') return vaccine.status === filters.vaccineStatus;
	return petMatchesFactor(vaccine.pet, factor, filters, ownerIndex);
}

function antiparasiticMatchesFactor(antiparasitic: StudyAntiparasiticSummary, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, ownerIndex: StudyOwnerIndex): boolean {
	if (factor === 'antiparasitic') return antiparasitic.normalizedName === filters.antiparasiticNormalizedName;
	if (factor === 'antiparasiticStatus') return antiparasitic.status === filters.antiparasiticStatus;
	return petMatchesFactor(antiparasitic.pet, factor, filters, ownerIndex);
}

function ownerMatchesFactor(owner: ClinicAnalyticsOwnerStudyItem, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters): boolean {
	if (factor === 'city') return owner.cityKey === filters.city;
	if (factor === 'ownerPetCount') return clinicAnalyticsOwnerPetCountBand(owner.petCount) === filters.ownerPetCount;
	return owner.pets.some((pet) => {
		if (factor === 'vaccine') return pet.vaccineNormalizedNames.includes(filters.vaccineNormalizedName);
		if (factor === 'vaccineStatus') return filters.vaccineStatus ? pet.vaccineStatus === filters.vaccineStatus : true;
		if (factor === 'antiparasitic') return pet.antiparasiticNormalizedNames.includes(filters.antiparasiticNormalizedName);
		if (factor === 'antiparasiticStatus') return filters.antiparasiticStatus ? pet.antiparasiticStatus === filters.antiparasiticStatus : true;
		if (factor === 'species') return pet.species === filters.species;
		if (factor === 'breed') return pet.breed === filters.breed;
		if (factor === 'sex') return pet.sex === filters.sex;
		return pet.age === filters.age;
	});
}

function studyKeysMatchSelection(primaryKeys: string[], secondaryKeys: string[], selection: ClinicAnalyticsStudyBucketSelection): boolean {
	return primaryKeys.includes(selection.primaryKey) && secondaryKeys.includes(selection.secondaryKey);
}

function findStudyOwner(owners: StudyOwnerIndex, ownerId: string): ClinicAnalyticsOwnerStudyItem | undefined {
	return owners.get(ownerId);
}

function hasClinicAnalyticsStudyPetOrTreatmentFilters(filters: ClinicAnalyticsStudyFilters): boolean {
	return !!(filters.species || filters.breed || filters.sex || filters.age || filters.vaccineNormalizedName || filters.vaccineStatus || filters.antiparasiticNormalizedName || filters.antiparasiticStatus);
}

function uniqueKeys(values: string[], fallback: string): string[] {
	const keys = values.map((value) => value.trim()).filter((value) => value.length > 0);
	return keys.length > 0 ? [...new Set(keys)] : [fallback];
}

function ownerIndexFromOwners(owners: readonly ClinicAnalyticsOwnerStudyItem[]): StudyOwnerIndex {
	return new Map(owners.map((owner) => [owner.id, owner]));
}

function sortPetsByName(pets: ClinicAnalyticsPetStudyItem[]): ClinicAnalyticsPetStudyItem[] {
	return [...pets].sort((first, second) => first.name.localeCompare(second.name));
}
