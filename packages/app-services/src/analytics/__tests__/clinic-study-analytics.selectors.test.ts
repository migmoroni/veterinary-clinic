import { describe, expect, it } from 'vitest';
import type { ClinicAnalyticsOwnerPetSnapshot, ClinicAnalyticsOwnerStudyItem, ClinicAnalyticsPetStudyItem, ClinicAnalyticsStudyTarget } from '@vet/types/clinic-analytics.js';
import {
	buildClinicAnalyticsStudyBuckets,
	countClinicAnalyticsStudyTargetForFilter,
	filterClinicAnalyticsStudyPets,
	filterClinicAnalyticsStudyTargetByBucket,
	hasClinicAnalyticsStudyFilters,
	listClinicAnalyticsStudyAntiparasitics,
	listClinicAnalyticsStudyVaccines,
	resolveClinicAnalyticsStudyTarget,
	type ClinicAnalyticsStudyBucketSelection,
	type ClinicAnalyticsStudyFilters,
	type ClinicAnalyticsStudyTreatmentSummary
} from '../clinic-study-analytics.selectors.js';

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
	vaccineNormalizedNames: ['v10'],
	vaccineNames: ['V10'],
	vaccines: [{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -10, status: 'overdue' }],
	antiparasiticNormalizedNames: ['nexgard'],
	antiparasiticNames: ['NexGard'],
	antiparasitics: [{ normalizedName: 'nexgard', name: 'NexGard', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-03-01', daysUntilDue: 10, status: 'current' }]
});
const mia = pet({
	id: 'p2',
	name: 'Mia',
	species: 'feline',
	breed: 'feline-mixed-breed',
	sex: 'F',
	age: 'months6To12',
	vaccineStatus: 'current',
	antiparasiticStatus: 'expired',
	vaccineNormalizedNames: ['raiva'],
	vaccineNames: ['Raiva'],
	vaccines: [{ normalizedName: 'raiva', name: 'Raiva', dose: '1', appliedAt: '2026-01-01', dueAt: '2027-01-01', daysUntilDue: 200, status: 'current' }],
	antiparasiticNormalizedNames: [],
	antiparasiticNames: [],
	antiparasitics: []
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
luna.ownerCityLabels = ['Belo Horizonte'];
mia.owners = [{ id: 'o1', name: 'Maria', cityKey: 'bh', cityLabel: 'Belo Horizonte', locationKey: 'bh', locationLabel: 'Belo Horizonte' }];
mia.ownerCityKeys = ['bh'];
mia.ownerCityLabels = ['Belo Horizonte'];
theo.owners = [{ id: 'o2', name: 'Ana', cityKey: 'sp', cityLabel: 'Sao Paulo', locationKey: 'sp', locationLabel: 'Sao Paulo' }];
theo.ownerCityKeys = ['sp'];
theo.ownerCityLabels = ['Sao Paulo'];

const pets = [luna, mia, theo];
const owners = [maria, ana];
const vaccines = listClinicAnalyticsStudyVaccines(pets);
const antiparasitics = listClinicAnalyticsStudyAntiparasitics(pets);

describe('clinic study analytics selectors', () => {
	it('lists treatment summaries with stable ids and parent pets', () => {
		expect(vaccines.map((vaccine) => vaccine.id)).toEqual(['p1:v10', 'p2:raiva']);
		expect(antiparasitics).toHaveLength(1);
		expect(antiparasitics[0].pet).toBe(luna);
	});

	it('filters pets by combined pet, treatment and owner filters', () => {
		const filters = emptyFilters({ species: 'canine', vaccineNormalizedName: 'v10', city: 'bh', ownerPetCount: 'two' });
		expect(hasClinicAnalyticsStudyFilters(filters)).toBe(true);
		expect(filterClinicAnalyticsStudyPets(pets, filters, owners).map((item) => item.id)).toEqual(['p1']);
	});

	it('resolves the selected analytical target from the same filtered source', () => {
		const resolved = resolveClinicAnalyticsStudyTarget({
			target: 'vaccines',
			pets,
			owners,
			vaccines,
			antiparasitics,
			filters: emptyFilters({ vaccineStatus: 'overdue' })
		});

		expect(resolved.vaccines.map((vaccine) => vaccine.normalizedName)).toEqual(['v10']);
		expect(resolved.pets.map((item) => item.id)).toEqual(['p1']);
		expect(resolved.owners.map((item) => item.id)).toEqual(['o1']);
	});

	it('builds cross buckets with semantic keys instead of translated labels', () => {
		const buckets = buildClinicAnalyticsStudyBuckets({
			target: 'pets',
			primaryDimension: 'petSpecies',
			secondaryDimension: 'petVaccineStatus',
			pets,
			owners,
			vaccines,
			antiparasitics
		});

		expect(buckets).toEqual([
			{ primaryKey: 'canine', secondaryKey: 'current', count: 1 },
			{ primaryKey: 'canine', secondaryKey: 'overdue', count: 1 },
			{ primaryKey: 'feline', secondaryKey: 'current', count: 1 }
		]);
	});

	it('builds treatment target buckets from the current treatment row', () => {
		const nina = pet({
			id: 'p4',
			name: 'Nina',
			species: 'canine',
			breed: 'mixed-breed',
			sex: 'F',
			age: 'year:3',
			vaccineStatus: 'overdue',
			antiparasiticStatus: 'overdue',
			vaccineNormalizedNames: ['v10', 'raiva'],
			vaccineNames: ['V10', 'Raiva'],
			vaccines: [
				{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -10, status: 'overdue' },
				{ normalizedName: 'raiva', name: 'Raiva', dose: '1', appliedAt: '2026-02-01', dueAt: '2027-02-01', daysUntilDue: 200, status: 'current' }
			],
			antiparasiticNormalizedNames: ['nexgard', 'simparic'],
			antiparasiticNames: ['NexGard', 'Simparic'],
			antiparasitics: [
				{ normalizedName: 'nexgard', name: 'NexGard', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-03-01', daysUntilDue: 10, status: 'current' },
				{ normalizedName: 'simparic', name: 'Simparic', dose: '1', appliedAt: '2025-12-01', dueAt: '2026-01-01', daysUntilDue: -30, status: 'overdue' }
			]
		});
		const localPets = [nina];
		const localVaccines = listClinicAnalyticsStudyVaccines(localPets);
		const localAntiparasitics = listClinicAnalyticsStudyAntiparasitics(localPets);

		expect(
			buildClinicAnalyticsStudyBuckets({
				target: 'vaccines',
				primaryDimension: 'vaccineStatus',
				secondaryDimension: 'vaccine',
				pets: localPets,
				owners: [],
				vaccines: localVaccines,
				antiparasitics: localAntiparasitics
			})
		).toEqual([
			{ primaryKey: 'current', secondaryKey: 'raiva', count: 1 },
			{ primaryKey: 'overdue', secondaryKey: 'v10', count: 1 }
		]);
		expect(
			buildClinicAnalyticsStudyBuckets({
				target: 'antiparasitics',
				primaryDimension: 'antiparasiticStatus',
				secondaryDimension: 'antiparasitic',
				pets: localPets,
				owners: [],
				vaccines: localVaccines,
				antiparasitics: localAntiparasitics
			})
		).toEqual([
			{ primaryKey: 'current', secondaryKey: 'nexgard', count: 1 },
			{ primaryKey: 'overdue', secondaryKey: 'simparic', count: 1 }
		]);
	});

	it('filters resolved target lists by a selected bucket', () => {
		const selection: ClinicAnalyticsStudyBucketSelection = {
			primaryDimension: 'petSpecies',
			secondaryDimension: 'petVaccineStatus',
			primaryKey: 'canine',
			secondaryKey: 'overdue',
			count: 1
		};

		const listed = filterClinicAnalyticsStudyTargetByBucket({ selection, pets, owners, vaccines, antiparasitics });
		expect(listed.pets.map((item) => item.id)).toEqual(['p1']);
		expect(listed.vaccines.map((item) => item.normalizedName)).toEqual(['v10']);
	});

	it('counts active filter factors against the requested target', () => {
		const filters = emptyFilters({ species: 'canine' });
		expect(
			countClinicAnalyticsStudyTargetForFilter({
				target: 'pets' satisfies ClinicAnalyticsStudyTarget,
				pets,
				owners,
				vaccines,
				antiparasitics: antiparasitics as ClinicAnalyticsStudyTreatmentSummary<string>[],
				filters,
				factor: 'species'
			})
		).toBe(2);
	});
});
