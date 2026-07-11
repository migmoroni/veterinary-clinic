import { enUsProductAliasTranslations } from './en-US.js';
import { esEsProductAliasTranslations } from './es-ES.js';
import { frFrProductAliasTranslations } from './fr-FR.js';
import { gnPyProductAliasTranslations } from './gn-PY.js';
import { ptBrProductAliasTranslations, type ProductAliasTranslationKey } from './pt-BR.js';
import { ptPtProductAliasTranslations } from './pt-PT.js';
import { supportedLocales, type Locale } from '../locales.js';

const productAliasDictionaries = {
	'pt-BR': ptBrProductAliasTranslations,
	'pt-PT': ptPtProductAliasTranslations,
	'gn-PY': gnPyProductAliasTranslations,
	'en-US': enUsProductAliasTranslations,
	'es-ES': esEsProductAliasTranslations,
	'fr-FR': frFrProductAliasTranslations
} satisfies Record<Locale, Record<ProductAliasTranslationKey, readonly string[]>>;

export type { ProductAliasTranslationKey };

/**
 * Returns every localized search form for the requested semantic aliases.
 * Catalog aliases are language-independent after persistence, so changing the
 * interface locale never makes an existing item harder to find.
 */
export function localizedProductAliases(...keys: ProductAliasTranslationKey[]): string[] {
	const aliases = keys.flatMap((key) => supportedLocales.flatMap((locale) => productAliasDictionaries[locale][key]));
	return [...new Set(aliases)];
}
