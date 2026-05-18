import { describe, expect, it } from 'vitest';
import { getPetBreedOption, getPetBreedOptions, getPetSpeciesOption, isPetBreed, isPetBreedForSpecies, isPetSpecies, petBreedOptions } from '../taxonomy.js';

describe('pet taxonomy', () => {
	it('lists breeds by species', () => {
		expect(getPetBreedOptions('canine').some((option) => option.id === 'poodle')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'akita')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'whippet')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'west-highland-white-terrier')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'siamese')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'maine-coon')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'somali')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'tonkinese')).toBe(true);
	});

	it('guards valid species and compatible breeds', () => {
		expect(isPetSpecies('canine')).toBe(true);
		expect(isPetSpecies('bird')).toBe(false);
		expect(isPetBreedForSpecies('canine', 'poodle')).toBe(true);
		expect(isPetBreedForSpecies('canine', 'siamese')).toBe(false);
	});

	it('rejects casing, markup-like values and oversized unknown ids', () => {
		expect(isPetSpecies('CANINE')).toBe(false);
		expect(isPetSpecies('<script>canine</script>')).toBe(false);
		expect(isPetBreed('poodle')).toBe(true);
		expect(isPetBreed('POODLE')).toBe(false);
		expect(isPetBreed('poodle<script>')).toBe(false);
		expect(isPetBreed('x'.repeat(10_000))).toBe(false);
		expect(isPetBreed('raça manual')).toBe(false);
	});

	it('returns null or empty collections for missing taxonomy selections', () => {
		expect(getPetSpeciesOption(null)).toBeNull();
		expect(getPetBreedOption(null)).toBeNull();
		expect(getPetBreedOption('raça manual')).toBeNull();
		expect(getPetBreedOptions(null)).toEqual([]);
	});

	it('keeps every configured breed compatible with its own species', () => {
		for (const breed of petBreedOptions) {
			expect(isPetBreedForSpecies(breed.species, breed.id)).toBe(true);
		}
	});
});