import type { TreatmentKind } from '$lib/domain/treatment/treatment.js';
import vaccineCatalog from './defaults/vaccine-catalog.json' with { type: 'json' };
import antiparasiticCatalog from './defaults/antiparasitic-catalog.json' with { type: 'json' };

export type DefaultMedicationKind = TreatmentKind;
export type DefaultMedicationSpecies = 'canine' | 'feline';

export interface DefaultMedicationCatalogItem {
	kind: DefaultMedicationKind;
	origin: 'system';
	name: string;
	species: DefaultMedicationSpecies[];
	aliases: string[];
	manufacturer: string;
	regions: string[];
}

type DefaultMedicationCatalogJsonItem = Omit<DefaultMedicationCatalogItem, 'kind'>;

function withKind(kind: DefaultMedicationKind, items: DefaultMedicationCatalogJsonItem[]): DefaultMedicationCatalogItem[] {
	return items.map((item) => ({ kind, ...item }));
}

export const defaultMedicationCatalogItems: DefaultMedicationCatalogItem[] = [
	...withKind('vaccine', vaccineCatalog as DefaultMedicationCatalogJsonItem[]),
	...withKind('antiparasitic', antiparasiticCatalog as DefaultMedicationCatalogJsonItem[])
];
