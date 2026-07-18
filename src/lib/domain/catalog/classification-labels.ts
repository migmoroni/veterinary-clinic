import { catalogClassificationHasValue, type CatalogClassification, type CatalogClassificationAxis } from '$lib/domain/catalog/classification.js';
import type { CatalogClassificationGroup } from '$lib/domain/catalog/classification-groups.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;

export interface CatalogClassificationLabelRow {
	label: string;
	value: string;
}

function humanizeKey(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^./, (char) => char.toUpperCase());
}

function translatedCatalogLabel(key: string, fallback: string, translate: Translate): string {
	const translated = translate(key as TranslationKey);
	return !translated || translated === key ? fallback : translated;
}

function classificationLabel(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], keyPrefix: string, translate: Translate): string | null {
	const rows = classificationRows(classification, axes, keyPrefix, translate);
	if (rows.length === 0) return null;

	return rows.map((row) => `${row.label}: ${row.value}`).join('; ');
}

function classificationRows(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], keyPrefix: string, translate: Translate): CatalogClassificationLabelRow[] {
	if (!catalogClassificationHasValue(classification)) return [];

	return classification
		.map((value, index) => {
			if (!value) return null;
			const axis = axes[index];
			if (!axis) return null;
			if (!axis.values.includes(value)) return null;
			return {
				label: translatedCatalogLabel(`${keyPrefix}.${axis.id}`, humanizeKey(axis.id), translate),
				value: translatedCatalogLabel(`${keyPrefix}.${axis.id}.${value}`, humanizeKey(value), translate)
			};
		})
		.filter((value): value is CatalogClassificationLabelRow => Boolean(value));
}

export function manufacturerClassificationLabel(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate): string | null {
	return classificationLabel(classification, axes, 'catalog.manufacturer.classification', translate);
}

export function manufacturerClassificationRows(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate): CatalogClassificationLabelRow[] {
	return classificationRows(classification, axes, 'catalog.manufacturer.classification', translate);
}

export function manufacturerClassificationGroups(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	const rows = manufacturerClassificationRows(classification, axes, translate);
	return [
		{
			label: translate('formulary.classification'),
			rows: rows.length > 0 ? rows : [{ label: translate('formulary.classification'), value: notInformedLabel }]
		}
	];
}

export function conditionClassificationLabel(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate): string | null {
	return classificationLabel(classification, axes, 'catalog.condition.classification', translate);
}

export function conditionClassificationRows(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate): CatalogClassificationLabelRow[] {
	return classificationRows(classification, axes, 'catalog.condition.classification', translate);
}

export function conditionClassificationGroups(classification: CatalogClassification, axes: readonly CatalogClassificationAxis[], translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	const rows = conditionClassificationRows(classification, axes, translate);
	return [
		{
			label: translate('formulary.classification'),
			rows: rows.length > 0 ? rows : [{ label: translate('formulary.classification'), value: notInformedLabel }]
		}
	];
}
