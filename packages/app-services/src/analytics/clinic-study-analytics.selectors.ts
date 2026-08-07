import {
	type ClinicAnalyticsAntiparasiticStatusKey,
	type ClinicAnalyticsOwnerPetSnapshot,
	type ClinicAnalyticsOwnerStudyItem,
	type ClinicAnalyticsPetStudyItem,
	type ClinicAnalyticsPetTreatmentSnapshot,
	type ClinicAnalyticsStudyTarget,
	type ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import { clinicAnalyticsOwnerAntiparasiticStatus, clinicAnalyticsOwnerPetCountBand, clinicAnalyticsOwnerVaccineStatus } from './clinic-owner-analytics.selectors.js';

export type ClinicAnalyticsStudyDimension =
	| 'vaccine'
	| 'vaccineStatus'
	| 'antiparasitic'
	| 'antiparasiticStatus'
	| 'petSpecies'
	| 'petBreed'
	| 'petSex'
	| 'petAge'
	| 'petVaccineStatus'
	| 'petAntiparasiticStatus'
	| 'ownerCity'
	| 'ownerPetCount'
	| 'ownerPetVaccineStatus'
	| 'ownerPetAntiparasiticStatus'
	| 'ownerPetSpecies';

export type ClinicAnalyticsStudyFilterFactor = 'vaccine' | 'vaccineStatus' | 'antiparasitic' | 'antiparasiticStatus' | 'species' | 'breed' | 'sex' | 'age' | 'city' | 'ownerPetCount';

export interface ClinicAnalyticsStudyFilters {
	species: string;
	breed: string;
	sex: string;
	age: string;
	vaccineStatus: string;
	vaccineNormalizedName: string;
	antiparasiticStatus: string;
	antiparasiticNormalizedName: string;
	city: string;
	ownerPetCount: string;
}

export interface ClinicAnalyticsStudyTreatmentSummary<StatusKey extends string> {
	id: string;
	pet: ClinicAnalyticsPetStudyItem;
	normalizedName: string;
	name: string;
	dose: string;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: StatusKey;
}

export interface ClinicAnalyticsStudyBucket {
	primaryKey: string;
	secondaryKey: string;
	count: number;
}

export interface ClinicAnalyticsStudyBucketSelection extends ClinicAnalyticsStudyBucket {
	primaryDimension: ClinicAnalyticsStudyDimension;
	secondaryDimension: ClinicAnalyticsStudyDimension;
}

export interface ClinicAnalyticsStudyResolvedTarget {
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
	vaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
	antiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}

type StudyPetSnapshot = ClinicAnalyticsPetStudyItem | ClinicAnalyticsOwnerPetSnapshot;
type StudyVaccineSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>;
type StudyAntiparasiticSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>;

const unknownKey = 'unknown';
const untrackedKey = 'untracked';

export function listClinicAnalyticsStudyVaccines(pets: ClinicAnalyticsPetStudyItem[]): StudyVaccineSummary[] {
	return pets.flatMap((pet) => pet.vaccines.map((vaccine) => toStudyTreatmentSummary(pet, vaccine)));
}

export function listClinicAnalyticsStudyAntiparasitics(pets: ClinicAnalyticsPetStudyItem[]): StudyAntiparasiticSummary[] {
	return pets.flatMap((pet) => pet.antiparasitics.map((antiparasitic) => toStudyTreatmentSummary(pet, antiparasitic)));
}

export function filterClinicAnalyticsStudyPets(pets: ClinicAnalyticsPetStudyItem[], filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[] = []): ClinicAnalyticsPetStudyItem[] {
	return pets.filter((pet) => studyPetMatchesDimensions(pet, filters) && studyPetMatchesVaccine(pet, filters) && studyPetMatchesAntiparasitic(pet, filters) && petMatchesOwnerFilters(pet, filters, owners));
}

export function filterClinicAnalyticsStudyOwners(owners: ClinicAnalyticsOwnerStudyItem[], filters: ClinicAnalyticsStudyFilters): ClinicAnalyticsOwnerStudyItem[] {
	const hasPetOrTreatmentFilters = hasClinicAnalyticsStudyPetOrTreatmentFilters(filters);
	return owners.filter((owner) => {
		if (!ownerMatchesOwnerFilters(owner, filters)) return false;
		if (!hasPetOrTreatmentFilters) return true;
		return owner.pets.some((pet) => studyPetMatchesDimensions(pet, filters) && studyPetMatchesVaccine(pet, filters) && studyPetMatchesAntiparasitic(pet, filters));
	});
}

export function resolveClinicAnalyticsStudyTarget(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
	vaccines: StudyVaccineSummary[];
	antiparasitics: StudyAntiparasiticSummary[];
	filters: ClinicAnalyticsStudyFilters;
}): ClinicAnalyticsStudyResolvedTarget {
	const { target, pets, owners, vaccines, antiparasitics, filters } = input;
	const filteredPets = filterClinicAnalyticsStudyPets(pets, filters, owners);
	const filteredOwners = filterClinicAnalyticsStudyOwners(owners, filters);
	const filteredVaccines = filterClinicAnalyticsStudyVaccines(vaccines, filters, owners);
	const filteredAntiparasitics = filterClinicAnalyticsStudyAntiparasitics(antiparasitics, filters, owners);

	const targetPets = resolveTargetPets({ target, pets, owners: filteredOwners, filteredPets, filteredVaccines, filteredAntiparasitics });
	const targetOwners = target === 'owners' ? filteredOwners : ownersRelatedToPets({ pets: targetPets, owners, filters });
	const targetVaccines = target === 'vaccines' ? filteredVaccines : vaccines.filter((vaccine) => targetPets.some((pet) => pet.id === vaccine.pet.id) && studyVaccineMatchesFilters(vaccine, filters));
	const targetAntiparasitics = target === 'antiparasitics' ? filteredAntiparasitics : antiparasitics.filter((antiparasitic) => targetPets.some((pet) => pet.id === antiparasitic.pet.id) && studyAntiparasiticMatchesFilters(antiparasitic, filters));

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
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
	vaccines: StudyVaccineSummary[];
	antiparasitics: StudyAntiparasiticSummary[];
}): ClinicAnalyticsStudyBucket[] {
	const { target, primaryDimension, secondaryDimension, pets, owners, vaccines, antiparasitics } = input;
	const buckets = new Map<string, ClinicAnalyticsStudyBucket>();

	if (target === 'vaccines') for (const vaccine of vaccines) addStudyBucket(buckets, primaryDimension, secondaryDimension, clinicAnalyticsStudyVaccineDimensionKeys(vaccine, primaryDimension, owners), clinicAnalyticsStudyVaccineDimensionKeys(vaccine, secondaryDimension, owners));
	else if (target === 'antiparasitics') for (const antiparasitic of antiparasitics) addStudyBucket(buckets, primaryDimension, secondaryDimension, clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, primaryDimension, owners), clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, secondaryDimension, owners));
	else if (target === 'owners') for (const owner of owners) addStudyBucket(buckets, primaryDimension, secondaryDimension, clinicAnalyticsStudyOwnerDimensionKeys(owner, primaryDimension), clinicAnalyticsStudyOwnerDimensionKeys(owner, secondaryDimension));
	else for (const pet of pets) addStudyBucket(buckets, primaryDimension, secondaryDimension, clinicAnalyticsStudyPetDimensionKeys(pet, primaryDimension, owners), clinicAnalyticsStudyPetDimensionKeys(pet, secondaryDimension, owners));

	return [...buckets.values()].sort((first, second) => second.count - first.count || first.primaryKey.localeCompare(second.primaryKey) || first.secondaryKey.localeCompare(second.secondaryKey));
}

export function filterClinicAnalyticsStudyTargetByBucket(input: ClinicAnalyticsStudyResolvedTarget & { selection: ClinicAnalyticsStudyBucketSelection | null }): ClinicAnalyticsStudyResolvedTarget {
	const { selection, pets, owners, vaccines, antiparasitics } = input;
	if (!selection) return { pets, owners, vaccines, antiparasitics };

	return {
		pets: pets.filter((pet) => studyKeysMatchSelection(clinicAnalyticsStudyPetDimensionKeys(pet, selection.primaryDimension, owners), clinicAnalyticsStudyPetDimensionKeys(pet, selection.secondaryDimension, owners), selection)),
		owners: owners.filter((owner) => studyKeysMatchSelection(clinicAnalyticsStudyOwnerDimensionKeys(owner, selection.primaryDimension), clinicAnalyticsStudyOwnerDimensionKeys(owner, selection.secondaryDimension), selection)),
		vaccines: vaccines.filter((vaccine) => studyKeysMatchSelection(clinicAnalyticsStudyVaccineDimensionKeys(vaccine, selection.primaryDimension, owners), clinicAnalyticsStudyVaccineDimensionKeys(vaccine, selection.secondaryDimension, owners), selection)),
		antiparasitics: antiparasitics.filter((antiparasitic) => studyKeysMatchSelection(clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, selection.primaryDimension, owners), clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic, selection.secondaryDimension, owners), selection))
	};
}

export function countClinicAnalyticsStudyTargetForFilter(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
	vaccines: StudyVaccineSummary[];
	antiparasitics: StudyAntiparasiticSummary[];
	filters: ClinicAnalyticsStudyFilters;
	factor: ClinicAnalyticsStudyFilterFactor;
}): number {
	const { target, pets, owners, vaccines, antiparasitics, filters, factor } = input;
	if (target === 'vaccines') return vaccines.filter((vaccine) => vaccineMatchesFactor(vaccine, factor, filters, owners)).length;
	if (target === 'antiparasitics') return antiparasitics.filter((antiparasitic) => antiparasiticMatchesFactor(antiparasitic, factor, filters, owners)).length;
	if (target === 'owners') return owners.filter((owner) => ownerMatchesFactor(owner, factor, filters)).length;
	return pets.filter((pet) => petMatchesFactor(pet, factor, filters, owners)).length;
}

export function hasClinicAnalyticsStudyFilters(filters: ClinicAnalyticsStudyFilters): boolean {
	return !!(filters.species || filters.breed || filters.sex || filters.age || filters.vaccineStatus || filters.vaccineNormalizedName || filters.antiparasiticStatus || filters.antiparasiticNormalizedName || filters.city || filters.ownerPetCount);
}

export function clinicAnalyticsStudyPetDimensionKeys(pet: ClinicAnalyticsPetStudyItem, dimension: ClinicAnalyticsStudyDimension, owners: ClinicAnalyticsOwnerStudyItem[] = []): string[] {
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
	if (dimension === 'ownerPetCount') {
		return uniqueKeys(
			pet.owners.map((owner) => findStudyOwner(owners, owner.id)).map((owner) => (owner ? clinicAnalyticsOwnerPetCountBand(owner.petCount) : unknownKey)),
			unknownKey
		);
	}
	return [unknownKey];
}

export function clinicAnalyticsStudyOwnerDimensionKeys(owner: ClinicAnalyticsOwnerStudyItem, dimension: ClinicAnalyticsStudyDimension): string[] {
	if (dimension === 'ownerCity') return [owner.cityKey || unknownKey];
	if (dimension === 'ownerPetCount') return [clinicAnalyticsOwnerPetCountBand(owner.petCount)];
	if (dimension === 'ownerPetVaccineStatus') return [clinicAnalyticsOwnerVaccineStatus(owner)];
	if (dimension === 'ownerPetAntiparasiticStatus') return [clinicAnalyticsOwnerAntiparasiticStatus(owner)];
	if (dimension === 'ownerPetSpecies') return uniqueKeys(owner.pets.map((pet) => pet.species), unknownKey);
	return uniqueKeys(owner.pets.flatMap((pet) => clinicAnalyticsStudyOwnerPetDimensionKeys(pet, dimension)), unknownKey);
}

export function clinicAnalyticsStudyVaccineDimensionKeys(vaccine: StudyVaccineSummary, dimension: ClinicAnalyticsStudyDimension, owners: ClinicAnalyticsOwnerStudyItem[] = []): string[] {
	if (dimension === 'vaccine') return [vaccine.normalizedName || untrackedKey];
	if (dimension === 'vaccineStatus') return [vaccine.status];
	return clinicAnalyticsStudyPetDimensionKeys(vaccine.pet, dimension, owners);
}

export function clinicAnalyticsStudyAntiparasiticDimensionKeys(antiparasitic: StudyAntiparasiticSummary, dimension: ClinicAnalyticsStudyDimension, owners: ClinicAnalyticsOwnerStudyItem[] = []): string[] {
	if (dimension === 'antiparasitic') return [antiparasitic.normalizedName || untrackedKey];
	if (dimension === 'antiparasiticStatus') return [antiparasitic.status];
	return clinicAnalyticsStudyPetDimensionKeys(antiparasitic.pet, dimension, owners);
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

function filterClinicAnalyticsStudyVaccines(vaccines: StudyVaccineSummary[], filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): StudyVaccineSummary[] {
	return vaccines.filter((vaccine) => studyPetMatchesDimensions(vaccine.pet, filters) && petMatchesOwnerFilters(vaccine.pet, filters, owners) && studyPetMatchesAntiparasitic(vaccine.pet, filters) && studyVaccineMatchesFilters(vaccine, filters));
}

function filterClinicAnalyticsStudyAntiparasitics(antiparasitics: StudyAntiparasiticSummary[], filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): StudyAntiparasiticSummary[] {
	return antiparasitics.filter((antiparasitic) => studyPetMatchesDimensions(antiparasitic.pet, filters) && petMatchesOwnerFilters(antiparasitic.pet, filters, owners) && studyPetMatchesVaccine(antiparasitic.pet, filters) && studyAntiparasiticMatchesFilters(antiparasitic, filters));
}

function resolveTargetPets(input: {
	target: ClinicAnalyticsStudyTarget;
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
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

function uniquePetsFromVaccines(vaccines: StudyVaccineSummary[]): ClinicAnalyticsPetStudyItem[] {
	const pets = new Map<string, ClinicAnalyticsPetStudyItem>();
	for (const vaccine of vaccines) pets.set(vaccine.pet.id, vaccine.pet);
	return sortPetsByName([...pets.values()]);
}

function uniquePetsFromAntiparasitics(antiparasitics: StudyAntiparasiticSummary[]): ClinicAnalyticsPetStudyItem[] {
	const pets = new Map<string, ClinicAnalyticsPetStudyItem>();
	for (const antiparasitic of antiparasitics) pets.set(antiparasitic.pet.id, antiparasitic.pet);
	return sortPetsByName([...pets.values()]);
}

function petsRelatedToOwners(owners: ClinicAnalyticsOwnerStudyItem[], pets: ClinicAnalyticsPetStudyItem[]): ClinicAnalyticsPetStudyItem[] {
	const petIds = new Set<string>();
	for (const owner of owners) for (const pet of owner.pets) petIds.add(pet.id);
	return sortPetsByName(pets.filter((pet) => petIds.has(pet.id)));
}

function ownersRelatedToPets(input: { pets: ClinicAnalyticsPetStudyItem[]; owners: ClinicAnalyticsOwnerStudyItem[]; filters: ClinicAnalyticsStudyFilters }): ClinicAnalyticsOwnerStudyItem[] {
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

function petMatchesOwnerFilters(pet: ClinicAnalyticsPetStudyItem, filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): boolean {
	if (!filters.city && !filters.ownerPetCount) return true;
	return pet.owners.some((owner) => petOwnerMatchesOwnerFilters(owner, filters, owners));
}

function petOwnerMatchesOwnerFilters(owner: { id: string; cityKey: string }, filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): boolean {
	if (filters.city && owner.cityKey !== filters.city) return false;
	if (!filters.ownerPetCount) return true;
	const ownerItem = findStudyOwner(owners, owner.id);
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

function petMatchesFactor(pet: ClinicAnalyticsPetStudyItem, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): boolean {
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
		const ownerItem = findStudyOwner(owners, owner.id);
		return ownerItem ? clinicAnalyticsOwnerPetCountBand(ownerItem.petCount) === filters.ownerPetCount : false;
	});
}

function vaccineMatchesFactor(vaccine: StudyVaccineSummary, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): boolean {
	if (factor === 'vaccine') return vaccine.normalizedName === filters.vaccineNormalizedName;
	if (factor === 'vaccineStatus') return vaccine.status === filters.vaccineStatus;
	return petMatchesFactor(vaccine.pet, factor, filters, owners);
}

function antiparasiticMatchesFactor(antiparasitic: StudyAntiparasiticSummary, factor: ClinicAnalyticsStudyFilterFactor, filters: ClinicAnalyticsStudyFilters, owners: ClinicAnalyticsOwnerStudyItem[]): boolean {
	if (factor === 'antiparasitic') return antiparasitic.normalizedName === filters.antiparasiticNormalizedName;
	if (factor === 'antiparasiticStatus') return antiparasitic.status === filters.antiparasiticStatus;
	return petMatchesFactor(antiparasitic.pet, factor, filters, owners);
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

function addStudyBucket(
	buckets: Map<string, ClinicAnalyticsStudyBucket>,
	primaryDimension: ClinicAnalyticsStudyDimension,
	secondaryDimension: ClinicAnalyticsStudyDimension,
	primaryKeys: string[],
	secondaryKeys: string[]
): void {
	if (primaryDimension === secondaryDimension) {
		for (const primaryKey of primaryKeys) incrementStudyBucket(buckets, primaryKey, primaryKey);
		return;
	}

	for (const primaryKey of primaryKeys) for (const secondaryKey of secondaryKeys) incrementStudyBucket(buckets, primaryKey, secondaryKey);
}

function incrementStudyBucket(buckets: Map<string, ClinicAnalyticsStudyBucket>, primaryKey: string, secondaryKey: string): void {
	const mapKey = `${primaryKey}\u0000${secondaryKey}`;
	const bucket = buckets.get(mapKey) ?? { primaryKey, secondaryKey, count: 0 };
	bucket.count += 1;
	buckets.set(mapKey, bucket);
}

function studyKeysMatchSelection(primaryKeys: string[], secondaryKeys: string[], selection: ClinicAnalyticsStudyBucketSelection): boolean {
	return primaryKeys.includes(selection.primaryKey) && secondaryKeys.includes(selection.secondaryKey);
}

function findStudyOwner(owners: ClinicAnalyticsOwnerStudyItem[], ownerId: string): ClinicAnalyticsOwnerStudyItem | undefined {
	return owners.find((owner) => owner.id === ownerId);
}

function hasClinicAnalyticsStudyPetOrTreatmentFilters(filters: ClinicAnalyticsStudyFilters): boolean {
	return !!(filters.species || filters.breed || filters.sex || filters.age || filters.vaccineNormalizedName || filters.vaccineStatus || filters.antiparasiticNormalizedName || filters.antiparasiticStatus);
}

function uniqueKeys(values: string[], fallback: string): string[] {
	const keys = values.map((value) => value.trim()).filter((value) => value.length > 0);
	return keys.length > 0 ? [...new Set(keys)] : [fallback];
}

function sortPetsByName(pets: ClinicAnalyticsPetStudyItem[]): ClinicAnalyticsPetStudyItem[] {
	return [...pets].sort((first, second) => first.name.localeCompare(second.name));
}
