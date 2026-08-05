import { getDashboardAnalytics } from '@vet/modules/medical_records/repositories/dashboard-analytics.repository.js';

export async function loadDashboardAnalytics() {
	return getDashboardAnalytics();
}