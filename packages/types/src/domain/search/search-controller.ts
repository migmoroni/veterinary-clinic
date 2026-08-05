export const DEFAULT_SEARCH_DEBOUNCE_MS = 250;

export interface SearchMatcher {
	normalizedQuery: string;
	matches: (value: string) => boolean;
}

export interface DebouncedSearchController {
	cancel: () => void;
	flush: (value: string) => void;
	schedule: (value: string) => void;
}

export interface DebouncedSearchControllerInput {
	debounceMs?: number | (() => number);
	minLength?: number | (() => number);
	onclear?: (value: string) => void;
	onsearch?: (value: string) => void;
}

export interface LatestAsyncSearchController<T> {
	invalidate: () => void;
	run: (value: string) => Promise<T | undefined>;
}

export interface LatestAsyncSearchControllerInput<T> {
	onerror?: (exception: unknown, value: string) => void;
	onsettled?: (value: string) => void;
	onstart?: (value: string) => void;
	onsuccess?: (result: T, value: string) => void;
	search: (value: string) => Promise<T>;
}

export function normalizeSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

export function normalizeSearchToken(value: string): string {
	return normalizeSearchText(value).replace(/\s+/g, '');
}

export function createSearchMatcher(query: string): SearchMatcher {
	const normalizedQuery = normalizeSearchText(query);
	return {
		normalizedQuery,
		matches: (value) => normalizedQuery.length === 0 || normalizeSearchText(value).includes(normalizedQuery)
	};
}

export function createCompactSearchMatcher(query: string): SearchMatcher {
	const normalizedQuery = normalizeSearchToken(query);
	return {
		normalizedQuery,
		matches: (value) => normalizedQuery.length === 0 || normalizeSearchToken(value).includes(normalizedQuery)
	};
}

export function textMatchesSearch(value: string, query: string): boolean {
	return createSearchMatcher(query).matches(value);
}

export function searchIsReady(value: string, minLength = 0): boolean {
	return value.trim().length >= minLength;
}

function searchOptionValue(value: number | (() => number) | undefined, fallback: number): number {
	return typeof value === 'function' ? value() : (value ?? fallback);
}

export function createDebouncedSearchController(input: DebouncedSearchControllerInput): DebouncedSearchController {
	let timer: ReturnType<typeof setTimeout> | null = null;

	function cancel() {
		if (timer === null) return;
		clearTimeout(timer);
		timer = null;
	}

	function commit(value: string) {
		if (!searchIsReady(value, searchOptionValue(input.minLength, 0))) {
			input.onclear?.(value);
			return;
		}

		input.onsearch?.(value);
	}

	function schedule(value: string) {
		cancel();
		if (!searchIsReady(value, searchOptionValue(input.minLength, 0))) {
			input.onclear?.(value);
			return;
		}

		timer = setTimeout(() => {
			timer = null;
			commit(value);
		}, searchOptionValue(input.debounceMs, DEFAULT_SEARCH_DEBOUNCE_MS));
	}

	function flush(value: string) {
		cancel();
		commit(value);
	}

	return { cancel, flush, schedule };
}

export function createLatestAsyncSearchController<T>(input: LatestAsyncSearchControllerInput<T>): LatestAsyncSearchController<T> {
	let requestId = 0;

	function invalidate() {
		requestId += 1;
	}

	async function run(value: string): Promise<T | undefined> {
		const currentRequestId = ++requestId;
		input.onstart?.(value);

		try {
			const result = await input.search(value);
			if (currentRequestId !== requestId) return undefined;
			input.onsuccess?.(result, value);
			return result;
		} catch (exception) {
			if (currentRequestId !== requestId) return undefined;
			input.onerror?.(exception, value);
			return undefined;
		} finally {
			if (currentRequestId === requestId) input.onsettled?.(value);
		}
	}

	return { invalidate, run };
}
