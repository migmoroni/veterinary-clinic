import { describe, expect, it } from 'vitest';
import type { ClinicAnalyticsOwnerPetSnapshot, ClinicAnalyticsOwnerStudyItem, ClinicAnalyticsPetStudyItem, ClinicAnalyticsStudyTarget } from '@vet/types/clinic-analytics.js';
import { buildClinicAnalyticsStudyViewModel } from '../clinic-study-analytics.view-model.js';
import type { ClinicAnalyticsStudyFilters } from '../clinic-study-analytics.types.js';

function emptyFilters(input: Partial<ClinicAnalyticsStudyFilters> = {}): ClinicAnalyticsStudyFilters {
	return {
		species: '',
		breed: '',
		sex: '',
		age: '',
		vaccineStatus: '',
		vaccineNormalizedName: '',
		antiparasiticStatus: '',
		antiparasiticNormalizedName: '',
		city: '',
		ownerPetCount: '',
		...input
	};
}

function pet(input: Partial<ClinicAnalyticsPetStudyItem> & Pick<ClinicAnalyticsPetStudyItem, 'id' | 'name' | 'species' | 'breed' | 'sex' | 'age' | 'vaccineStatus' | 'antiparasiticStatus'>): ClinicAnalyticsPetStudyItem {
	return {
		avatarBytes: null,
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

function ownerPet(source: ClinicAnalyticsPetStudyItem): ClinicAnalyticsOwnerPetSnapshot {
	return {
		id: source.id,
		name: source.name,
		avatarBytes: null,
		species: source.species,
		breed: source.breed,
		sex: source.sex,
		age: source.age,
		vaccineStatus: source.vaccineStatus,
		antiparasiticStatus: source.antiparasiticStatus,
		vaccineNormalizedNames: source.vaccineNormalizedNames,
		vaccineNames: source.vaccineNames,
		vaccines: source.vaccines,
		antiparasiticNormalizedNames: source.antiparasiticNormalizedNames,
		antiparasiticNames: source.antiparasiticNames,
		antiparasitics: source.antiparasitics
	};
}

function owner(input: Partial<ClinicAnalyticsOwnerStudyItem> & Pick<ClinicAnalyticsOwnerStudyItem, 'id' | 'name' | 'cityKey' | 'petCount' | 'pets'>): ClinicAnalyticsOwnerStudyItem {
	return {
		cityLabel: input.cityKey.toUpperCase(),
		locationKey: input.cityKey,
		locationLabel: input.cityKey.toUpperCase(),
		petNames: input.pets.map((item) => item.name),
		...input
	};
}

const luna = pet({
	id: 'p1',
	name: 'Luna',
	species: 'canine',
	breed: 'mixed-breed',
	sex: 'F',
	age: 'year:2',
	vaccineStatus: 'overdue',
	antiparasiticStatus: 'current',
	vaccineNormalizedNames: ['v10', 'raiva'],
	vaccineNames: ['V10', 'Raiva'],
	vaccines: [
		{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -10, status: 'overdue' },
		{ normalizedName: 'raiva', name: 'Raiva', dose: '1', appliedAt: '2026-01-01', dueAt: '2027-01-01', daysUntilDue: 200, status: 'current' }
	],
	antiparasiticNormalizedNames: ['nexgard', 'simparic'],
	antiparasiticNames: ['NexGard', 'Simparic'],
	antiparasitics: [
		{ normalizedName: 'nexgard', name: 'NexGard', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-03-01', daysUntilDue: 10, status: 'current' },
		{ normalizedName: 'simparic', name: 'Simparic', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -2, status: 'expired' }
	]
});
const mia = pet({
	id: 'p2',
	name: 'Mia',
	species: 'feline',
	breed: 'feline-mixed-breed',
	sex: 'F',
	age: 'months6To12',
	vaccineStatus: 'current',
	antiparasiticStatus: 'expired'
});
const theo = pet({
	id: 'p3',
	name: 'Theo',
	species: 'canine',
	breed: 'mixed-breed',
	sex: 'M',
	age: 'year:4',
	vaccineStatus: 'current',
	antiparasiticStatus: 'current'
});

const maria = owner({ id: 'o1', name: 'Maria', cityKey: 'bh', petCount: 2, pets: [ownerPet(luna), ownerPet(mia)] });
const ana = owner({ id: 'o2', name: 'Ana', cityKey: 'sp', petCount: 1, pets: [ownerPet(theo)] });

luna.owners = [{ id: 'o1', name: 'Maria', cityKey: 'bh', cityLabel: 'Belo Horizonte', locationKey: 'bh', locationLabel: 'Belo Horizonte' }];
luna.ownerCityKeys = ['bh'];
mia.owners = [{ id: 'o1', name: 'Maria', cityKey: 'bh', cityLabel: 'Belo Horizonte', locationKey: 'bh', locationLabel: 'Belo Horizonte' }];
mia.ownerCityKeys = ['bh'];
theo.owners = [{ id: 'o2', name: 'Ana', cityKey: 'sp', cityLabel: 'Sao Paulo', locationKey: 'sp', locationLabel: 'Sao Paulo' }];
theo.ownerCityKeys = ['sp'];

const pets = [luna, mia, theo];
const owners = [maria, ana];

function build(input: Partial<Parameters<typeof buildClinicAnalyticsStudyViewModel>[0]> & { target: ClinicAnalyticsStudyTarget }) {
	return buildClinicAnalyticsStudyViewModel({
		primaryDimension: 'petBreed',
		secondaryDimension: 'petVaccineStatus',
		selectedBucket: null,
		pets,
		owners,
		filters: emptyFilters(),
		bucketLimit: 16,
		listLimit: 40,
		...input
	});
}

describe('clinic study analytics view model', () => {
	it('builds target pets with buckets and limited lists', () => {
		const view = build({ target: 'pets', bucketLimit: 1, listLimit: 2 });

		expect(view.buckets).toContainEqual({ primaryKey: 'mixed-breed', secondaryKey: 'overdue', count: 1, percent: 33.3 });
		expect(view.limitedBuckets).toHaveLength(1);
		expect(view.limitedListedPets).toHaveLength(2);
	});

	it('builds target owners and active factors', () => {
		const view = build({ target: 'owners', primaryDimension: 'ownerCity', secondaryDimension: 'ownerPetCount', filters: emptyFilters({ city: 'bh' }) });

		expect(view.listedOwners.map((item) => item.id)).toEqual(['o1']);
		expect(view.activeFactors).toEqual([{ factor: 'city', valueKey: 'bh', count: 1 }]);
	});

	it('builds target vaccines using the current vaccine row', () => {
		const view = build({ target: 'vaccines', primaryDimension: 'vaccine', secondaryDimension: 'vaccineStatus' });

		expect(view.listedVaccines.map((item) => item.normalizedName)).toEqual(['v10', 'raiva']);
		expect(view.buckets.map((bucket) => [bucket.primaryKey, bucket.secondaryKey, bucket.count])).toEqual([
			['raiva', 'current', 1],
			['v10', 'overdue', 1]
		]);
	});

	it('builds target antiparasitics using the current antiparasitic row', () => {
		const view = build({ target: 'antiparasitics', primaryDimension: 'antiparasitic', secondaryDimension: 'antiparasiticStatus' });

		expect(view.listedAntiparasitics.map((item) => item.normalizedName)).toEqual(['nexgard', 'simparic']);
		expect(view.buckets.map((bucket) => [bucket.primaryKey, bucket.secondaryKey, bucket.count])).toEqual([
			['nexgard', 'current', 1],
			['simparic', 'expired', 1]
		]);
	});

	it('normalizes invalid dimensions and invalidates missing selections', () => {
		const view = build({
			target: 'pets',
			primaryDimension: 'vaccineStatus',
			secondaryDimension: 'ownerPetVaccineStatus',
			selectedBucket: { primaryDimension: 'petBreed', secondaryDimension: 'petVaccineStatus', primaryKey: 'missing', secondaryKey: 'current', count: 1 }
		});

		expect(view.primaryDimension).toBe('petBreed');
		expect(view.secondaryDimension).toBe('petVaccineStatus');
		expect(view.selectedBucket).toBeNull();
	});

	it('mounts filter options with counts and applies a valid cross selection', () => {
		const view = build({
			target: 'pets',
			selectedBucket: { primaryDimension: 'petBreed', secondaryDimension: 'petVaccineStatus', primaryKey: 'mixed-breed', secondaryKey: 'overdue', count: 1 },
			filters: emptyFilters({ species: 'canine' })
		});

		expect(view.filterOptions.species.find((bucket) => bucket.key === 'canine')?.count).toBe(2);
		expect(view.filterOptions.breeds).toEqual([{ key: 'mixed-breed', count: 2 }]);
		expect(view.filterOptions.vaccines.map((bucket) => bucket.key)).toEqual(['raiva', 'v10']);
		expect(view.filterOptions.cities.find((bucket) => bucket.key === 'bh')?.label).toBe('BH');
		expect(view.selectedBucket?.primaryKey).toBe('mixed-breed');
		expect(view.listedPets.map((item) => item.id)).toEqual(['p1']);
	});
});
