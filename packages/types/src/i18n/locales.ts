export const DEFAULT_LOCALE = 'pt-BR';
export const supportedLocales = ['pt-BR', 'pt-PT', 'gn-PY', 'en-US', 'es-ES', 'fr-FR'] as const;

export type Locale = (typeof supportedLocales)[number];

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && supportedLocales.includes(value as Locale);
}
