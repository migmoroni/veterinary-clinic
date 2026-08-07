import { describe, expect, it } from 'vitest';
import type { ClinicAnalytics, ClinicAnalyticsOwnerPetSnapshot, ClinicAnalyticsOwnerStudyItem } from '@vet/types/clinic-analytics.js';
import {
	clinicAnalyticsOwnerAntiparasiticStatus,
	clinicAnalyticsOwnerPetCountBand,
	clinicAnalyticsOwnerVaccineStatus,
	filterClinicAnalyticsOwnersByBucket,
	listClinicAnalyticsOwnerPetAgeKeys,
	listClinicAnalyticsOwnerPetSpeciesKeys,
	selectClinicOwnerAnalyticsBuckets,
	sortClinicAnalyticsOwners
} from '../clinic-owner-analytics.selectors.js';

function ownerPet(input: Partial<ClinicAnalyticsOwnerPetSnapshot> & Pick<ClinicAnalyticsOwnerPetSnapshot, 'id' | 'name' | 'species' | 'age' | 'vaccineStatus' | 'antiparasiticStatus'>): ClinicAnalyticsOwnerPetSnapshot {
	return {
		avatarBytes: null,
		breed: 'mixed-breed',
		sex: 'unknown',
		vaccineNormalizedNames: [],
		vaccineNames: [],
		vaccines: [],
		antiparasiticNormalizedNames: [],
		antiparasiticNames: [],
		antiparasitics: [],
		...input
	};
}

function owner(input: Partial<ClinicAnalyticsOwnerStudyItem> & Pick<ClinicAnalyticsOwnerStudyItem, 'id' | 'name' | 'petCount' | 'pets'>): ClinicAnalyticsOwnerStudyItem {
	return {
		cityKey: 'unknown',
		cityLabel: null,
		locationKey: 'unknown',
		locationLabel: null,
		petNames: input.pets.map((pet) => pet.name),
		...input
	};
}

const owners = [
	owner({
		id: 'o1',
		name: 'Maria',
		cityKey: 'bh',
		cityLabel: 'Belo Horizonte',
		locationKey: 'mg:bh',
		locationLabel: 'Belo Horizonte, MG',
		petCount: 2,
		pets: [
			ownerPet({ id: 'p1', name: 'Luna', species: 'canine', age: 'year:2', vaccineStatus: 'current', antiparasiticStatus: 'expired' }),
			ownerPet({ id: 'p2', name: 'Mia', species: 'feline', age: 'months6To12', vaccineStatus: 'overdue', antiparasiticStatus: 'current' })
		]
	}),
	owner({
		id: 'o2',
		name: 'Ana',
		petCount: 0,
		pets: []
	})
];

const analytics = {
	pets: {
		total: 2,
		bySpecies: [],
		byBreed: [],
		bySex: [],
		byAge: [
			{ key: 'months6To12', count: 1 },
			{ key: 'year:2', count: 1 },
			{ key: 'year:8', count: 0 }
		],
		byVaccineStatus: [],
		byAntiparasiticStatus: []
	},
	owners: {
		total: 2,
		averagePetsPerOwner: 1,
		byLocation: [{ key: 'mg:bh', label: 'Belo Horizonte, MG', count: 1 }],
		byPetCount: [
			{ key: 'none', count: 1 },
			{ key: 'two', count: 1 }
		],
		byPetVaccineStatus: [{ key: 'overdue', count: 1 }],
		byPetAntiparasiticStatus: [{ key: 'expired', count: 1 }]
	},
	study: { pets: [], owners: [], vaccines: [], antiparasitics: [], ownerCities: [], ownerLocations: [] }
} satisfies ClinicAnalytics;

describe('clinic owner analytics selectors', () => {
	it('derives owner pet count bands and worst statuses', () => {
		expect(clinicAnalyticsOwnerPetCountBand(0)).toBe('none');
		expect(clinicAnalyticsOwnerPetCountBand(3)).toBe('threePlus');
		expect(clinicAnalyticsOwnerVaccineStatus(owners[0])).toBe('overdue');
		expect(clinicAnalyticsOwnerAntiparasiticStatus(owners[0])).toBe('expired');
	});

	it('lists unique pet species and age keys with unknown fallbacks', () => {
		expect(listClinicAnalyticsOwnerPetSpeciesKeys(owners[0])).toEqual(['canine', 'feline']);
		expect(listClinicAnalyticsOwnerPetAgeKeys(owners[1])).toEqual(['unknown']);
	});

	it('builds owner buckets from read model and study snapshots', () => {
		expect(selectClinicOwnerAnalyticsBuckets({ analytics, owners, dimension: 'location' })[0]).toEqual({ key: 'mg:bh', label: 'Belo Horizonte, MG', count: 1 });
		expect(selectClinicOwnerAnalyticsBuckets({ analytics, owners, dimension: 'petAge' }).map((bucket) => bucket.key)).toEqual(['months6To12', 'unknown', 'year:2', 'year:8']);
	});

	it('filters owners by semantic buckets and sorts by pet count', () => {
		expect(filterClinicAnalyticsOwnersByBucket(owners, 'petSpecies', 'feline').map((item) => item.id)).toEqual(['o1']);
		expect(sortClinicAnalyticsOwners(owners, 'petCount', 'pt-BR').map((item) => item.id)).toEqual(['o1', 'o2']);
	});
});
