import type { Locale } from '$lib/i18n/locales.js';
import { normalizeSearchText, normalizeSearchToken } from '$lib/domain/search/search-controller.js';

export { normalizeSearchText, normalizeSearchToken };

const searchStopWordsByLocale = {
	'pt-BR': ['a', 'as', 'o', 'os', 'e', 'em', 'de', 'da', 'das', 'do', 'dos', 'ao', 'aos', 'por', 'para', 'com', 'sem'],
	'pt-PT': ['a', 'as', 'o', 'os', 'e', 'em', 'de', 'da', 'das', 'do', 'dos', 'ao', 'aos', 'por', 'para', 'com', 'sem'],
	'en-US': ['a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'with', 'without', 'in', 'on', 'at', 'by', 'from'],
	'es-ES': ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'en', 'de', 'del', 'al', 'por', 'para', 'con', 'sin'],
	'gn-PY': ['ha', 'pe', 'ko', 'umi'],
	'fr-FR': ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'de', 'du', 'au', 'aux', 'par', 'pour', 'avec', 'sans', 'en']
} as const satisfies Record<Locale, readonly string[]>;

const normalizedSearchStopWordsByLocale: Record<Locale, Set<string>> = Object.fromEntries(
	Object.entries(searchStopWordsByLocale).map(([locale, words]) => [locale, new Set(words.map(normalizeSearchToken))])
) as Record<Locale, Set<string>>;

export function searchTermsForLocale(query: string, locale: Locale): string[] {
	const normalized = normalizeSearchText(query);
	if (normalized.length < 2) return [];

	const stopWords = normalizedSearchStopWordsByLocale[locale];
	return normalized.split(/\s+/).filter((term) => term.length >= 2 && !stopWords.has(term));
}
