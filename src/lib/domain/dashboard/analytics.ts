import type { PetBreed, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import type { VaccineStatusKey } from '$lib/domain/vaccine/analytics.js';

export type DashboardAnalysisView = 'general' | 'vaccines' | 'pets' | 'owners';
export type DashboardSpeciesKey = PetSpecies | 'unknown';
export type DashboardBreedKey = PetBreed | 'unknown';
export type DashboardSexKey = Exclude<PetSex, null> | 'unknown';
export type DashboardAgeBandKey = 'months0To3' | 'months3To6' | 'months6To12' | `year:${number}` | 'unknown';
export type DashboardPetCountBandKey = 'none' | 'one' | 'two' | 'threePlus';
export type DashboardVaccineStatusKey = VaccineStatusKey | 'untracked';

export const dashboardAnalysisViews: DashboardAnalysisView[] = ['general', 'vaccines', 'pets', 'owners'];
export const dashboardVaccineStatusKeys: DashboardVaccineStatusKey[] = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue', 'untracked'];

export interface DashboardBucket<Key extends string = string> {
	key: Key;
	count: number;
}

export interface DashboardNamedBucket<Key extends string = string> extends DashboardBucket<Key> {
	label: string | null;
}

export interface DashboardPetAnalytics {
	total: number;
	bySpecies: DashboardBucket<DashboardSpeciesKey>[];
	byBreed: DashboardBucket<DashboardBreedKey>[];
	bySex: DashboardBucket<DashboardSexKey>[];
	byAge: DashboardBucket<DashboardAgeBandKey>[];
	byVaccineStatus: DashboardBucket<DashboardVaccineStatusKey>[];
}

export interface DashboardPetStudyOwner {
	id: number;
	name: string;
	cityKey: string;
	cityLabel: string | null;
	locationKey: string;
	locationLabel: string | null;
}

export interface DashboardPetStudyVaccine {
	vaccineNormalizedName: string;
	vaccineName: string;
	doseType: string;
	doseNumber: number | null;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: DashboardVaccineStatusKey;
}

export interface DashboardOwnerStudyPet {
	id: number;
	name: string;
	avatarBytes: Uint8Array | null;
	species: DashboardSpeciesKey;
	breed: DashboardBreedKey;
	sex: DashboardSexKey;
	age: DashboardAgeBandKey;
	vaccineStatus: DashboardVaccineStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: DashboardPetStudyVaccine[];
}

export interface DashboardOwnerStudyItem extends DashboardPetStudyOwner {
	petCount: number;
	petNames: string[];
	pets: DashboardOwnerStudyPet[];
}

export interface DashboardPetStudyItem {
	id: number;
	name: string;
	avatarBytes: Uint8Array | null;
	species: DashboardSpeciesKey;
	breed: DashboardBreedKey;
	sex: DashboardSexKey;
	age: DashboardAgeBandKey;
	vaccineStatus: DashboardVaccineStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: DashboardPetStudyVaccine[];
	owners: DashboardPetStudyOwner[];
	ownerCityKeys: string[];
	ownerCityLabels: string[];
	ownerLocationKeys: string[];
	ownerLocationLabels: string[];
}

export interface DashboardOwnerAnalytics {
	total: number;
	averagePetsPerOwner: number;
	byLocation: DashboardNamedBucket[];
	byPetCount: DashboardBucket<DashboardPetCountBandKey>[];
	byPetVaccineStatus: DashboardBucket<DashboardVaccineStatusKey>[];
}

export interface DashboardStudyAnalytics {
	pets: DashboardPetStudyItem[];
	owners: DashboardOwnerStudyItem[];
	vaccines: DashboardNamedBucket[];
	ownerCities: DashboardNamedBucket[];
	ownerLocations: DashboardNamedBucket[];
}

export interface DashboardAnalytics {
	pets: DashboardPetAnalytics;
	owners: DashboardOwnerAnalytics;
	study: DashboardStudyAnalytics;
}