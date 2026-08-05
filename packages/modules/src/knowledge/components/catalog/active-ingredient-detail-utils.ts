import {
	activeIngredientAtcVetSystemLabel,
	activeIngredientBrazilRegulatoryControlLabel,
	activeIngredientEuropeRegulatoryControlLabel,
	activeIngredientNomenclatureEntryStandardDescription,
	activeIngredientNomenclatureEntryStandardLabel,
	activeIngredientNomenclatureEntryValue,
	activeIngredientNomenclaturePreferredStandards,
	activeIngredientUnitedStatesRegulatoryControlLabel,
	activeIngredientVeterinaryRestrictionLabel,
	type ActiveIngredientNomenclatureStandard
} from '@vet/types/domain/active-ingredient/classification.js';
import type { ActiveIngredientCatalogItem } from '@vet/types/domain/active-ingredient/catalog.js';
import type { CatalogClassificationGroup, CatalogClassificationRow } from '@vet/types/domain/catalog/classification-groups.js';
import type { TranslationKey } from '@vet/core-local/i18n/index.js';
import type { Locale } from '@vet/core-local/i18n/locales.js';

type Translate = (key: TranslationKey) => string;

export function activeIngredientClassificationGroups(source: ActiveIngredientCatalogItem, translate: Translate, locale: Locale, notInformedLabel: string): CatalogClassificationGroup[] {
	const classification = source.extension.classification;
	const valueOrFallback = (value: string | null | undefined): string => value || notInformedLabel;

	return [
		{
			label: translate('catalog.activeIngredient.classification.nomenclature'),
			rows: [
				{
					label: activeIngredientNomenclatureStandardLabel('scientificName', translate),
					value: valueOrFallback(activeIngredientNomenclatureEntryValue(classification, 'scientificName', locale))
				},
				...activeIngredientDenominationRows(source, translate, locale)
			]
		},
		{
			label: translate('catalog.activeIngredient.classification.identification'),
			rows: [
				{
					label: translate('catalog.activeIngredient.classification.casNumber'),
					value: valueOrFallback(classification.nomenclature.casNumber)
				},
				{
					label: translate('catalog.activeIngredient.classification.atcVetCode'),
					value: valueOrFallback(classification.atcVet.code)
				},
				{
					label: translate('catalog.activeIngredient.classification.atcVetSystem'),
					value: valueOrFallback(activeIngredientAtcVetSystemLabel(classification.atcVet.system, locale))
				}
			]
		},
		{
			label: translate('catalog.activeIngredient.classification.regulationAndRestriction'),
			rows: [
				{
					label: translate('catalog.activeIngredient.classification.regulatoryBrazil'),
					value: valueOrFallback(activeIngredientBrazilRegulatoryControlLabel(classification.regulatoryControl.brazil, translate))
				},
				{
					label: translate('catalog.activeIngredient.classification.regulatoryUnitedStates'),
					value: valueOrFallback(activeIngredientUnitedStatesRegulatoryControlLabel(classification.regulatoryControl.unitedStates, translate))
				},
				{
					label: translate('catalog.activeIngredient.classification.regulatoryEurope'),
					value: valueOrFallback(activeIngredientEuropeRegulatoryControlLabel(classification.regulatoryControl.europe, translate))
				},
				{
					label: translate('catalog.activeIngredient.classification.veterinaryRestriction'),
					value: valueOrFallback(activeIngredientVeterinaryRestrictionLabel(classification.veterinaryRestriction, translate))
				}
			]
		}
	];
}

export function activeIngredientSummaryClassificationGroups(source: ActiveIngredientCatalogItem, translate: Translate, locale: Locale, notInformedLabel: string): CatalogClassificationGroup[] {
	return activeIngredientClassificationGroups(source, translate, locale, notInformedLabel).slice(0, 2);
}

function activeIngredientNomenclatureStandardLabel(standard: ActiveIngredientNomenclatureStandard, translate: Translate): string {
	return activeIngredientNomenclatureEntryStandardLabel(standard, translate);
}

function activeIngredientNomenclatureStandardDescription(standard: ActiveIngredientNomenclatureStandard, translate: Translate): string | null {
	return activeIngredientNomenclatureEntryStandardDescription(standard, translate);
}

function activeIngredientDenominationRows(source: ActiveIngredientCatalogItem, translate: Translate, locale: Locale): CatalogClassificationRow[] {
	return activeIngredientNomenclaturePreferredStandards(locale)
		.map<CatalogClassificationRow | null>((standard) => {
			const value = activeIngredientNomenclatureEntryValue(source.extension.classification, standard, locale);
			if (!value) return null;
			return {
				label: activeIngredientNomenclatureStandardLabel(standard, translate),
				labelDescription: activeIngredientNomenclatureStandardDescription(standard, translate),
				value
			};
		})
		.filter((row): row is CatalogClassificationRow => Boolean(row));
}
