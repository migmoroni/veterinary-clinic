import { describe, expect, it } from 'vitest';
import type { ClinicAnalyticsOwnerPetSnapshot, ClinicAnalyticsOwnerStudyItem, ClinicAnalyticsPetStudyItem } from '@vet/types/clinic-analytics.js';
import {
	clinicAnalyticsMissingKeys,
	clinicAnalyticsQueryDimensions,
	defaultClinicAnalyticsPrimaryDimension,
	defaultClinicAnalyticsSecondaryDimension,
	listClinicAnalyticsQueryRows,
	listClinicAnalyticsTargetDimensions,
	normalizeClinicAnalyticsQueryDimensions
} from '../analytics-dimensions.js';
import { queryAnalytics } from '../analytics-query.js';

function pet(input: Partial<ClinicAnalyticsPetStudyItem> & Pick<ClinicAnalyticsPetStudyItem, 'id' | 'name'>): ClinicAnalyticsPetStudyItem {
	return {
		id: input.id,
		name: input.name,
		avatarBytes: null,
		species: 'unknown',
		breed: 'unknown',
		sex: 'unknown',
		age: 'unknown',
		vaccineStatus: 'untracked',
		antiparasiticStatus: 'untracked',
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

function owner(input: Partial<ClinicAnalyticsOwnerStudyItem> & Pick<ClinicAnalyticsOwnerStudyItem, 'id' | 'name' | 'cityKey' | 'locationKey' | 'petCount' | 'pets'>): ClinicAnalyticsOwnerStudyItem {
	return {
		cityLabel: input.cityKey.toUpperCase(),
		locationLabel: input.locationKey.toUpperCase(),
		petNames: input.pets.map((item) => item.name),
		...input
	};
}

describe('analytics dimensions', () => {
	it('lists canonical rows and resolves ownerLocation for pet queries', () => {
		const luna = pet({
			id: 'p1',
			name: 'Luna',
			species: 'canine',
			breed: 'mixed-breed',
			sex: 'F',
			age: 'year:2',
			vaccineStatus: 'overdue',
			vaccineNormalizedNames: ['v10'],
			vaccines: [{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -10, status: 'overdue' }],
			owners: [{ id: 'o1', name: 'Maria', cityKey: 'bh', cityLabel: 'Belo Horizonte', locationKey: 'bh:centro', locationLabel: 'Belo Horizonte - Centro' }],
			ownerCityKeys: ['bh'],
			ownerLocationKeys: ['bh:centro']
		});
		const maria = owner({ id: 'o1', name: 'Maria', cityKey: 'bh', locationKey: 'bh:centro', petCount: 1, pets: [ownerPet(luna)] });
		const rows = listClinicAnalyticsQueryRows({ target: 'pets', pets: [luna], owners: [maria], vaccines: [], antiparasitics: [] });

		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions: clinicAnalyticsQueryDimensions,
			groupBy: ['ownerLocation'],
			measure: 'count'
		});

		expect(result.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([{ keys: ['bh:centro'], count: 1 }]);
	});

	it('keeps cadastre unknown missing and treatment untracked as a valid key', () => {
		const theo = pet({ id: 'p2', name: 'Theo' });
		const rows = listClinicAnalyticsQueryRows({ target: 'pets', pets: [theo], owners: [], vaccines: [], antiparasitics: [] });

		const result = queryAnalytics({
			target: 'pets',
			rows,
			dimensions: clinicAnalyticsQueryDimensions,
			groupBy: ['petBreed', 'vaccine'],
			measure: 'count'
		});

		expect(clinicAnalyticsMissingKeys).toEqual(['unknown']);
		expect(result.buckets.map((bucket) => bucket.keys)).toEqual([['unknown', 'untracked']]);
	});

	it('uses the current treatment item for treatment target dimensions', () => {
		const luna = pet({
			id: 'p3',
			name: 'Luna',
			species: 'canine',
			breed: 'mixed-breed',
			age: 'year:2',
			vaccineStatus: 'overdue',
			antiparasiticStatus: 'overdue',
			vaccineNormalizedNames: ['v10', 'raiva'],
			vaccines: [
				{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-02-01', daysUntilDue: -10, status: 'overdue' },
				{ normalizedName: 'raiva', name: 'Raiva', dose: '1', appliedAt: '2026-02-01', dueAt: '2027-02-01', daysUntilDue: 200, status: 'current' }
			],
			antiparasiticNormalizedNames: ['nexgard', 'simparic'],
			antiparasitics: [
				{ normalizedName: 'nexgard', name: 'NexGard', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-03-01', daysUntilDue: 10, status: 'current' },
				{ normalizedName: 'simparic', name: 'Simparic', dose: '1', appliedAt: '2025-12-01', dueAt: '2026-01-01', daysUntilDue: -30, status: 'overdue' }
			]
		});
		const vaccines = luna.vaccines.map((vaccine) => ({ ...vaccine, id: `${luna.id}:${vaccine.normalizedName}`, pet: luna }));
		const antiparasitics = luna.antiparasitics.map((antiparasitic) => ({ ...antiparasitic, id: `${luna.id}:${antiparasitic.normalizedName}`, pet: luna }));
		const vaccineRows = listClinicAnalyticsQueryRows({ target: 'vaccines', pets: [luna], owners: [], vaccines, antiparasitics: [] });
		const antiparasiticRows = listClinicAnalyticsQueryRows({ target: 'antiparasitics', pets: [luna], owners: [], vaccines: [], antiparasitics });

		const vaccineResult = queryAnalytics({
			target: 'vaccines',
			rows: vaccineRows,
			dimensions: clinicAnalyticsQueryDimensions,
			groupBy: ['vaccineStatus', 'vaccine'],
			measure: 'count',
			sort: { by: 'analysis', direction: 'asc' }
		});
		const antiparasiticResult = queryAnalytics({
			target: 'antiparasitics',
			rows: antiparasiticRows,
			dimensions: clinicAnalyticsQueryDimensions,
			groupBy: ['antiparasiticStatus', 'antiparasitic'],
			measure: 'count',
			sort: { by: 'analysis', direction: 'asc' }
		});

		expect(vaccineResult.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['current', 'raiva'], count: 1 },
			{ keys: ['overdue', 'v10'], count: 1 }
		]);
		expect(antiparasiticResult.buckets.map((bucket) => ({ keys: bucket.keys, count: bucket.count }))).toEqual([
			{ keys: ['current', 'nexgard'], count: 1 },
			{ keys: ['overdue', 'simparic'], count: 1 }
		]);
	});

	it('lists and normalizes default dimensions by target', () => {
		expect(listClinicAnalyticsTargetDimensions('pets')).toContain('ownerCity');
		expect(defaultClinicAnalyticsPrimaryDimension('vaccines')).toBe('vaccineStatus');
		expect(defaultClinicAnalyticsSecondaryDimension('owners')).toBe('ownerPetVaccineStatus');
		expect(normalizeClinicAnalyticsQueryDimensions({ target: 'pets', primaryDimension: 'ownerLocation', secondaryDimension: 'petAge' })).toEqual({
			primaryDimension: 'petBreed',
			secondaryDimension: 'petAge'
		});
	});
});
