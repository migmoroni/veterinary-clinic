import { browser } from '$app/environment';

export type ReferenceRouteStateValue = string | number | null | undefined;

export function readReferenceRouteState(keys: readonly string[]): Record<string, string> {
	const state: Record<string, string> = {};
	if (!browser) return state;

	const params = new URLSearchParams(window.location.search);
	for (const key of keys) {
		const value = params.get(key);
		if (value !== null) state[key] = value;
	}

	return state;
}

export function replaceReferenceRouteState(state: Record<string, ReferenceRouteStateValue>, defaults: Record<string, ReferenceRouteStateValue> = {}): void {
	if (!browser) return;

	const url = new URL(window.location.href);
	for (const [key, value] of Object.entries(state)) {
		const normalizedValue = normalizeRouteStateValue(value);
		const normalizedDefault = normalizeRouteStateValue(defaults[key]);
		if (!normalizedValue || normalizedValue === normalizedDefault) url.searchParams.delete(key);
		else url.searchParams.set(key, normalizedValue);
	}

	const nextUrl = `${url.pathname}${url.search}${url.hash}`;
	const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
	if (nextUrl !== currentUrl) window.history.replaceState(window.history.state, '', nextUrl);
}

function normalizeRouteStateValue(value: ReferenceRouteStateValue): string {
	if (value === null || value === undefined) return '';
	return String(value);
}
