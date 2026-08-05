import { enUs } from './en-US.js';
import { esEs } from './es-ES.js';
import { frFr } from './fr-FR.js';
import { gnPy } from './gn-PY.js';
import { DEFAULT_LOCALE, isLocale, supportedLocales, type Locale } from './locales.js';
import { ptBr, type TranslationKey as KnownTranslationKey } from './pt-BR.js';
import { ptPt } from './pt-PT.js';
import { i18n } from './state.svelte.js';

export type TranslationKey = KnownTranslationKey | (string & {});

const dictionaries = {
	'pt-BR': ptBr,
	'pt-PT': ptPt,
	'gn-PY': gnPy,
	'en-US': enUs,
	'es-ES': esEs,
	'fr-FR': frFr
} satisfies Record<Locale, Record<KnownTranslationKey, string>>;

export const localeOptions = supportedLocales.map((locale) => ({
	value: locale,
	labelKey: `locale.${locale}` as TranslationKey
}));

export { DEFAULT_LOCALE, i18n, isLocale, supportedLocales };
export type { Locale };

export function getLocale(): Locale {
	return i18n.locale;
}

export function setLocale(locale: Locale) {
	i18n.setLocale(locale);
}

export function t(key: TranslationKey): string {
	const knownKey = key as KnownTranslationKey;
	return dictionaries[i18n.locale][knownKey] ?? dictionaries[DEFAULT_LOCALE][knownKey] ?? key;
}
