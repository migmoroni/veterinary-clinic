import {
	clinicAnalyticsAgeBandSortValue,
	clinicAnalyticsPetCountBandWeight,
	clinicAnalyticsTreatmentStatusWeight,
	type ClinicAnalyticsAntiparasiticStatusKey,
	type ClinicAnalyticsOwnerPetSnapshot,
	type ClinicAnalyticsOwnerStudyItem,
	type ClinicAnalyticsPetCountBandKey,
	type ClinicAnalyticsPetStudyItem,
	type ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';
import type { AnalyticsDimensionSpec } from './analytics-query.js';
import type {
	ClinicAnalyticsQueryDimension,
	ClinicAnalyticsQueryRow,
	ClinicAnalyticsQueryTarget,
	ClinicAnalyticsStudyTreatmentSummary
} from './clinic-study-analytics.types.js';

type QueryPetSnapshot = ClinicAnalyticsPetStudyItem | ClinicAnalyticsOwnerPetSnapshot;
type VaccineSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>;
type AntiparasiticSummary = ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>;

const unknownKey = 'unknown';
const untrackedKey = 'untracked';

export const clinicAnalyticsMissingKeys = [unknownKey] as const;

export const clinicAnalyticsQueryDimensions: Record<ClinicAnalyticsQueryDimension, AnalyticsDimensionSpec<ClinicAnalyticsQueryRow, ClinicAnalyticsQueryDimension>> = {
	petSpecies: cadastreDimension('petSpecies', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.species), unknownKey)),
	petBreed: cadastreDimension('petBreed', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.breed), unknownKey)),
	petSex: cadastreDimension('petSex', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.sex), unknownKey)),
	petAge: cadastreDimension('petAge', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.age), unknownKey), (first, second) => clinicAnalyticsAgeBandSortValue(first) - clinicAnalyticsAgeBandSortValue(second)),
	petVaccineStatus: treatmentStatusDimension('petVaccineStatus', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.vaccineStatus), untrackedKey)),
	petAntiparasiticStatus: treatmentStatusDimension('petAntiparasiticStatus', (row) => uniqueKeys(petsForRow(row).map((pet) => pet.antiparasiticStatus), untrackedKey)),
	ownerCity: cadastreDimension('ownerCity', (row) => uniqueKeys(ownerCityKeysForRow(row), unknownKey)),
	ownerLocation: cadastreDimension('ownerLocation', (row) => uniqueKeys(ownerLocationKeysForRow(row), unknownKey)),
	ownerPetCount: cadastreDimension('ownerPetCount', (row) => uniqueKeys(ownersForRow(row).map((owner) => clinicAnalyticsOwnerPetCountBand(owner.petCount)), unknownKey), comparePetCountKeys),
	ownerPetVaccineStatus: treatmentStatusDimension('ownerPetVaccineStatus', (row) => uniqueKeys(ownersForRow(row).map((owner) => clinicAnalyticsOwnerVaccineStatus(owner)), untrackedKey)),
	ownerPetAntiparasiticStatus: treatmentStatusDimension('ownerPetAntiparasiticStatus', (row) => uniqueKeys(ownersForRow(row).map((owner) => clinicAnalyticsOwnerAntiparasiticStatus(owner)), untrackedKey)),
	ownerPetSpecies: cadastreDimension('ownerPetSpecies', (row) => uniqueKeys(ownersForRow(row).flatMap((owner) => owner.pets.map((pet) => pet.species)), unknownKey)),
	vaccine: treatmentDimension('vaccine', vaccineKeysForRow),
	vaccineStatus: treatmentStatusDimension('vaccineStatus', vaccineStatusKeysForRow),
	antiparasitic: treatmentDimension('antiparasitic', antiparasiticKeysForRow),
	antiparasiticStatus: treatmentStatusDimension('antiparasiticStatus', antiparasiticStatusKeysForRow)
};

export function listClinicAnalyticsQueryRows(input: {
	target: ClinicAnalyticsQueryTarget;
	pets: readonly ClinicAnalyticsPetStudyItem[];
	owners: readonly ClinicAnalyticsOwnerStudyItem[];
	vaccines: readonly VaccineSummary[];
	antiparasitics: readonly AntiparasiticSummary[];
}): ClinicAnalyticsQueryRow[] {
	const ownersById = new Map(input.owners.map((owner) => [owner.id, owner]));
	const ownersByPetId = ownersByPetIdFromOwners(input.owners);
	if (input.target === 'owners') return input.owners.map((owner) => ({ kind: 'owner', owner }));
	if (input.target === 'vaccines') return input.vaccines.map((vaccine) => ({ kind: 'vaccine', vaccine, pet: vaccine.pet, owners: listOwnersForPet(vaccine.pet, ownersById, ownersByPetId) }));
	if (input.target === 'antiparasitics') return input.antiparasitics.map((antiparasitic) => ({ kind: 'antiparasitic', antiparasitic, pet: antiparasitic.pet, owners: listOwnersForPet(antiparasitic.pet, ownersById, ownersByPetId) }));
	return input.pets.map((pet) => ({ kind: 'pet', pet, owners: listOwnersForPet(pet, ownersById, ownersByPetId) }));
}

export function listClinicAnalyticsTargetDimensions(target: ClinicAnalyticsQueryTarget): ClinicAnalyticsQueryDimension[] {
	if (target === 'vaccines') return ['vaccineStatus', 'vaccine', 'antiparasitic', 'petAntiparasiticStatus', 'petSpecies', 'petBreed', 'petAge', 'ownerCity', 'ownerPetCount'];
	if (target === 'antiparasitics') return ['antiparasiticStatus', 'antiparasitic', 'petSpecies', 'petBreed', 'petAge', 'ownerCity', 'ownerPetCount'];
	if (target === 'owners') return ['ownerCity', 'ownerPetCount', 'ownerPetVaccineStatus', 'ownerPetAntiparasiticStatus', 'ownerPetSpecies', 'vaccine', 'antiparasitic', 'petBreed', 'petAge'];
	return ['petBreed', 'petSpecies', 'petVaccineStatus', 'petAntiparasiticStatus', 'vaccine', 'antiparasitic', 'petSex', 'petAge', 'ownerCity', 'ownerPetCount'];
}

export function defaultClinicAnalyticsPrimaryDimension(target: ClinicAnalyticsQueryTarget): ClinicAnalyticsQueryDimension {
	if (target === 'vaccines') return 'vaccineStatus';
	if (target === 'antiparasitics') return 'antiparasiticStatus';
	if (target === 'owners') return 'ownerCity';
	return 'petBreed';
}

export function defaultClinicAnalyticsSecondaryDimension(target: ClinicAnalyticsQueryTarget): ClinicAnalyticsQueryDimension {
	if (target === 'vaccines' || target === 'antiparasitics') return 'petSpecies';
	if (target === 'owners') return 'ownerPetVaccineStatus';
	return 'petVaccineStatus';
}

export function normalizeClinicAnalyticsQueryDimensions(input: {
	target: ClinicAnalyticsQueryTarget;
	primaryDimension: ClinicAnalyticsQueryDimension;
	secondaryDimension: ClinicAnalyticsQueryDimension;
}): { primaryDimension: ClinicAnalyticsQueryDimension; secondaryDimension: ClinicAnalyticsQueryDimension } {
	const dimensions = listClinicAnalyticsTargetDimensions(input.target);
	const defaultPrimary = defaultClinicAnalyticsPrimaryDimension(input.target);
	const defaultSecondary = defaultClinicAnalyticsSecondaryDimension(input.target);

	return {
		primaryDimension: input.primaryDimension && dimensions.includes(input.primaryDimension) ? input.primaryDimension : defaultPrimary,
		secondaryDimension: input.secondaryDimension && dimensions.includes(input.secondaryDimension) ? input.secondaryDimension : defaultSecondary
	};
}

function cadastreDimension(
	id: ClinicAnalyticsQueryDimension,
	keys: (row: ClinicAnalyticsQueryRow) => readonly string[],
	compareKeys?: (first: string, second: string) => number
): AnalyticsDimensionSpec<ClinicAnalyticsQueryRow, ClinicAnalyticsQueryDimension> {
	return { id, keys, fallbackKey: unknownKey, missingKeys: clinicAnalyticsMissingKeys, compareKeys };
}

function treatmentDimension(
	id: ClinicAnalyticsQueryDimension,
	keys: (row: ClinicAnalyticsQueryRow) => readonly string[],
	compareKeys?: (first: string, second: string) => number
): AnalyticsDimensionSpec<ClinicAnalyticsQueryRow, ClinicAnalyticsQueryDimension> {
	return { id, keys, fallbackKey: untrackedKey, compareKeys };
}

function treatmentStatusDimension(id: ClinicAnalyticsQueryDimension, keys: (row: ClinicAnalyticsQueryRow) => readonly string[]): AnalyticsDimensionSpec<ClinicAnalyticsQueryRow, ClinicAnalyticsQueryDimension> {
	return treatmentDimension(id, keys, (first, second) => clinicAnalyticsTreatmentStatusWeight[first as ClinicAnalyticsVaccineStatusKey] - clinicAnalyticsTreatmentStatusWeight[second as ClinicAnalyticsVaccineStatusKey]);
}

function petsForRow(row: ClinicAnalyticsQueryRow): QueryPetSnapshot[] {
	if (row.kind === 'owner') return row.owner.pets;
	return [row.pet];
}

function ownersForRow(row: ClinicAnalyticsQueryRow): readonly ClinicAnalyticsOwnerStudyItem[] {
	if (row.kind === 'owner') return [row.owner];
	return row.owners;
}

function vaccineKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	if (row.kind === 'vaccine') return uniqueKeys([row.vaccine.normalizedName], untrackedKey);
	return uniqueKeys(petsForRow(row).flatMap((pet) => pet.vaccineNormalizedNames), untrackedKey);
}

function vaccineStatusKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	if (row.kind === 'vaccine') return uniqueKeys([row.vaccine.status], untrackedKey);
	return uniqueKeys(petsForRow(row).flatMap((pet) => treatmentStatuses(pet.vaccines, pet.vaccineStatus)), untrackedKey);
}

function antiparasiticKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	if (row.kind === 'antiparasitic') return uniqueKeys([row.antiparasitic.normalizedName], untrackedKey);
	return uniqueKeys(petsForRow(row).flatMap((pet) => pet.antiparasiticNormalizedNames), untrackedKey);
}

function antiparasiticStatusKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	if (row.kind === 'antiparasitic') return uniqueKeys([row.antiparasitic.status], untrackedKey);
	return uniqueKeys(petsForRow(row).flatMap((pet) => treatmentStatuses(pet.antiparasitics, pet.antiparasiticStatus)), untrackedKey);
}

function ownerCityKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	const ownerKeys = ownersForRow(row).map((owner) => owner.cityKey);
	if (ownerKeys.length > 0) return ownerKeys;
	return row.kind === 'owner' ? [] : row.pet.ownerCityKeys;
}

function ownerLocationKeysForRow(row: ClinicAnalyticsQueryRow): string[] {
	const ownerKeys = ownersForRow(row).map((owner) => owner.locationKey);
	if (ownerKeys.length > 0) return ownerKeys;
	return row.kind === 'owner' ? [] : row.pet.ownerLocationKeys;
}

function listOwnersForPet(pet: ClinicAnalyticsPetStudyItem, ownersById: Map<string, ClinicAnalyticsOwnerStudyItem>, ownersByPetId: ReadonlyMap<string, ClinicAnalyticsOwnerStudyItem[]>): ClinicAnalyticsOwnerStudyItem[] {
	const directOwners = pet.owners.map((owner) => ownersById.get(owner.id)).filter((owner): owner is ClinicAnalyticsOwnerStudyItem => !!owner);
	if (directOwners.length > 0) return directOwners;
	return ownersByPetId.get(pet.id) ?? [];
}

function ownersByPetIdFromOwners(owners: readonly ClinicAnalyticsOwnerStudyItem[]): Map<string, ClinicAnalyticsOwnerStudyItem[]> {
	const ownersByPetId = new Map<string, ClinicAnalyticsOwnerStudyItem[]>();
	for (const owner of owners) {
		for (const pet of owner.pets) {
			const petOwners = ownersByPetId.get(pet.id) ?? [];
			petOwners.push(owner);
			ownersByPetId.set(pet.id, petOwners);
		}
	}
	return ownersByPetId;
}

function clinicAnalyticsOwnerPetCountBand(value: number): ClinicAnalyticsPetCountBandKey {
	if (value <= 0) return 'none';
	if (value === 1) return 'one';
	if (value === 2) return 'two';
	return 'threePlus';
}

function clinicAnalyticsOwnerVaccineStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsVaccineStatusKey {
	let status: ClinicAnalyticsVaccineStatusKey = 'untracked';
	for (const pet of owner.pets) if (clinicAnalyticsTreatmentStatusWeight[pet.vaccineStatus] > clinicAnalyticsTreatmentStatusWeight[status]) status = pet.vaccineStatus;
	return status;
}

function clinicAnalyticsOwnerAntiparasiticStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsAntiparasiticStatusKey {
	let status: ClinicAnalyticsAntiparasiticStatusKey = 'untracked';
	for (const pet of owner.pets) if (clinicAnalyticsTreatmentStatusWeight[pet.antiparasiticStatus] > clinicAnalyticsTreatmentStatusWeight[status]) status = pet.antiparasiticStatus;
	return status;
}

function treatmentStatuses<StatusKey extends string>(treatments: readonly { status: StatusKey }[], fallbackStatus: StatusKey): string[] {
	return treatments.length > 0 ? treatments.map((treatment) => treatment.status) : [fallbackStatus];
}

function comparePetCountKeys(first: string, second: string): number {
	return clinicAnalyticsPetCountBandWeight[first as ClinicAnalyticsPetCountBandKey] - clinicAnalyticsPetCountBandWeight[second as ClinicAnalyticsPetCountBandKey];
}

function uniqueKeys(values: readonly string[], fallback: string): string[] {
	const keys = values.map((value) => value.trim()).filter((value) => value.length > 0);
	return keys.length > 0 ? [...new Set(keys)] : [fallback];
}
