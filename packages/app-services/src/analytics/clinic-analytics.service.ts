import type { ClinicAnalytics } from '@vet/types/clinic-analytics.js';
import type { TreatmentAnalyticsOverview, TreatmentHistoryPoint } from '@vet/types/domain/treatment/analytics.js';
import { getClinicAnalytics } from './clinic-analytics.read-model.js';
import { getClinicCounts } from './clinic-counts.read-model.js';
import { loadTreatmentAnalyticsOverview, loadTreatmentHistory } from './treatment-analytics.service.js';

export interface ClinicTreatmentAnalytics extends TreatmentAnalyticsOverview {
	history: TreatmentHistoryPoint[];
}

export interface ClinicAnalyticsOverview {
	counts: {
		owners: number;
		pets: number;
		records: number;
	};
	vaccines: ClinicTreatmentAnalytics;
	antiparasitics: ClinicTreatmentAnalytics;
	analytics: ClinicAnalytics;
}

export async function loadClinicAnalyticsOverview(): Promise<ClinicAnalyticsOverview> {
	const [counts, vaccineOverview, vaccineHistory, antiparasiticOverview, antiparasiticHistory, analytics] = await Promise.all([
		getClinicCounts(),
		loadTreatmentAnalyticsOverview('vaccine'),
		loadTreatmentHistory('vaccine', { period: 'month', normalizedName: null }),
		loadTreatmentAnalyticsOverview('antiparasitic'),
		loadTreatmentHistory('antiparasitic', { period: 'month', normalizedName: null }),
		getClinicAnalytics()
	]);

	return {
		counts,
		vaccines: { ...vaccineOverview, history: vaccineHistory },
		antiparasitics: { ...antiparasiticOverview, history: antiparasiticHistory },
		analytics
	};
}
