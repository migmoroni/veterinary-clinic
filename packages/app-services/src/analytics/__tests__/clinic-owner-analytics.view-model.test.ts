import { describe, expect, it } from 'vitest';
import type { ClinicAnalytics, ClinicAnalyticsOwnerDimension, ClinicAnalyticsOwnerPetSnapshot, ClinicAnalyticsOwnerStudyItem } from '@vet/types/clinic-analytics.js';
import { buildClinicOwnerAnalyticsSummaryViewModels, buildClinicOwnerAnalyticsViewModel } from '../clinic-owner-analytics.view-model.js';
import type { ClinicAnalyticsOwnerBucket } from '../clinic-owner-analytics.selectors.js';

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
	owner({ id: 'o2', name: 'Ana', petCount: 0, pets: [] })
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
		byPetAntiparasiticStatus: []
	},
	study: { pets: [], owners: [], vaccines: [], antiparasitics: [], ownerCities: [], ownerLocations: [] }
} satisfies ClinicAnalytics;

function build(input: Partial<Parameters<typeof buildClinicOwnerAnalyticsViewModel>[0]> = {}) {
	return buildClinicOwnerAnalyticsViewModel({
		analytics,
		owners,
		activeDimension: 'location',
		selectedBucketKey: '',
		bucketSortField: 'count',
		bucketSortDirection: 'desc',
		listSortOrder: 'name',
		bucketLimit: 16,
		labelForBucket: (_dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => bucket.label ?? bucket.key,
		locale: 'pt-BR',
		...input
	});
}

describe('clinic owner analytics view model', () => {
	it('filters owners by a selected bucket', () => {
		const view = build({ selectedBucketKey: 'mg:bh' });

		expect(view.selectedBucket?.label).toBe('Belo Horizonte, MG');
		expect(view.listedOwners.map((item) => item.id)).toEqual(['o1']);
		expect(view.selectedPercent).toBe(50);
	});

	it('keeps all owners when a selected bucket is invalid', () => {
		const view = build({ selectedBucketKey: 'missing' });

		expect(view.selectedBucket).toBeNull();
		expect(view.listedOwners.map((item) => item.id)).toEqual(['o2', 'o1']);
	});

	it('returns top bucket and selectedPercent', () => {
		const view = build({ activeDimension: 'petVaccineStatus', selectedBucketKey: 'overdue' });

		expect(view.topBucket).not.toBeNull();
		expect(view.selectedBucket?.key).toBe('overdue');
		expect(view.selectedCount).toBe(1);
	});

	it('preserves persisted labels and completed pet age buckets', () => {
		const locationView = build();
		const ageView = build({ activeDimension: 'petAge', bucketLimit: 2 });

		expect(locationView.buckets[0].label).toBe('Belo Horizonte, MG');
		expect(ageView.buckets.map((bucket) => bucket.key)).toContain('year:8');
		expect(ageView.limitedBuckets).toHaveLength(2);
	});

	it('keeps a zero-count universe bucket as a valid empty selection', () => {
		const view = build({ activeDimension: 'petAge', selectedBucketKey: 'year:8' });

		expect(view.selectedBucket).toMatchObject({ key: 'year:8', count: 0, percent: 0 });
		expect(view.listedOwners).toEqual([]);
		expect(view.selectedCount).toBe(0);
		expect(view.selectedPercent).toBe(0);
	});

	it('builds all card summaries without requiring the full listing view model', () => {
		const summaries = buildClinicOwnerAnalyticsSummaryViewModels({
			analytics,
			owners,
			bucketLimit: 1,
			labelForBucket: (_dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => bucket.label ?? bucket.key,
			locale: 'pt-BR'
		});

		expect(summaries.location.topBucket).toMatchObject({ key: 'mg:bh', label: 'Belo Horizonte, MG', count: 1, percent: 50 });
		expect(summaries.petAge.buckets.map((bucket) => bucket.key)).toContain('year:8');
		expect(summaries.petAge.limitedBuckets).toHaveLength(1);
		expect(summaries.petCount.totalCount).toBe(2);
	});
});
