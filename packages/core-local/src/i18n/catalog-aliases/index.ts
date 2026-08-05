import { enUsCatalogAliasTranslations } from './en-US.js';
import { esEsCatalogAliasTranslations } from './es-ES.js';
import { frFrCatalogAliasTranslations } from './fr-FR.js';
import { gnPyCatalogAliasTranslations } from './gn-PY.js';
import { ptBrCatalogAliasTranslations, type CatalogAliasTranslationKey } from './pt-BR.js';
import { ptPtCatalogAliasTranslations } from './pt-PT.js';
import { supportedLocales, type Locale } from '../locales.js';

const catalogAliasDictionaries = {
	'pt-BR': ptBrCatalogAliasTranslations,
	'pt-PT': ptPtCatalogAliasTranslations,
	'gn-PY': gnPyCatalogAliasTranslations,
	'en-US': enUsCatalogAliasTranslations,
	'es-ES': esEsCatalogAliasTranslations,
	'fr-FR': frFrCatalogAliasTranslations
} satisfies Record<Locale, Record<CatalogAliasTranslationKey, readonly string[]>>;

export type { CatalogAliasTranslationKey };

/**
 * Returns every localized search form for the requested semantic aliases.
 * Catalog aliases are language-independent after persistence, so changing the
 * interface locale never makes an existing item harder to find.
 */
export function localizedCatalogAliases(...keys: CatalogAliasTranslationKey[]): string[] {
	const aliases = keys.flatMap((key) => supportedLocales.flatMap((locale) => catalogAliasDictionaries[locale][key]));
	return [...new Set(aliases)];
}
