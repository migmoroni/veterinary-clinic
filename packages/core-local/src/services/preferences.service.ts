import { DEFAULT_LOCALE, getLocale, isLocale, setLocale, type Locale } from '@vet/core-local/i18n/index.js';
import {
	DEFAULT_UI_ZOOM,
	DEFAULT_TYPOGRAPHY_PREFERENCES,
	getTypographyFontFamily,
	getTypographyRootSize,
	getTypographyTextTransform,
	getTypographyUiZoom,
	normalizeTypographyPreferences,
	stepUiZoom,
	type TypographyPreferences
} from '@vet/types/domain/preferences/typography.js';
import { getSetting, setSetting } from '@vet/core-local/repositories/settings.repository.js';

const LOCALE_SETTING_KEY = 'app.locale';
const TYPOGRAPHY_SETTING_KEY = 'app.typography';
const RECORD_AUTO_SAVE_SETTING_KEY = 'record.autoSave';

export const TYPOGRAPHY_PREFERENCE_CHANGED_EVENT = 'typography-preference-changed';

function parseBooleanSetting(value: string | null, fallback: boolean): boolean {
	if (value === 'true') return true;
	if (value === 'false') return false;
	return fallback;
}

export async function loadLocalePreference(): Promise<Locale> {
	const stored = await getSetting(LOCALE_SETTING_KEY);
	setLocale(isLocale(stored) ? stored : DEFAULT_LOCALE);
	return getLocale();
}

export async function saveLocalePreference(locale: Locale): Promise<void> {
	setLocale(locale);
	await setSetting(LOCALE_SETTING_KEY, locale);
}

function parseTypographySetting(value: string | null): TypographyPreferences {
	if (!value) return DEFAULT_TYPOGRAPHY_PREFERENCES;

	try {
		return normalizeTypographyPreferences(JSON.parse(value));
	} catch {
		return DEFAULT_TYPOGRAPHY_PREFERENCES;
	}
}

export function applyTypographyPreference(preferences: TypographyPreferences): void {
	if (typeof document === 'undefined') return;

	const normalized = normalizeTypographyPreferences(preferences);
	const root = document.documentElement;
	root.style.setProperty('--app-font-family', getTypographyFontFamily(normalized));
	root.style.setProperty('--app-root-font-size', getTypographyRootSize(normalized));
	root.style.setProperty('--app-ui-zoom', String(getTypographyUiZoom(normalized)));
	root.style.setProperty('--app-text-transform', getTypographyTextTransform(normalized));
	root.toggleAttribute('data-app-high-contrast', normalized.highContrast);
	root.toggleAttribute('data-app-enhanced-focus', normalized.enhancedFocus);
	root.toggleAttribute('data-app-reduce-motion', normalized.reduceMotion);
}

function notifyTypographyPreferenceChanged(preferences: TypographyPreferences): void {
	if (typeof window === 'undefined') return;

	window.dispatchEvent(
		new CustomEvent<TypographyPreferences>(TYPOGRAPHY_PREFERENCE_CHANGED_EVENT, {
			detail: preferences
		})
	);
}

export async function loadTypographyPreference(): Promise<TypographyPreferences> {
	const preferences = parseTypographySetting(await getSetting(TYPOGRAPHY_SETTING_KEY));
	applyTypographyPreference(preferences);
	return preferences;
}

export async function saveTypographyPreference(
	preferences: TypographyPreferences
): Promise<TypographyPreferences> {
	const normalized = normalizeTypographyPreferences(preferences);
	applyTypographyPreference(normalized);
	notifyTypographyPreferenceChanged(normalized);
	await setSetting(TYPOGRAPHY_SETTING_KEY, JSON.stringify(normalized));
	return normalized;
}

export async function adjustTypographyZoom(step: number): Promise<TypographyPreferences> {
	const current = parseTypographySetting(await getSetting(TYPOGRAPHY_SETTING_KEY));
	const normalizedStep = Number.isFinite(step) ? Math.trunc(step) : 0;

	if (normalizedStep === 0) {
		applyTypographyPreference(current);
		return current;
	}

	const nextUiZoom = stepUiZoom(current.uiZoom, normalizedStep);

	if (nextUiZoom === current.uiZoom) {
		applyTypographyPreference(current);
		return current;
	}

	return saveTypographyPreference({
		...current,
		uiZoom: nextUiZoom
	});
}

export async function resetTypographyZoom(): Promise<TypographyPreferences> {
	const current = parseTypographySetting(await getSetting(TYPOGRAPHY_SETTING_KEY));

	if (current.uiZoom === DEFAULT_UI_ZOOM) {
		applyTypographyPreference(current);
		return current;
	}

	return saveTypographyPreference({
		...current,
		uiZoom: DEFAULT_UI_ZOOM
	});
}

export async function loadRecordAutoSavePreference(): Promise<boolean> {
	return parseBooleanSetting(await getSetting(RECORD_AUTO_SAVE_SETTING_KEY), false);
}

export async function saveRecordAutoSavePreference(enabled: boolean): Promise<void> {
	await setSetting(RECORD_AUTO_SAVE_SETTING_KEY, String(enabled));
}
