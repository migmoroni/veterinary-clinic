import { getDashboardAnalytics } from '../repositories/dashboard-analytics.repository.js';

export async function loadDashboardAnalytics() {
	return getDashboardAnalytics();
}