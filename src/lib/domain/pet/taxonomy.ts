import type { TranslationKey } from '$lib/i18n/index.js';

export type PetSpecies = 'canine' | 'feline';

export interface PetSpeciesOption {
	id: PetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

interface PetBreedOptionBase {
	id: string;
	species: PetSpecies;
	labelKey: TranslationKey;
	imagePath: string;
	fallbackImagePath: string;
}

const canineBreedFallback = '/images/pet-taxonomy/breeds/canine-placeholder.svg';
const felineBreedFallback = '/images/pet-taxonomy/breeds/feline-placeholder.svg';

function breedImage(id: string): string {
	return `/images/pet-taxonomy/breeds/${id}.webp`;
}

export const petSpeciesOptions = [
	{
		id: 'canine',
		labelKey: 'pet.speciesCanine',
		imagePath: '/images/pet-taxonomy/species/canine.webp',
		fallbackImagePath: '/images/pet-taxonomy/species/canine.svg'
	},
	{
		id: 'feline',
		labelKey: 'pet.speciesFeline',
		imagePath: '/images/pet-taxonomy/species/feline.webp',
		fallbackImagePath: '/images/pet-taxonomy/species/feline.svg'
	}
] as const satisfies readonly PetSpeciesOption[];

export const petBreedOptions = [
	{ id: 'mixed-breed', species: 'canine', labelKey: 'pet.breed.mixedBreed', imagePath: breedImage('mixed-breed'), fallbackImagePath: canineBreedFallback },
	{ id: 'shih-tzu', species: 'canine', labelKey: 'pet.breed.shihTzu', imagePath: breedImage('shih-tzu'), fallbackImagePath: canineBreedFallback },
	{ id: 'poodle', species: 'canine', labelKey: 'pet.breed.poodle', imagePath: breedImage('poodle'), fallbackImagePath: canineBreedFallback },
	{ id: 'pinscher', species: 'canine', labelKey: 'pet.breed.pinscher', imagePath: breedImage('pinscher'), fallbackImagePath: canineBreedFallback },
	{ id: 'pit-bull', species: 'canine', labelKey: 'pet.breed.pitBull', imagePath: breedImage('pit-bull'), fallbackImagePath: canineBreedFallback },
	{ id: 'lhasa-apso', species: 'canine', labelKey: 'pet.breed.lhasaApso', imagePath: breedImage('lhasa-apso'), fallbackImagePath: canineBreedFallback },
	{ id: 'dachshund', species: 'canine', labelKey: 'pet.breed.dachshund', imagePath: breedImage('dachshund'), fallbackImagePath: canineBreedFallback },
	{ id: 'rottweiler', species: 'canine', labelKey: 'pet.breed.rottweiler', imagePath: breedImage('rottweiler'), fallbackImagePath: canineBreedFallback },
	{ id: 'labrador-retriever', species: 'canine', labelKey: 'pet.breed.labradorRetriever', imagePath: breedImage('labrador-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'yorkshire-terrier', species: 'canine', labelKey: 'pet.breed.yorkshireTerrier', imagePath: breedImage('yorkshire-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-shepherd', species: 'canine', labelKey: 'pet.breed.germanShepherd', imagePath: breedImage('german-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'chow-chow', species: 'canine', labelKey: 'pet.breed.chowChow', imagePath: breedImage('chow-chow'), fallbackImagePath: canineBreedFallback },
	{ id: 'pug', species: 'canine', labelKey: 'pet.breed.pug', imagePath: breedImage('pug'), fallbackImagePath: canineBreedFallback },
	{ id: 'maltese', species: 'canine', labelKey: 'pet.breed.maltese', imagePath: breedImage('maltese'), fallbackImagePath: canineBreedFallback },
	{ id: 'border-collie', species: 'canine', labelKey: 'pet.breed.borderCollie', imagePath: breedImage('border-collie'), fallbackImagePath: canineBreedFallback },
	{ id: 'golden-retriever', species: 'canine', labelKey: 'pet.breed.goldenRetriever', imagePath: breedImage('golden-retriever'), fallbackImagePath: canineBreedFallback },
	{ id: 'australian-cattle-dog', species: 'canine', labelKey: 'pet.breed.australianCattleDog', imagePath: breedImage('australian-cattle-dog'), fallbackImagePath: canineBreedFallback },
	{ id: 'boxer', species: 'canine', labelKey: 'pet.breed.boxer', imagePath: breedImage('boxer'), fallbackImagePath: canineBreedFallback },
	{ id: 'brazilian-terrier', species: 'canine', labelKey: 'pet.breed.brazilianTerrier', imagePath: breedImage('brazilian-terrier'), fallbackImagePath: canineBreedFallback },
	{ id: 'cocker-spaniel', species: 'canine', labelKey: 'pet.breed.cockerSpaniel', imagePath: breedImage('cocker-spaniel'), fallbackImagePath: canineBreedFallback },
	{ id: 'german-spitz', species: 'canine', labelKey: 'pet.breed.germanSpitz', imagePath: breedImage('german-spitz'), fallbackImagePath: canineBreedFallback },
	{ id: 'pekingese', species: 'canine', labelKey: 'pet.breed.pekingese', imagePath: breedImage('pekingese'), fallbackImagePath: canineBreedFallback },
	{ id: 'fila-brasileiro', species: 'canine', labelKey: 'pet.breed.filaBrasileiro', imagePath: breedImage('fila-brasileiro'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-bully', species: 'canine', labelKey: 'pet.breed.americanBully', imagePath: breedImage('american-bully'), fallbackImagePath: canineBreedFallback },
	{ id: 'french-bulldog', species: 'canine', labelKey: 'pet.breed.frenchBulldog', imagePath: breedImage('french-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'american-foxhound', species: 'canine', labelKey: 'pet.breed.americanFoxhound', imagePath: breedImage('american-foxhound'), fallbackImagePath: canineBreedFallback },
	{ id: 'siberian-husky', species: 'canine', labelKey: 'pet.breed.siberianHusky', imagePath: breedImage('siberian-husky'), fallbackImagePath: canineBreedFallback },
	{ id: 'shar-pei', species: 'canine', labelKey: 'pet.breed.sharPei', imagePath: breedImage('shar-pei'), fallbackImagePath: canineBreedFallback },
	{ id: 'beagle', species: 'canine', labelKey: 'pet.breed.beagle', imagePath: breedImage('beagle'), fallbackImagePath: canineBreedFallback },
	{ id: 'dalmatian', species: 'canine', labelKey: 'pet.breed.dalmatian', imagePath: breedImage('dalmatian'), fallbackImagePath: canineBreedFallback },
	{ id: 'schnauzer', species: 'canine', labelKey: 'pet.breed.schnauzer', imagePath: breedImage('schnauzer'), fallbackImagePath: canineBreedFallback },
	{ id: 'belgian-shepherd', species: 'canine', labelKey: 'pet.breed.belgianShepherd', imagePath: breedImage('belgian-shepherd'), fallbackImagePath: canineBreedFallback },
	{ id: 'english-bulldog', species: 'canine', labelKey: 'pet.breed.englishBulldog', imagePath: breedImage('english-bulldog'), fallbackImagePath: canineBreedFallback },
	{ id: 'feline-mixed-breed', species: 'feline', labelKey: 'pet.breed.felineMixedBreed', imagePath: breedImage('feline-mixed-breed'), fallbackImagePath: felineBreedFallback },
	{ id: 'siamese', species: 'feline', labelKey: 'pet.breed.siamese', imagePath: breedImage('siamese'), fallbackImagePath: felineBreedFallback },
	{ id: 'persian', species: 'feline', labelKey: 'pet.breed.persian', imagePath: breedImage('persian'), fallbackImagePath: felineBreedFallback }
] as const satisfies readonly PetBreedOptionBase[];

export type PetBreed = (typeof petBreedOptions)[number]['id'];
export type PetBreedOption = (typeof petBreedOptions)[number];

const petSpeciesIds = new Set<string>(petSpeciesOptions.map((option) => option.id));
const petBreedIds = new Set<string>(petBreedOptions.map((option) => option.id));

export function isPetSpecies(value: string | null | undefined): value is PetSpecies {
	return petSpeciesIds.has(value ?? '');
}

export function isPetBreed(value: string | null | undefined): value is PetBreed {
	return petBreedIds.has(value ?? '');
}

export function getPetSpeciesOption(species: PetSpecies | null | undefined): PetSpeciesOption | null {
	return petSpeciesOptions.find((option) => option.id === species) ?? null;
}

export function getPetBreedOption(breed: PetBreed | null | undefined): PetBreedOption | null {
	return petBreedOptions.find((option) => option.id === breed) ?? null;
}

export function getPetBreedOptions(species: PetSpecies | null | undefined): PetBreedOption[] {
	if (!species) return [];
	return petBreedOptions.filter((option) => option.species === species);
}

export function isPetBreedForSpecies(species: PetSpecies, breed: PetBreed): boolean {
	return getPetBreedOptions(species).some((option) => option.id === breed);
}