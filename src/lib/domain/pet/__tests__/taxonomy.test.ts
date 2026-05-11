import { describe, expect, it } from 'vitest';
import { getPetBreedOptions, isPetBreedForSpecies, isPetSpecies } from '../taxonomy.js';

describe('pet taxonomy', () => {
	it('lists breeds by species', () => {
		expect(getPetBreedOptions('canine').some((option) => option.id === 'poodle')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'siamese')).toBe(true);
	});

	it('guards valid species and compatible breeds', () => {
		expect(isPetSpecies('canine')).toBe(true);
		expect(isPetSpecies('bird')).toBe(false);
		expect(isPetBreedForSpecies('canine', 'poodle')).toBe(true);
		expect(isPetBreedForSpecies('canine', 'siamese')).toBe(false);
	});
});