import { enUsMedicationAliasTranslations } from './en-US.js';
import { esEsMedicationAliasTranslations } from './es-ES.js';
import { frFrMedicationAliasTranslations } from './fr-FR.js';
import { gnPyMedicationAliasTranslations } from './gn-PY.js';
import { ptBrMedicationAliasTranslations, type MedicationAliasTranslationKey } from './pt-BR.js';
import { ptPtMedicationAliasTranslations } from './pt-PT.js';
import { supportedLocales, type Locale } from '../locales.js';

const medicationAliasDictionaries = {
	'pt-BR': ptBrMedicationAliasTranslations,
	'pt-PT': ptPtMedicationAliasTranslations,
	'gn-PY': gnPyMedicationAliasTranslations,
	'en-US': enUsMedicationAliasTranslations,
	'es-ES': esEsMedicationAliasTranslations,
	'fr-FR': frFrMedicationAliasTranslations
} satisfies Record<Locale, Record<MedicationAliasTranslationKey, readonly string[]>>;

export type { MedicationAliasTranslationKey };

/**
 * Returns every localized search form for the requested semantic aliases.
 * Catalog aliases are language-independent after persistence, so changing the
 * interface locale never makes an existing item harder to find.
 */
export function localizedMedicationAliases(...keys: MedicationAliasTranslationKey[]): string[] {
	const aliases = keys.flatMap((key) => supportedLocales.flatMap((locale) => medicationAliasDictionaries[locale][key]));
	return [...new Set(aliases)];
}
