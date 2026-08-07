import type { PetBreed, PetSex, PetSpecies } from '@vet/types/domain/pet/pet.js';
import type { TreatmentStatusKey } from '@vet/types/domain/treatment/analytics.js';

export type ClinicAnalyticsStudyTarget = 'vaccines' | 'antiparasitics' | 'pets' | 'owners';
export type ClinicAnalyticsSpeciesKey = PetSpecies | 'unknown';
export type ClinicAnalyticsBreedKey = PetBreed | 'unknown';
export type ClinicAnalyticsSexKey = Exclude<PetSex, null> | 'unknown';
export type ClinicAnalyticsAgeBandKey = 'months0To3' | 'months3To6' | 'months6To12' | `year:${number}` | 'unknown';
export type ClinicAnalyticsPetCountBandKey = 'none' | 'one' | 'two' | 'threePlus';
export type ClinicAnalyticsTreatmentStatusKey = TreatmentStatusKey | 'untracked';
export type ClinicAnalyticsVaccineStatusKey = ClinicAnalyticsTreatmentStatusKey;
export type ClinicAnalyticsAntiparasiticStatusKey = ClinicAnalyticsTreatmentStatusKey;
export type AnalyticsBucketSortField = 'analysis' | 'count';
export type AnalyticsSortDirection = 'asc' | 'desc';
export type ClinicAnalyticsPetDimension = 'species' | 'breed' | 'sex' | 'age' | 'vaccineStatus';
export type ClinicAnalyticsOwnerDimension = 'location' | 'petCount' | 'petSpecies' | 'petAge' | 'petVaccineStatus';

export const clinicAnalyticsStudyTargets = ['vaccines', 'antiparasitics', 'pets', 'owners'] as const satisfies readonly ClinicAnalyticsStudyTarget[];
export const clinicAnalyticsVaccineStatusKeys = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue', 'untracked'] as const satisfies readonly ClinicAnalyticsVaccineStatusKey[];
export const clinicAnalyticsAntiparasiticStatusKeys = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue', 'untracked'] as const satisfies readonly ClinicAnalyticsAntiparasiticStatusKey[];
export const clinicAnalyticsPetDimensions = ['species', 'breed', 'sex', 'age', 'vaccineStatus'] as const satisfies readonly ClinicAnalyticsPetDimension[];
export const clinicAnalyticsOwnerDimensions = ['location', 'petCount', 'petSpecies', 'petAge', 'petVaccineStatus'] as const satisfies readonly ClinicAnalyticsOwnerDimension[];

export const clinicAnalyticsTreatmentStatusWeight: Record<ClinicAnalyticsTreatmentStatusKey, number> = {
	untracked: 0,
	current: 1,
	dueSoon: 2,
	dueVerySoon: 3,
	expired: 4,
	overdue: 5
};

export const clinicAnalyticsPetCountBandWeight: Record<ClinicAnalyticsPetCountBandKey, number> = {
	none: 0,
	one: 1,
	two: 2,
	threePlus: 3
};

export interface AnalyticsBucket<Key extends string = string> {
	key: Key;
	count: number;
}

export interface AnalyticsNamedBucket<Key extends string = string> extends AnalyticsBucket<Key> {
	label: string | null;
}

export interface ClinicPetAnalytics {
	total: number;
	bySpecies: AnalyticsBucket<ClinicAnalyticsSpeciesKey>[];
	byBreed: AnalyticsBucket<ClinicAnalyticsBreedKey>[];
	bySex: AnalyticsBucket<ClinicAnalyticsSexKey>[];
	byAge: AnalyticsBucket<ClinicAnalyticsAgeBandKey>[];
	byVaccineStatus: AnalyticsBucket<ClinicAnalyticsVaccineStatusKey>[];
	byAntiparasiticStatus: AnalyticsBucket<ClinicAnalyticsAntiparasiticStatusKey>[];
}

export interface ClinicAnalyticsPetOwnerSnapshot {
	id: string;
	name: string;
	cityKey: string;
	cityLabel: string | null;
	locationKey: string;
	locationLabel: string | null;
}

export interface ClinicAnalyticsPetTreatmentSnapshot<StatusKey extends string> {
	normalizedName: string;
	name: string;
	dose: string;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: StatusKey;
}

export interface ClinicAnalyticsOwnerPetSnapshot {
	id: string;
	name: string;
	avatarBytes: Uint8Array | null;
	species: ClinicAnalyticsSpeciesKey;
	breed: ClinicAnalyticsBreedKey;
	sex: ClinicAnalyticsSexKey;
	age: ClinicAnalyticsAgeBandKey;
	vaccineStatus: ClinicAnalyticsVaccineStatusKey;
	antiparasiticStatus: ClinicAnalyticsAntiparasiticStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: ClinicAnalyticsPetTreatmentSnapshot<ClinicAnalyticsVaccineStatusKey>[];
	antiparasiticNormalizedNames: string[];
	antiparasiticNames: string[];
	antiparasitics: ClinicAnalyticsPetTreatmentSnapshot<ClinicAnalyticsAntiparasiticStatusKey>[];
}

export interface ClinicAnalyticsOwnerStudyItem extends ClinicAnalyticsPetOwnerSnapshot {
	petCount: number;
	petNames: string[];
	pets: ClinicAnalyticsOwnerPetSnapshot[];
}

export interface ClinicAnalyticsPetStudyItem {
	id: string;
	name: string;
	avatarBytes: Uint8Array | null;
	species: ClinicAnalyticsSpeciesKey;
	breed: ClinicAnalyticsBreedKey;
	sex: ClinicAnalyticsSexKey;
	age: ClinicAnalyticsAgeBandKey;
	vaccineStatus: ClinicAnalyticsVaccineStatusKey;
	antiparasiticStatus: ClinicAnalyticsAntiparasiticStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: ClinicAnalyticsPetTreatmentSnapshot<ClinicAnalyticsVaccineStatusKey>[];
	antiparasiticNormalizedNames: string[];
	antiparasiticNames: string[];
	antiparasitics: ClinicAnalyticsPetTreatmentSnapshot<ClinicAnalyticsAntiparasiticStatusKey>[];
	owners: ClinicAnalyticsPetOwnerSnapshot[];
	ownerCityKeys: string[];
	ownerCityLabels: string[];
	ownerLocationKeys: string[];
	ownerLocationLabels: string[];
}

export interface ClinicOwnerAnalytics {
	total: number;
	averagePetsPerOwner: number;
	byLocation: AnalyticsNamedBucket[];
	byPetCount: AnalyticsBucket<ClinicAnalyticsPetCountBandKey>[];
	byPetVaccineStatus: AnalyticsBucket<ClinicAnalyticsVaccineStatusKey>[];
	byPetAntiparasiticStatus: AnalyticsBucket<ClinicAnalyticsAntiparasiticStatusKey>[];
}

export interface ClinicAnalyticsStudy {
	pets: ClinicAnalyticsPetStudyItem[];
	owners: ClinicAnalyticsOwnerStudyItem[];
	vaccines: AnalyticsNamedBucket[];
	antiparasitics: AnalyticsNamedBucket[];
	ownerCities: AnalyticsNamedBucket[];
	ownerLocations: AnalyticsNamedBucket[];
}

export interface ClinicAnalytics {
	pets: ClinicPetAnalytics;
	owners: ClinicOwnerAnalytics;
	study: ClinicAnalyticsStudy;
}
