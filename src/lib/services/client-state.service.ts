export const RECENT_SEARCH_STORAGE_KEY = 'veterinary-clinic:recent-search-results';
export const LEGACY_OVERVIEW_LAST_RECORD_STORAGE_KEY = 'veterinary-clinic:last-opened-record';

const OVERVIEW_RECORD_RESET_ONCE_KEY = 'veterinary-clinic:overview-reset-last-record-once';

export function clearClientStateAfterDatabaseImport(): void {
	if (typeof localStorage === 'undefined') return;

	localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
	localStorage.removeItem(LEGACY_OVERVIEW_LAST_RECORD_STORAGE_KEY);
	localStorage.setItem(OVERVIEW_RECORD_RESET_ONCE_KEY, '1');
}

export function shouldResetOverviewLastRecordOnce(): boolean {
	if (typeof localStorage === 'undefined') return false;

	const shouldReset = localStorage.getItem(OVERVIEW_RECORD_RESET_ONCE_KEY) === '1';
	if (shouldReset) localStorage.removeItem(OVERVIEW_RECORD_RESET_ONCE_KEY);
	return shouldReset;
}