import { getDashboardAnalytics } from '$lib/persistence/repositories/dashboard-analytics.repository.js';

export async function loadDashboardAnalytics() {
	return getDashboardAnalytics();
}