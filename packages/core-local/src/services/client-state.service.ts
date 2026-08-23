export const RECENT_SEARCH_STORAGE_KEY = 'veterinary-clinic:recent-search-results';

export function clearClientStateAfterDatabaseImport(): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
}
