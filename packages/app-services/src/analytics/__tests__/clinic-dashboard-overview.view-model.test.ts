import { describe, expect, it } from 'vitest';
import type { ClinicAnalyticsOverview } from '../clinic-analytics.service.js';
import type { ClinicDashboardOverviewLabels } from '../clinic-dashboard-overview.view-model.js';
import { buildClinicDashboardOverviewViewModel } from '../clinic-dashboard-overview.view-model.js';

const labels: ClinicDashboardOverviewLabels = {
	pets: 'Pets',
	owners: 'Owners',
	records: 'Records',
	vaccines: 'Vaccines',
	antiparasitics: 'Antiparasitics',
	tracked: 'Tracked',
	notInformed: 'Not informed',
	ageRanges: {
		underOne: 'Under 1 year',
		oneToThree: '1 to 3 years',
		fourToSeven: '4 to 7 years',
		eightPlus: '8 years or more',
		unknown: 'Unknown age'
	},
	species: (key) => key,
	breed: (key) => key,
	ownerLocation: (_key, label) => label ?? 'Not informed',
	ownerPetCount: (key) => key
};

const overview = {
	counts: { owners: 2, pets: 3, records: 5 },
	vaccines: {
		totalTracked: 4,
		summary: { current: 1, dueSoon: 1, dueVerySoon: 0, expired: 1, overdue: 1 },
		duePeriodSummary: { dueAfter30Days: 1, dueWithin30Days: 1, expiredWithin30Days: 1, expiredAfter30Days: 1 },
		history: [
			{ key: '2026-06', label: '2026-06', count: 1 },
			{ key: '2026-07', label: '2026-07', count: 2 }
		]
	},
	antiparasitics: {
		totalTracked: 2,
		summary: { current: 0, dueSoon: 0, dueVerySoon: 1, expired: 0, overdue: 1 },
		duePeriodSummary: { dueAfter30Days: 0, dueWithin30Days: 1, expiredWithin30Days: 0, expiredAfter30Days: 1 },
		history: [{ key: '2026-07', label: '2026-07', count: 2 }]
	},
	analytics: {
		pets: {
			total: 3,
			bySpecies: [
				{ key: 'canine', count: 2 },
				{ key: 'feline', count: 1 }
			],
			byBreed: [
				{ key: 'mixed-breed', count: 2 },
				{ key: 'spitz_alemao', count: 1 }
			],
			bySex: [],
			byAge: [
				{ key: 'months6To12', count: 1 },
				{ key: 'year:2', count: 1 },
				{ key: 'year:8', count: 1 }
			],
			byVaccineStatus: [],
			byAntiparasiticStatus: []
		},
		owners: {
			total: 2,
			averagePetsPerOwner: 1.5,
			byLocation: [
				{ key: 'belo horizonte / mg / brasil', label: 'Belo Horizonte / MG / Brasil', count: 1 },
				{ key: 'unknown', label: null, count: 1 }
			],
			byPetCount: [
				{ key: 'one', count: 1 },
				{ key: 'two', count: 1 }
			],
			byPetVaccineStatus: [],
			byPetAntiparasiticStatus: []
		},
		study: {
			pets: [
				{
					id: 'p1',
					name: 'Luna',
					avatarBytes: null,
					species: 'canine',
					breed: 'mixed-breed',
					sex: 'F',
					age: 'year:2',
					vaccineStatus: 'overdue',
					antiparasiticStatus: 'current',
					vaccineNormalizedNames: ['v10', 'raiva'],
					vaccineNames: ['V10', 'Raiva'],
					vaccines: [
						{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-09-21', daysUntilDue: 45, status: 'current' },
						{ normalizedName: 'raiva', name: 'Raiva', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-08-27', daysUntilDue: 20, status: 'dueSoon' }
					],
					antiparasiticNormalizedNames: ['nexgard'],
					antiparasiticNames: ['NexGard'],
					antiparasitics: [{ normalizedName: 'nexgard', name: 'NexGard', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-08-07', daysUntilDue: 0, status: 'dueVerySoon' }],
					owners: [],
					ownerCityKeys: [],
					ownerCityLabels: [],
					ownerLocationKeys: [],
					ownerLocationLabels: []
				},
				{
					id: 'p2',
					name: 'Mia',
					avatarBytes: null,
					species: 'feline',
					breed: 'mixed-breed',
					sex: 'F',
					age: 'months6To12',
					vaccineStatus: 'expired',
					antiparasiticStatus: 'overdue',
					vaccineNormalizedNames: ['v4'],
					vaccineNames: ['V4'],
					vaccines: [{ normalizedName: 'v4', name: 'V4', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-07-28', daysUntilDue: -10, status: 'expired' }],
					antiparasiticNormalizedNames: ['simparic'],
					antiparasiticNames: ['Simparic'],
					antiparasitics: [{ normalizedName: 'simparic', name: 'Simparic', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-07-06', daysUntilDue: -32, status: 'overdue' }],
					owners: [],
					ownerCityKeys: [],
					ownerCityLabels: [],
					ownerLocationKeys: [],
					ownerLocationLabels: []
				},
				{
					id: 'p3',
					name: 'Theo',
					avatarBytes: null,
					species: 'canine',
					breed: 'spitz_alemao',
					sex: 'M',
					age: 'year:8',
					vaccineStatus: 'overdue',
					antiparasiticStatus: 'untracked',
					vaccineNormalizedNames: ['v10'],
					vaccineNames: ['V10'],
					vaccines: [{ normalizedName: 'v10', name: 'V10', dose: '1', appliedAt: '2026-01-01', dueAt: '2026-06-23', daysUntilDue: -45, status: 'overdue' }],
					antiparasiticNormalizedNames: [],
					antiparasiticNames: [],
					antiparasitics: [],
					owners: [],
					ownerCityKeys: [],
					ownerCityLabels: [],
					ownerLocationKeys: [],
					ownerLocationLabels: []
				}
			],
			owners: [],
			vaccines: [],
			antiparasitics: [],
			ownerCities: [],
			ownerLocations: []
		}
	}
} satisfies ClinicAnalyticsOverview;

describe('clinic dashboard overview view model', () => {
	it('returns dashboard KPIs, attention counts, population buckets and trends', () => {
		const view = buildClinicDashboardOverviewViewModel({ overview, labels, chartLimit: 1 });

		expect(view.kpis.map((item) => [item.key, item.value])).toEqual([
			['pets', 3],
			['owners', 2],
			['records', 5],
			['vaccines', 4],
			['antiparasitics', 2]
		]);
		expect(view.attention.map((item) => [item.key, item.value, item.percent])).toEqual([
			['vaccines', 3, 75],
			['antiparasitics', 2, 100]
		]);
		expect(view.breeds.data).toEqual([{ key: 'mixed-breed', label: 'mixed-breed', value: 2, percent: 66.7, tone: 'info' }]);
		expect(view.ageRanges.data.map((item) => [item.key, item.value])).toEqual([
			['underOne', 1],
			['oneToThree', 1],
			['fourToSeven', 0],
			['eightPlus', 1],
			['unknown', 0]
		]);
		expect(view.ownerLocations.data).toEqual([{ key: 'belo horizonte / mg / brasil', label: 'Belo Horizonte / MG / Brasil', value: 1, percent: 50, tone: 'info' }]);
		expect(view.vaccineHistory.total).toBe(3);
		expect(view.antiparasiticHistory.data).toEqual([{ key: '2026-07', label: '2026-07', value: 2 }]);
	});

	it('returns empty models when overview is unavailable', () => {
		const view = buildClinicDashboardOverviewViewModel({ overview: null, labels });

		expect(view.kpis.every((item) => item.value === 0)).toBe(true);
		expect(view.species.data).toEqual([]);
		expect(view.vaccineHistory.data).toEqual([]);
	});
});
