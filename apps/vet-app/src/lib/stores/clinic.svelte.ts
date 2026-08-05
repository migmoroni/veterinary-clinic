import type { ClinicDashboard } from '$lib/services/clinic.service.js';
import type { SearchResult } from '@vet/types/domain/search/search.js';
import {
	createNewClinicDatabase,
	hasClinicDatabase,
	importClinicDatabase,
	initializeClinic,
	loadDashboard,
	searchEverywhere
} from '$lib/services/clinic.service.js';

class ClinicStore {
	loading = $state(true);
	error = $state<string | null>(null);
	needsSetup = $state(false);
	dashboard = $state<ClinicDashboard | null>(null);
	query = $state('');
	results = $state<SearchResult[]>([]);

	async init() {
		this.loading = true;
		this.error = null;

		try {
			if (!(await hasClinicDatabase())) {
				this.needsSetup = true;
				this.dashboard = null;
				return;
			}

			this.needsSetup = false;
			await initializeClinic();
			this.dashboard = await loadDashboard();
		} catch (error) {
			if (error instanceof Error && error.message === 'database_missing') {
				this.needsSetup = true;
				this.dashboard = null;
				return;
			}

			this.error = error instanceof Error ? error.message : String(error);
		} finally {
			this.loading = false;
		}
	}

	async startNewDatabase(): Promise<boolean> {
		this.loading = true;
		this.error = null;

		try {
			await createNewClinicDatabase();
			this.needsSetup = false;
			this.dashboard = await loadDashboard();
			return true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
			return false;
		} finally {
			this.loading = false;
		}
	}

	async importInitialDatabase(title: string): Promise<boolean> {
		this.loading = true;
		this.error = null;

		try {
			const imported = await importClinicDatabase(title);
			if (!imported) return false;

			this.needsSetup = false;
			this.dashboard = await loadDashboard();
			return true;
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
			return false;
		} finally {
			this.loading = false;
		}
	}

	async refresh() {
		await this.init();
	}

	async search() {
		try {
			this.results = await searchEverywhere(this.query);
		} catch (error) {
			this.error = error instanceof Error ? error.message : String(error);
		}
	}

}

export const clinic = new ClinicStore();
