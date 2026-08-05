import { DEFAULT_LOCALE, supportedLocales, type Locale } from '@vet/types/i18n/locales.js';

export type ActiveIngredientLocalizedText = Partial<Record<Locale, string>>;

export function normalizeActiveIngredientText(value: unknown, maxLength = 160): string | null {
	if (typeof value !== 'string') return null;
	const normalized = value.trim().replace(/\s+/g, ' ');
	if (!normalized) return null;
	return normalized.slice(0, maxLength);
}

export function normalizeActiveIngredientLocalizedText(value: unknown, maxLength = 220): ActiveIngredientLocalizedText {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
	const source = value as Record<string, unknown>;
	const entries = supportedLocales
		.map((locale) => [locale, normalizeActiveIngredientText(source[locale], maxLength)] as const)
		.filter((entry): entry is readonly [Locale, string] => Boolean(entry[1]));
	return Object.fromEntries(entries) as ActiveIngredientLocalizedText;
}

export function activeIngredientLocalizedValues(value: ActiveIngredientLocalizedText): string[] {
	return supportedLocales.map((locale) => value[locale]).filter((entry): entry is string => Boolean(entry));
}

export function activeIngredientLocalizedLabel(value: ActiveIngredientLocalizedText, locale: Locale): string | null {
	if (value[locale]) return value[locale] ?? null;
	if (value[DEFAULT_LOCALE]) return value[DEFAULT_LOCALE] ?? null;
	const language = locale.split('-')[0];
	const languageFallback = supportedLocales.find((candidate) => candidate.split('-')[0] === language && value[candidate]);
	if (languageFallback && value[languageFallback]) return value[languageFallback] ?? null;
	return activeIngredientLocalizedValues(value)[0] ?? null;
}
