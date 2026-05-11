import { DEFAULT_LOCALE, getLocale, isLocale, setLocale, type Locale } from '$lib/i18n/index.js';
import {
	DEFAULT_TYPOGRAPHY_PREFERENCES,
	getTypographyFontFamily,
	getTypographyRootSize,
	normalizeTypographyPreferences,
	type TypographyPreferences
} from '$lib/domain/preferences/typography.js';
import { getSetting, setSetting } from '$lib/persistence/repositories/settings.repository.js';

const LOCALE_SETTING_KEY = 'app.locale';
const TYPOGRAPHY_SETTING_KEY = 'app.typography';
const RECORD_AUTO_SAVE_SETTING_KEY = 'record.autoSave';

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
	await setSetting(TYPOGRAPHY_SETTING_KEY, JSON.stringify(normalized));
	return normalized;
}

export async function loadRecordAutoSavePreference(): Promise<boolean> {
	return parseBooleanSetting(await getSetting(RECORD_AUTO_SAVE_SETTING_KEY), false);
}

export async function saveRecordAutoSavePreference(enabled: boolean): Promise<void> {
	await setSetting(RECORD_AUTO_SAVE_SETTING_KEY, String(enabled));
}