import { describe, expect, it } from 'vitest';
import type { ClinicAnalytics, ClinicAnalyticsPetStudyItem } from '@vet/types/clinic-analytics.js';
import { filterClinicAnalyticsPetsByBucket, selectClinicPetAnalyticsBuckets, sortClinicAnalyticsPets, sortClinicPetAnalyticsBuckets } from '../clinic-pet-analytics.selectors.js';

const analytics = {
	pets: {
		total: 3,
		bySpecies: [
			{ key: 'feline', count: 1 },
			{ key: 'canine', count: 2 }
		],
		byBreed: [{ key: 'mixed-breed', count: 2 }],
		bySex: [],
		byAge: [
			{ key: 'year:4', count: 1 },
			{ key: 'months6To12', count: 1 },
			{ key: 'unknown', count: 1 }
		],
		byVaccineStatus: [
			{ key: 'current', count: 1 },
			{ key: 'overdue', count: 2 }
		],
		byAntiparasiticStatus: []
	},
	owners: { total: 0, averagePetsPerOwner: 0, byLocation: [], byPetCount: [], byPetVaccineStatus: [], byPetAntiparasiticStatus: [] },
	study: { pets: [], owners: [], vaccines: [], antiparasitics: [], ownerCities: [], ownerLocations: [] }
} satisfies ClinicAnalytics;

function pet(input: Partial<ClinicAnalyticsPetStudyItem> & Pick<ClinicAnalyticsPetStudyItem, 'id' | 'name' | 'age' | 'vaccineStatus'>): ClinicAnalyticsPetStudyItem {
	return {
		avatarBytes: null,
		species: 'canine',
		breed: 'mixed-breed',
		sex: 'unknown',
		antiparasiticStatus: 'current',
		vaccineNormalizedNames: [],
		vaccineNames: [],
		vaccines: [],
		antiparasiticNormalizedNames: [],
		antiparasiticNames: [],
		antiparasitics: [],
		owners: [],
		ownerCityKeys: [],
		ownerCityLabels: [],
		ownerLocationKeys: [],
		ownerLocationLabels: [],
		...input
	};
}

describe('clinic pet analytics selectors', () => {
	it('selects buckets for the requested pet dimension', () => {
		expect(selectClinicPetAnalyticsBuckets(analytics, 'species')).toBe(analytics.pets.bySpecies);
		expect(selectClinicPetAnalyticsBuckets(analytics, 'vaccineStatus')).toBe(analytics.pets.byVaccineStatus);
	});

	it('sorts age buckets semantically with unknown last', () => {
		const sorted = sortClinicPetAnalyticsBuckets({
			buckets: analytics.pets.byAge,
			dimension: 'age',
			field: 'analysis',
			direction: 'asc',
			labelForKey: (_dimension, key) => key,
			locale: 'pt-BR'
		});

		expect(sorted.map((bucket) => bucket.key)).toEqual(['months6To12', 'year:4', 'unknown']);
	});

	it('filters pets by bucket and sorts by the most urgent vaccine status', () => {
		const pets = [
			pet({ id: '1', name: 'Bia', age: 'year:2', vaccineStatus: 'current' }),
			pet({ id: '2', name: 'Ana', age: 'months6To12', vaccineStatus: 'overdue' }),
			pet({ id: '3', name: 'Caio', age: 'year:1', vaccineStatus: 'expired' })
		];

		expect(filterClinicAnalyticsPetsByBucket(pets, 'vaccineStatus', 'overdue').map((item) => item.id)).toEqual(['2']);
		expect(sortClinicAnalyticsPets(pets, 'vaccineStatus').map((item) => item.name)).toEqual(['Ana', 'Caio', 'Bia']);
	});
});
