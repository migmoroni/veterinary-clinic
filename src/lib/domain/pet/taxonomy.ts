import type { TranslationKey } from '$lib/i18n/index.js';
import { defaultBreedReferenceItems } from './default-breed-reference.js';

const knownPetSpeciesIds = ['canine', 'feline'] as const;

export type KnownPetSpecies = (typeof knownPetSpeciesIds)[number];
export type PetSpecies = KnownPetSpecies | (string & {});

export interface PetSpeciesOption {
	id: KnownPetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

export interface PetBreedOption {
	id: string;
	species: KnownPetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

export type KnownPetBreed = string;
export type PetBreed = KnownPetBreed | (string & {});

const canineBreedFallback = '/images/pet-taxonomy/breeds/canine-placeholder.svg';
const felineBreedFallback = '/images/pet-taxonomy/breeds/feline-placeholder.svg';

function breedFallbackImagePath(species: KnownPetSpecies): string {
	return species === 'canine' ? canineBreedFallback : felineBreedFallback;
}

export const petSpeciesOptions = [
	{
		id: 'canine',
		labelKey: 'pet.speciesCanine',
		imagePath: '/images/pet-taxonomy/species/canine.svg',
		fallbackImagePath: '/images/pet-taxonomy/species/canine.svg'
	},
	{
		id: 'feline',
		labelKey: 'pet.speciesFeline',
		imagePath: '/images/pet-taxonomy/species/feline.svg',
		fallbackImagePath: '/images/pet-taxonomy/species/feline.svg'
	}
] as const satisfies readonly PetSpeciesOption[];

export const petBreedOptions = defaultBreedReferenceItems.map((item) => ({
	id: item.id,
	species: item.species,
	labelKey: item.labelKey,
	imagePath: breedFallbackImagePath(item.species),
	fallbackImagePath: breedFallbackImagePath(item.species)
})) satisfies PetBreedOption[];

const petSpeciesIds = new Set<string>(petSpeciesOptions.map((option) => option.id));
const petBreedIds = new Set<string>(petBreedOptions.map((option) => option.id));

export function isPetSpecies(value: string | null | undefined): value is KnownPetSpecies {
	return petSpeciesIds.has(value ?? '');
}

export function isPetBreed(value: string | null | undefined): value is KnownPetBreed {
	return petBreedIds.has(value ?? '');
}

export function getPetSpeciesOption(species: string | null | undefined): PetSpeciesOption | null {
	return petSpeciesOptions.find((option) => option.id === species) ?? null;
}

export function getPetBreedOption(breed: string | null | undefined): PetBreedOption | null {
	return petBreedOptions.find((option) => option.id === breed) ?? null;
}

export function getPetBreedOptions(species: string | null | undefined): PetBreedOption[] {
	if (!species) return [];
	return petBreedOptions.filter((option) => option.species === species);
}

export function isPetBreedForSpecies(species: string, breed: string): boolean {
	return getPetBreedOptions(species).some((option) => option.id === breed);
}
