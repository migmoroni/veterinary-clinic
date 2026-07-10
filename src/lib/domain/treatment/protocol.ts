import type { TreatmentCatalogItemId, TreatmentKind, TreatmentSpecies, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';

export type TreatmentProtocolKind = TreatmentKind;
export type TreatmentProtocolId = string;
export type TreatmentProtocolOrigin = 'system' | 'user';
export type TreatmentProtocolValidityUnit = TreatmentValidityUnit;

export interface TreatmentProtocolCatalogItem {
	id: TreatmentCatalogItemId;
	name: string;
	normalizedName: string;
	species: TreatmentSpecies[];
}

export interface TreatmentProtocolDose {
	id: number;
	protocolId: TreatmentProtocolId;
	dose: string;
	validityValue: number;
	validityUnit: TreatmentProtocolValidityUnit;
	sortOrder: number;
	updatedAt: string | null;
}

export interface TreatmentProtocol {
	id: TreatmentProtocolId;
	kind: TreatmentProtocolKind;
	origin: TreatmentProtocolOrigin;
	name: string;
	normalizedName: string;
	species: TreatmentSpecies[];
	observation: string | null;
	sortOrder: number;
	hiddenAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
	updatedAt: string | null;
	items: TreatmentProtocolCatalogItem[];
	doses: TreatmentProtocolDose[];
}

export interface TreatmentProtocolInput {
	kind: TreatmentProtocolKind;
	name: string;
	species?: TreatmentSpecies[];
	catalogItemIds: TreatmentCatalogItemId[];
	observation: string | null;
}

export interface TreatmentProtocolDoseInput {
	dose: string;
	validityValue: number;
	validityUnit: TreatmentProtocolValidityUnit;
}

export function normalizeTreatmentProtocolName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export function canEditTreatmentProtocol(protocol: Pick<TreatmentProtocol, 'origin'>): boolean {
	return protocol.origin === 'user';
}

export function canDeleteTreatmentProtocol(protocol: Pick<TreatmentProtocol, 'origin'>): boolean {
	return canEditTreatmentProtocol(protocol);
}
