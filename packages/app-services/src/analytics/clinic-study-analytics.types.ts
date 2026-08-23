import type {
	ClinicAnalyticsAntiparasiticStatusKey,
	ClinicAnalyticsOwnerStudyItem,
	ClinicAnalyticsPetStudyItem,
	ClinicAnalyticsStudyTarget,
	ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';

export type ClinicAnalyticsQueryTarget = ClinicAnalyticsStudyTarget;

export type ClinicAnalyticsQueryDimension =
	| 'petSpecies'
	| 'petBreed'
	| 'petSex'
	| 'petAge'
	| 'petVaccineStatus'
	| 'petAntiparasiticStatus'
	| 'ownerCity'
	| 'ownerLocation'
	| 'ownerPetCount'
	| 'ownerPetVaccineStatus'
	| 'ownerPetAntiparasiticStatus'
	| 'ownerPetSpecies'
	| 'vaccine'
	| 'vaccineStatus'
	| 'antiparasitic'
	| 'antiparasiticStatus';

export type ClinicAnalyticsStudyDimension = ClinicAnalyticsQueryDimension;

export type ClinicAnalyticsQueryFilter = 'petSpecies' | 'petBreed' | 'petSex' | 'petAge' | 'ownerCity' | 'ownerPetCount' | 'vaccine' | 'vaccineStatus' | 'antiparasitic' | 'antiparasiticStatus';
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

export type ClinicAnalyticsQueryRow =
	| { kind: 'pet'; pet: ClinicAnalyticsPetStudyItem; owners: readonly ClinicAnalyticsOwnerStudyItem[] }
	| { kind: 'owner'; owner: ClinicAnalyticsOwnerStudyItem }
	| { kind: 'vaccine'; vaccine: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>; pet: ClinicAnalyticsPetStudyItem; owners: readonly ClinicAnalyticsOwnerStudyItem[] }
	| { kind: 'antiparasitic'; antiparasitic: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>; pet: ClinicAnalyticsPetStudyItem; owners: readonly ClinicAnalyticsOwnerStudyItem[] };
