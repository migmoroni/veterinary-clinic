import { describe, expect, it } from 'vitest';
import { getPetBreedOption, getPetBreedOptions, getPetSpeciesOption, isPetBreed, isPetBreedForSpecies, isPetSpecies, petBreedOptions } from '../taxonomy.js';

describe('pet taxonomy', () => {
	it('lists breeds by species', () => {
		expect(getPetBreedOptions('canine')).toHaveLength(328);
		expect(getPetBreedOptions('feline')).toHaveLength(80);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'poodle')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'akita')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'whippet')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'west-highland-white-terrier')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'brazilian-pit-monster')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'gaucho-sheepdog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'miniature-schnauzer')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'appenzeller-sennenhund')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'boca-preta-sertanejo')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'colombian-fino-hound')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'africanis')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'sloughi')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'american-hairless-terrier')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'greenland-dog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'calupoh')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'australian-stumpy-tail-cattle-dog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'tenterfield-terrier')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'huntaway')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'hokkaido')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'taiwan-dog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'central-asian-shepherd-dog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'indian-spitz')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'akbash')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'armenian-gampr')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'sarabi-dog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'tarsus-catalburun')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'russian-toy')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'west-siberian-laika')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'polish-tatra-sheepdog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'czechoslovakian-wolfdog')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'sarplaninac')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'spanish-mastiff')).toBe(true);
		expect(getPetBreedOptions('canine').some((option) => option.id === 'danish-swedish-farmdog')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'siamese')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'maine-coon')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'somali')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'tonkinese')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'bombay')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'sokoke')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'american-bobtail')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'american-wirehair')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'russian-white-black-tabby')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'dragon-li')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'suphalak')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'raas-cat')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'aphrodite')).toBe(true);
		expect(getPetBreedOptions('feline').some((option) => option.id === 'toybob')).toBe(true);
		expect(getPetBreedOption('chantilly-tiffany')).toBeNull();
	});

	it('guards known species and compatible breeds', () => {
		expect(isPetSpecies('canine')).toBe(true);
		expect(isPetSpecies('bird')).toBe(false);
		expect(isPetBreedForSpecies('canine', 'poodle')).toBe(true);
		expect(isPetBreedForSpecies('canine', 'siamese')).toBe(false);
		expect(isPetBreedForSpecies('bird', 'poodle')).toBe(false);
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
		expect(getPetSpeciesOption('ave')).toBeNull();
		expect(getPetBreedOption(null)).toBeNull();
		expect(getPetBreedOption('raça manual')).toBeNull();
		expect(getPetBreedOptions(null)).toEqual([]);
		expect(getPetBreedOptions('ave')).toEqual([]);
	});

	it('keeps every configured breed compatible with its own species', () => {
		for (const breed of petBreedOptions) {
			expect(isPetBreedForSpecies(breed.species, breed.id)).toBe(true);
		}
	});
});