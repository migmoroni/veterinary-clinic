import { describe, expect, it } from 'vitest';
import { breedReferenceProfiles, getBreedOriginMapPosition, getBreedReferenceProfile } from '../breed-reference.js';
import { petBreedOptions } from '../taxonomy.js';

describe('breed reference', () => {
	it('provides a reference profile for every configured breed', () => {
		expect(breedReferenceProfiles).toHaveLength(petBreedOptions.length);

		for (const breed of petBreedOptions) {
			const profile = getBreedReferenceProfile(breed.id);

			expect(profile).not.toBeNull();
			expect(profile?.option.id).toBe(breed.id);
			expect(profile?.averageWeightKg.male[0]).toBeGreaterThan(0);
			expect(profile?.averageWeightKg.female[0]).toBeGreaterThan(0);
			expect(profile?.averageHeightCm.male[0]).toBeGreaterThan(0);
			expect(profile?.averageHeightCm.female[0]).toBeGreaterThan(0);
			expect(profile?.averageWeightKg.male[0]).toBeLessThanOrEqual(profile?.averageWeightKg.male[1] ?? 0);
			expect(profile?.averageWeightKg.female[0]).toBeLessThanOrEqual(profile?.averageWeightKg.female[1] ?? 0);
			expect(profile?.averageHeightCm.male[0]).toBeLessThanOrEqual(profile?.averageHeightCm.male[1] ?? 0);
			expect(profile?.averageHeightCm.female[0]).toBeLessThanOrEqual(profile?.averageHeightCm.female[1] ?? 0);
		}
	});

	it('uses breed-specific adult size ranges for known edge cases', () => {
		expect(getBreedReferenceProfile('brazilian-pit-monster')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [45, 60], female: [40, 55] },
			averageHeightCm: { male: [55, 65], female: [50, 60] }
		});
		expect(getBreedReferenceProfile('rottweiler')).toMatchObject({
			sizeCategory: 'large',
			averageWeightKg: { male: [50, 60], female: [35, 48] }
		});
		expect(getBreedReferenceProfile('chihuahua')).toMatchObject({
			sizeCategory: 'small',
			averageWeightKg: { male: [1.8, 3], female: [1.5, 2.8] }
		});
		expect(getBreedReferenceProfile('maine-coon')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [6, 11], female: [4, 7] }
		});
		expect(getBreedReferenceProfile('miniature-schnauzer')).toMatchObject({
			sizeCategory: 'small',
			averageWeightKg: { male: [5, 9], female: [5, 8] }
		});
		expect(getBreedReferenceProfile('chausie')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [6, 11], female: [5, 8] }
		});
		expect(getBreedReferenceProfile('original-fila-brasileiro')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [45, 70], female: [38, 60] }
		});
		expect(getBreedReferenceProfile('azawakh')).toMatchObject({
			sizeCategory: 'large',
			averageWeightKg: { male: [20, 25], female: [15, 20] },
			averageHeightCm: { male: [64, 74], female: [60, 70] }
		});
		expect(getBreedReferenceProfile('greenland-dog')).toMatchObject({
			sizeCategory: 'large',
			averageWeightKg: { male: [30, 35], female: [25, 30] },
			averageHeightCm: { male: [60, 68], female: [55, 62] }
		});
		expect(getBreedReferenceProfile('australian-stumpy-tail-cattle-dog')).toMatchObject({
			sizeCategory: 'medium',
			averageWeightKg: { male: [16, 23], female: [14, 20] },
			averageHeightCm: { male: [46, 51], female: [43, 48] }
		});
		expect(getBreedReferenceProfile('huntaway')).toMatchObject({
			sizeCategory: 'large',
			averageWeightKg: { male: [30, 45], female: [25, 38] },
			averageHeightCm: { male: [58, 66], female: [56, 64] }
		});
		expect(getBreedReferenceProfile('central-asian-shepherd-dog')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [50, 79], female: [40, 65] },
			averageHeightCm: { male: [70, 78], female: [65, 73] }
		});
		expect(getBreedReferenceProfile('aksaray-malaklisi')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [65, 85], female: [55, 75] },
			averageHeightCm: { male: [75, 85], female: [70, 80] }
		});
		expect(getBreedReferenceProfile('armenian-gampr')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [50, 70], female: [40, 60] }
		});
		expect(getBreedReferenceProfile('sarabi-dog')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [60, 90], female: [50, 75] }
		});
		expect(getBreedReferenceProfile('tosa')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [45, 90], female: [36, 61] },
			averageHeightCm: { male: [62, 82], female: [55, 72] }
		});
		expect(getBreedReferenceProfile('taiwan-dog')).toMatchObject({
			sizeCategory: 'medium',
			averageWeightKg: { male: [14, 18], female: [12, 16] },
			averageHeightCm: { male: [48, 52], female: [43, 47] }
		});
		expect(getBreedReferenceProfile('raas-cat')).toMatchObject({
			sizeCategory: 'medium',
			averageWeightKg: { male: [4, 6], female: [3, 5] }
		});
		expect(getBreedReferenceProfile('aphrodite')).toMatchObject({
			sizeCategory: 'large',
			averageWeightKg: { male: [6.8, 8.2], female: [4.5, 6.4] }
		});
		expect(getBreedReferenceProfile('american-curl')).toMatchObject({
			sizeCategory: 'medium',
			averageWeightKg: { male: [3.2, 4.5], female: [2.3, 3.6] }
		});
		expect(getBreedReferenceProfile('russian-toy')).toMatchObject({
			sizeCategory: 'small',
			averageWeightKg: { male: [1.5, 3], female: [1.3, 2.8] },
			averageHeightCm: { male: [22, 27], female: [20, 26] }
		});
		expect(getBreedReferenceProfile('moscow-watchdog')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [55, 68], female: [45, 60] },
			averageHeightCm: { male: [68, 78], female: [66, 73] }
		});
		expect(getBreedReferenceProfile('spanish-mastiff')).toMatchObject({
			sizeCategory: 'giant',
			averageWeightKg: { male: [60, 90], female: [50, 75] },
			averageHeightCm: { male: [77, 88], female: [72, 80] }
		});
		expect(getBreedReferenceProfile('toybob')).toMatchObject({
			sizeCategory: 'small',
			averageWeightKg: { male: [2, 3], female: [1.5, 2.5] }
		});
	});

	it('projects mapped origins inside the map viewport', () => {
		const mappedProfiles = breedReferenceProfiles.filter((profile) => getBreedOriginMapPosition(profile.origin));

		expect(mappedProfiles.length).toBeGreaterThan(0);

		for (const profile of mappedProfiles) {
			const position = getBreedOriginMapPosition(profile.origin);

			expect(position?.left).toBeGreaterThanOrEqual(3);
			expect(position?.left).toBeLessThanOrEqual(97);
			expect(position?.top).toBeGreaterThanOrEqual(6);
			expect(position?.top).toBeLessThanOrEqual(94);
		}
	});

	it('keeps only mixed breeds on the varied origin bucket', () => {
		const variedBreedIds = breedReferenceProfiles.filter((profile) => profile.origin.id === 'varied').map((profile) => profile.option.id).sort();

		expect(variedBreedIds).toEqual(['feline-mixed-breed', 'mixed-breed']);
	});

	it('projects origins with the Equal Earth map coordinates', () => {
		const brazil = getBreedOriginMapPosition(getBreedReferenceProfile('brazilian-terrier')?.origin ?? { id: 'missing', latitude: null, longitude: null });
		const england = getBreedOriginMapPosition(getBreedReferenceProfile('beagle')?.origin ?? { id: 'missing', latitude: null, longitude: null });

		expect(brazil?.left).toBeCloseTo(35.79, 1);
		expect(brazil?.top).toBeCloseTo(60.86, 1);
		expect(england?.left).toBeCloseTo(49.66, 1);
		expect(england?.top).toBeCloseTo(12.85, 1);
	});
});