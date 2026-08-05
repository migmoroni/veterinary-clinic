import type { TranslationKey } from '@vet/types/i18n/index.js';
import type { BreedReferenceExtension, BreedReferenceOrigin, BreedSexRange, BreedSizeCategory } from './breed-reference.js';
import type { KnownPetSpecies } from './taxonomy.js';

export interface DefaultBreedReferenceImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultBreedReferenceItem {
	id: string;
	species: KnownPetSpecies;
	labelKey: TranslationKey;
	origin: BreedReferenceOrigin;
	sizeCategory: BreedSizeCategory;
	averageWeightKg: BreedSexRange;
	averageHeightCm: BreedSexRange;
	images?: DefaultBreedReferenceImage[];
	extension?: Partial<BreedReferenceExtension>;
}

const canineBreedReferenceModules = import.meta.glob('./defaults/canine/*.json', { eager: true, import: 'default' }) as Record<string, DefaultBreedReferenceItem>;
const felineBreedReferenceModules = import.meta.glob('./defaults/feline/*.json', { eager: true, import: 'default' }) as Record<string, DefaultBreedReferenceItem>;

function sortedItems(modules: Record<string, DefaultBreedReferenceItem>): DefaultBreedReferenceItem[] {
	return Object.entries(modules)
		.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
		.map(([, item]) => item);
}

export const defaultBreedReferenceItems: DefaultBreedReferenceItem[] = [
	...sortedItems(canineBreedReferenceModules),
	...sortedItems(felineBreedReferenceModules)
];
