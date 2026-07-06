import type { PetBreed, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import type { TreatmentStatusKey } from '$lib/domain/treatment/analytics.js';

export type DashboardAnalysisView = 'general' | 'vaccines' | 'antiparasitics' | 'pets' | 'owners';
export type DashboardSpeciesKey = PetSpecies | 'unknown';
export type DashboardBreedKey = PetBreed | 'unknown';
export type DashboardSexKey = Exclude<PetSex, null> | 'unknown';
export type DashboardAgeBandKey = 'months0To3' | 'months3To6' | 'months6To12' | `year:${number}` | 'unknown';
export type DashboardPetCountBandKey = 'none' | 'one' | 'two' | 'threePlus';
export type DashboardVaccineStatusKey = TreatmentStatusKey | 'untracked';
export type DashboardAntiparasiticStatusKey = TreatmentStatusKey | 'untracked';

export const dashboardAnalysisViews: DashboardAnalysisView[] = ['general', 'vaccines', 'antiparasitics', 'pets', 'owners'];
export const dashboardVaccineStatusKeys: DashboardVaccineStatusKey[] = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue', 'untracked'];
export const dashboardAntiparasiticStatusKeys: DashboardAntiparasiticStatusKey[] = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue', 'untracked'];

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
	byAntiparasiticStatus: DashboardBucket<DashboardAntiparasiticStatusKey>[];
}

export interface DashboardPetStudyOwner {
	id: number;
	name: string;
	cityKey: string;
	cityLabel: string | null;
	locationKey: string;
	locationLabel: string | null;
}

export interface DashboardPetStudyTreatment<StatusKey extends string> {
	normalizedName: string;
	name: string;
	dose: string;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: StatusKey;
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
	antiparasiticStatus: DashboardAntiparasiticStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: DashboardPetStudyTreatment<DashboardVaccineStatusKey>[];
	antiparasiticNormalizedNames: string[];
	antiparasiticNames: string[];
	antiparasitics: DashboardPetStudyTreatment<DashboardAntiparasiticStatusKey>[];
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
	antiparasiticStatus: DashboardAntiparasiticStatusKey;
	vaccineNormalizedNames: string[];
	vaccineNames: string[];
	vaccines: DashboardPetStudyTreatment<DashboardVaccineStatusKey>[];
	antiparasiticNormalizedNames: string[];
	antiparasiticNames: string[];
	antiparasitics: DashboardPetStudyTreatment<DashboardAntiparasiticStatusKey>[];
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
	byPetAntiparasiticStatus: DashboardBucket<DashboardAntiparasiticStatusKey>[];
}

export interface DashboardStudyAnalytics {
	pets: DashboardPetStudyItem[];
	owners: DashboardOwnerStudyItem[];
	vaccines: DashboardNamedBucket[];
	antiparasitics: DashboardNamedBucket[];
	ownerCities: DashboardNamedBucket[];
	ownerLocations: DashboardNamedBucket[];
}

export interface DashboardAnalytics {
	pets: DashboardPetAnalytics;
	owners: DashboardOwnerAnalytics;
	study: DashboardStudyAnalytics;
}
