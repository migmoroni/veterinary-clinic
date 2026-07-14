import { catalogClassificationHasValue, type CatalogClassification, type CatalogClassificationAxis } from '$lib/domain/catalog/classification.js';
import type { CatalogClassificationGroup } from '$lib/domain/catalog/classification-groups.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;
type AxisLabels = {
	labelKey: TranslationKey;
	valueKeys: Record<string, TranslationKey>;
};

export interface CatalogClassificationLabelRow {
	label: string;
	value: string;
}

function classificationLabel(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], labels: readonly [AxisLabels, AxisLabels, AxisLabels], translate: Translate): string | null {
	const rows = classificationRows(classification, axes, labels, translate);
	if (rows.length === 0) return null;

	return rows.map((row) => `${row.label}: ${row.value}`).join('; ');
}

function classificationRows(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], labels: readonly [AxisLabels, AxisLabels, AxisLabels], translate: Translate): CatalogClassificationLabelRow[] {
	if (!catalogClassificationHasValue(classification)) return [];

	return classification
		.map((value, index) => {
			if (!value) return null;
			const axis = axes[index];
			const axisLabels = labels[index];
			if (!axis.values.includes(value)) return null;
			const valueKey = axisLabels.valueKeys[value];
			if (!valueKey) return null;
			return {
				label: translate(axisLabels.labelKey),
				value: translate(valueKey)
			};
		})
		.filter((value): value is CatalogClassificationLabelRow => Boolean(value));
}

export function manufacturerClassificationLabel(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate): string | null {
	return classificationLabel(
		classification,
		axes,
		[
			{
				labelKey: 'catalog.manufacturer.classification.role',
				valueKeys: {
					manufacturer: 'catalog.manufacturer.classification.role.manufacturer',
					distributor: 'catalog.manufacturer.classification.role.distributor',
					importer: 'catalog.manufacturer.classification.role.importer',
					laboratory: 'catalog.manufacturer.classification.role.laboratory'
				}
			},
			{
				labelKey: 'catalog.manufacturer.classification.scope',
				valueKeys: {
					local: 'catalog.manufacturer.classification.scope.local',
					national: 'catalog.manufacturer.classification.scope.national',
					multinational: 'catalog.manufacturer.classification.scope.multinational'
				}
			},
			{
				labelKey: 'catalog.manufacturer.classification.segment',
				valueKeys: {
					animalHealth: 'catalog.manufacturer.classification.segment.animalHealth',
					biologics: 'catalog.manufacturer.classification.segment.biologics',
					pharmaceuticals: 'catalog.manufacturer.classification.segment.pharmaceuticals',
					mixed: 'catalog.manufacturer.classification.segment.mixed'
				}
			}
		],
		translate
	);
}

export function manufacturerClassificationRows(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate): CatalogClassificationLabelRow[] {
	return classificationRows(
		classification,
		axes,
		[
			{
				labelKey: 'catalog.manufacturer.classification.role',
				valueKeys: {
					manufacturer: 'catalog.manufacturer.classification.role.manufacturer',
					distributor: 'catalog.manufacturer.classification.role.distributor',
					importer: 'catalog.manufacturer.classification.role.importer',
					laboratory: 'catalog.manufacturer.classification.role.laboratory'
				}
			},
			{
				labelKey: 'catalog.manufacturer.classification.scope',
				valueKeys: {
					local: 'catalog.manufacturer.classification.scope.local',
					national: 'catalog.manufacturer.classification.scope.national',
					multinational: 'catalog.manufacturer.classification.scope.multinational'
				}
			},
			{
				labelKey: 'catalog.manufacturer.classification.segment',
				valueKeys: {
					animalHealth: 'catalog.manufacturer.classification.segment.animalHealth',
					biologics: 'catalog.manufacturer.classification.segment.biologics',
					pharmaceuticals: 'catalog.manufacturer.classification.segment.pharmaceuticals',
					mixed: 'catalog.manufacturer.classification.segment.mixed'
				}
			}
		],
		translate
	);
}

export function manufacturerClassificationGroups(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	const rows = manufacturerClassificationRows(classification, axes, translate);
	return [
		{
			label: translate('formulary.classification'),
			rows: rows.length > 0 ? rows : [{ label: translate('formulary.classification'), value: notInformedLabel }]
		}
	];
}

export function conditionClassificationLabel(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate): string | null {
	return classificationLabel(
		classification,
		axes,
		[
			{
				labelKey: 'catalog.condition.classification.etiology',
				valueKeys: {
					infectious: 'catalog.condition.classification.etiology.infectious',
					genetic: 'catalog.condition.classification.etiology.genetic',
					traumatic: 'catalog.condition.classification.etiology.traumatic',
					metabolic: 'catalog.condition.classification.etiology.metabolic',
					immune: 'catalog.condition.classification.etiology.immune',
					neoplastic: 'catalog.condition.classification.etiology.neoplastic',
					environmental: 'catalog.condition.classification.etiology.environmental',
					idiopathic: 'catalog.condition.classification.etiology.idiopathic'
				}
			},
			{
				labelKey: 'catalog.condition.classification.course',
				valueKeys: {
					acute: 'catalog.condition.classification.course.acute',
					subacute: 'catalog.condition.classification.course.subacute',
					chronic: 'catalog.condition.classification.course.chronic',
					recurrent: 'catalog.condition.classification.course.recurrent'
				}
			},
			{
				labelKey: 'catalog.condition.classification.severity',
				valueKeys: {
					mild: 'catalog.condition.classification.severity.mild',
					moderate: 'catalog.condition.classification.severity.moderate',
					severe: 'catalog.condition.classification.severity.severe',
					critical: 'catalog.condition.classification.severity.critical'
				}
			}
		],
		translate
	);
}

export function conditionClassificationRows(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate): CatalogClassificationLabelRow[] {
	return classificationRows(
		classification,
		axes,
		[
			{
				labelKey: 'catalog.condition.classification.etiology',
				valueKeys: {
					infectious: 'catalog.condition.classification.etiology.infectious',
					genetic: 'catalog.condition.classification.etiology.genetic',
					traumatic: 'catalog.condition.classification.etiology.traumatic',
					metabolic: 'catalog.condition.classification.etiology.metabolic',
					immune: 'catalog.condition.classification.etiology.immune',
					neoplastic: 'catalog.condition.classification.etiology.neoplastic',
					environmental: 'catalog.condition.classification.etiology.environmental',
					idiopathic: 'catalog.condition.classification.etiology.idiopathic'
				}
			},
			{
				labelKey: 'catalog.condition.classification.course',
				valueKeys: {
					acute: 'catalog.condition.classification.course.acute',
					subacute: 'catalog.condition.classification.course.subacute',
					chronic: 'catalog.condition.classification.course.chronic',
					recurrent: 'catalog.condition.classification.course.recurrent'
				}
			},
			{
				labelKey: 'catalog.condition.classification.severity',
				valueKeys: {
					mild: 'catalog.condition.classification.severity.mild',
					moderate: 'catalog.condition.classification.severity.moderate',
					severe: 'catalog.condition.classification.severity.severe',
					critical: 'catalog.condition.classification.severity.critical'
				}
			}
		],
		translate
	);
}

export function conditionClassificationGroups(classification: CatalogClassification, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis], translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	const rows = conditionClassificationRows(classification, axes, translate);
	return [
		{
			label: translate('formulary.classification'),
			rows: rows.length > 0 ? rows : [{ label: translate('formulary.classification'), value: notInformedLabel }]
		}
	];
}
