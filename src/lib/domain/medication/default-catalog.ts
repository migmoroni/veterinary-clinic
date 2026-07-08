import type { MedicationCatalogExtension } from '$lib/domain/medication/catalog.js';
import type { TreatmentKind } from '$lib/domain/treatment/treatment.js';

export type DefaultMedicationKind = TreatmentKind;
export type DefaultMedicationSpecies = 'canine' | 'feline';

export interface DefaultMedicationCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultMedicationCatalogItem {
	kind: DefaultMedicationKind;
	origin: 'system';
	name: string;
	species: DefaultMedicationSpecies[];
	aliases: string[];
	manufacturer: string;
	images?: DefaultMedicationCatalogImage[];
	regions: string[];
	extension?: Partial<MedicationCatalogExtension>;
}

type DefaultMedicationCatalogJsonItem = Omit<DefaultMedicationCatalogItem, 'kind'>;

const vaccineCatalogModules = import.meta.glob('./defaults/vaccine/*.json', { eager: true, import: 'default' }) as Record<string, DefaultMedicationCatalogJsonItem>;
const antiparasiticCatalogModules = import.meta.glob('./defaults/antiparasitic/*.json', { eager: true, import: 'default' }) as Record<string, DefaultMedicationCatalogJsonItem>;

function withKind(kind: DefaultMedicationKind, modules: Record<string, DefaultMedicationCatalogJsonItem>): DefaultMedicationCatalogItem[] {
	return Object.entries(modules)
		.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
		.map(([, item]) => ({ kind, ...item }));
}

export const defaultMedicationCatalogItems: DefaultMedicationCatalogItem[] = [
	...withKind('vaccine', vaccineCatalogModules),
	...withKind('antiparasitic', antiparasiticCatalogModules)
];
