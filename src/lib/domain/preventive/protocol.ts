import type { KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';

export type PreventiveProtocolKind = 'vaccine' | 'antiparasitic';
export type PreventiveProtocolOrigin = 'system' | 'user';
export type PreventiveValidityUnit = 'days' | 'months' | 'years';

export interface PreventiveProtocolCatalogItem {
	id: number;
	name: string;
	normalizedName: string;
	species: KnownPetSpecies[];
}

export interface PreventiveProtocolDose {
	id: number;
	protocolId: number;
	dose: string;
	validityValue: number;
	validityUnit: PreventiveValidityUnit;
	sortOrder: number;
	updatedAt: string | null;
}

export interface PreventiveProtocol {
	id: number;
	kind: PreventiveProtocolKind;
	origin: PreventiveProtocolOrigin;
	name: string;
	normalizedName: string;
	species: KnownPetSpecies[];
	observation: string | null;
	sortOrder: number;
	hiddenAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
	updatedAt: string | null;
	items: PreventiveProtocolCatalogItem[];
	doses: PreventiveProtocolDose[];
}

export interface PreventiveProtocolInput {
	kind: PreventiveProtocolKind;
	name: string;
	species?: KnownPetSpecies[];
	catalogItemIds: number[];
	observation: string | null;
}

export interface PreventiveProtocolDoseInput {
	dose: string;
	validityValue: number;
	validityUnit: PreventiveValidityUnit;
}

export function normalizePreventiveProtocolName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export function canEditPreventiveProtocol(protocol: Pick<PreventiveProtocol, 'origin'>): boolean {
	return protocol.origin === 'user';
}

export function canDeletePreventiveProtocol(protocol: Pick<PreventiveProtocol, 'origin'>): boolean {
	return canEditPreventiveProtocol(protocol);
}
