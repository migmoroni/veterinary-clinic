import type { MedicationSpecies } from './catalog.js';
import type { TreatmentKind, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';

export type MedicationProtocolKind = TreatmentKind;
export type MedicationProtocolOrigin = 'system' | 'user';
export type MedicationValidityUnit = TreatmentValidityUnit;

export interface MedicationProtocolCatalogItem {
	id: number;
	name: string;
	normalizedName: string;
	species: MedicationSpecies[];
}

export interface MedicationProtocolDose {
	id: number;
	protocolId: number;
	dose: string;
	validityValue: number;
	validityUnit: MedicationValidityUnit;
	sortOrder: number;
	updatedAt: string | null;
}

export interface MedicationProtocol {
	id: number;
	kind: MedicationProtocolKind;
	origin: MedicationProtocolOrigin;
	name: string;
	normalizedName: string;
	species: MedicationSpecies[];
	observation: string | null;
	sortOrder: number;
	hiddenAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
	updatedAt: string | null;
	items: MedicationProtocolCatalogItem[];
	doses: MedicationProtocolDose[];
}

export interface MedicationProtocolInput {
	kind: MedicationProtocolKind;
	name: string;
	species?: MedicationSpecies[];
	catalogItemIds: number[];
	observation: string | null;
}

export interface MedicationProtocolDoseInput {
	dose: string;
	validityValue: number;
	validityUnit: MedicationValidityUnit;
}

export function normalizeMedicationProtocolName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export function canEditMedicationProtocol(protocol: Pick<MedicationProtocol, 'origin'>): boolean {
	return protocol.origin === 'user';
}

export function canDeleteMedicationProtocol(protocol: Pick<MedicationProtocol, 'origin'>): boolean {
	return canEditMedicationProtocol(protocol);
}
