import type { TranslationKey } from '@vet/types/i18n/index.js';

type Translate = (key: TranslationKey) => string;

export function humanizeCatalogTypeSegment(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^./, (char) => char.toUpperCase());
}

export function translatedCatalogTypeSegment(prefix: string, path: readonly string[], translate: Translate): string {
	const key = `${prefix}.${path.join('.')}`;
	const translated = translate(key as TranslationKey);
	return !translated || translated === key ? humanizeCatalogTypeSegment(path.at(-1) ?? '') : translated;
}

export function catalogPathTypeLabel(prefix: string, type: readonly (string | null)[], translate: Translate): string {
	const segments = type.slice(1).filter((segment): segment is string => Boolean(segment));
	if (segments.length === 0) return translate(prefix as TranslationKey);
	return segments.map((_, index) => translatedCatalogTypeSegment(prefix, segments.slice(0, index + 1), translate)).join(' / ');
}
