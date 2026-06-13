import { enUsPreventiveAliasTranslations } from './en-US.js';
import { esEsPreventiveAliasTranslations } from './es-ES.js';
import { gnPyPreventiveAliasTranslations } from './gn-PY.js';
import { ptBrPreventiveAliasTranslations, type PreventiveAliasTranslationKey } from './pt-BR.js';
import { ptPtPreventiveAliasTranslations } from './pt-PT.js';
import { supportedLocales, type Locale } from '../locales.js';

const preventiveAliasDictionaries = {
	'pt-BR': ptBrPreventiveAliasTranslations,
	'pt-PT': ptPtPreventiveAliasTranslations,
	'gn-PY': gnPyPreventiveAliasTranslations,
	'en-US': enUsPreventiveAliasTranslations,
	'es-ES': esEsPreventiveAliasTranslations
} satisfies Record<Locale, Record<PreventiveAliasTranslationKey, readonly string[]>>;

export type { PreventiveAliasTranslationKey };

/**
 * Returns every localized search form for the requested semantic aliases.
 * Catalog aliases are language-independent after persistence, so changing the
 * interface locale never makes an existing item harder to find.
 */
export function localizedPreventiveAliases(...keys: PreventiveAliasTranslationKey[]): string[] {
	const aliases = keys.flatMap((key) => supportedLocales.flatMap((locale) => preventiveAliasDictionaries[locale][key]));
	return [...new Set(aliases)];
}
