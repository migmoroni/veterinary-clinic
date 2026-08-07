import { describe, expect, it } from 'vitest';
import type { ClinicAnalytics, ClinicAnalyticsPetDimension, ClinicAnalyticsPetStudyItem } from '@vet/types/clinic-analytics.js';
import { buildClinicPetAnalyticsSummaryViewModels, buildClinicPetAnalyticsViewModel } from '../clinic-pet-analytics.view-model.js';

const analytics = {
	pets: {
		total: 3,
		bySpecies: [
			{ key: 'canine', count: 2 },
			{ key: 'feline', count: 1 }
		],
		byBreed: [{ key: 'mixed-breed', count: 2 }],
		bySex: [],
		byAge: [
			{ key: 'months6To12', count: 1 },
			{ key: 'year:2', count: 1 },
			{ key: 'year:8', count: 0 }
		],
		byVaccineStatus: [
			{ key: 'overdue', count: 2 },
			{ key: 'current', count: 1 }
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

const pets = [
	pet({ id: 'p1', name: 'Bia', age: 'year:2', vaccineStatus: 'current' }),
	pet({ id: 'p2', name: 'Ana', age: 'months6To12', vaccineStatus: 'overdue' }),
	pet({ id: 'p3', name: 'Caio', age: 'year:1', vaccineStatus: 'overdue' })
];

function build(input: Partial<Parameters<typeof buildClinicPetAnalyticsViewModel>[0]> = {}) {
	return buildClinicPetAnalyticsViewModel({
		analytics,
		pets,
		activeDimension: 'vaccineStatus',
		selectedBucketKey: '',
		bucketSortField: 'count',
		bucketSortDirection: 'desc',
		listSortOrder: 'name',
		bucketLimit: 16,
		labelForKey: (_dimension: ClinicAnalyticsPetDimension, key: string) => key,
		locale: 'pt-BR',
		...input
	});
}

describe('clinic pet analytics view model', () => {
	it('filters pets by a selected bucket', () => {
		const view = build({ selectedBucketKey: 'overdue' });

		expect(view.selectedBucket?.key).toBe('overdue');
		expect(view.listedPets.map((item) => item.id)).toEqual(['p2', 'p3']);
		expect(view.selectedCount).toBe(2);
	});

	it('keeps all pets when a selected bucket is invalid', () => {
		const view = build({ selectedBucketKey: 'missing' });

		expect(view.selectedBucket).toBeNull();
		expect(view.listedPets.map((item) => item.id)).toEqual(['p2', 'p1', 'p3']);
	});

	it('returns top bucket and selectedPercent', () => {
		const view = build({ selectedBucketKey: 'current' });

		expect(view.topBucket?.key).toBe('overdue');
		expect(view.selectedPercent).toBe(33.3);
	});

	it('preserves age buckets completed by analytics and applies bucketLimit', () => {
		const view = build({ activeDimension: 'age', bucketLimit: 2 });

		expect(view.buckets.map((bucket) => bucket.key)).toContain('year:8');
		expect(view.limitedBuckets).toHaveLength(2);
	});

	it('keeps a zero-count universe bucket as a valid empty selection', () => {
		const view = build({ activeDimension: 'age', selectedBucketKey: 'year:8' });

		expect(view.selectedBucket).toMatchObject({ key: 'year:8', count: 0, percent: 0 });
		expect(view.listedPets).toEqual([]);
		expect(view.selectedCount).toBe(0);
		expect(view.selectedPercent).toBe(0);
	});

	it('builds all card summaries without requiring the full listing view model', () => {
		const summaries = buildClinicPetAnalyticsSummaryViewModels({
			analytics,
			pets,
			bucketLimit: 1,
			labelForKey: (_dimension: ClinicAnalyticsPetDimension, key: string) => key,
			locale: 'pt-BR'
		});

		expect(summaries.vaccineStatus.topBucket).toMatchObject({ key: 'overdue', count: 2, percent: 66.7 });
		expect(summaries.age.buckets.map((bucket) => bucket.key)).toContain('year:8');
		expect(summaries.age.limitedBuckets).toHaveLength(1);
		expect(summaries.species.totalCount).toBe(3);
	});
});
