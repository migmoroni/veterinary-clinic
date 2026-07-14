import { catalogClassificationGroupsSearchText, type CatalogClassificationGroup, type CatalogClassificationRow } from '$lib/domain/catalog/classification-groups.js';
import {
	PRODUCT_ADMINISTRATION_ROUTES,
	PRODUCT_CLASSIFICATION_AXES,
	PRODUCT_PHARMACEUTICAL_FORMS,
	type ProductAdministrationRoute,
	type ProductCatalogItem,
	type ProductPharmaceuticalForm,
	type ProductSpecies
} from '$lib/domain/product/catalog.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;

export function productClassificationGroups(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	return [
		{
			label: translate('catalog.product.classification.baseGroup'),
			rows: baseClassificationRows(source, translate, notInformedLabel)
		},
		{
			label: translate('catalog.product.classification.formAndAdministration'),
			rows: formClassificationRows(source, translate, notInformedLabel)
		},
		{
			label: translate('catalog.product.classification.targetSpecies'),
			rows: targetSpeciesClassificationRows(source, translate, notInformedLabel)
		},
		{
			label: translate('catalog.product.classification.regulatoryIdentifiers'),
			rows: regulatoryIdentifierRows(source, translate, notInformedLabel)
		}
	];
}

export function productSummaryClassificationGroups(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationGroup[] {
	return [
		{
			label: translate('catalog.product.classification.baseGroup'),
			rows: baseClassificationRows(source, translate, notInformedLabel)
		}
	];
}

export function productClassificationSearchText(source: ProductCatalogItem, translate: Translate): string {
	return catalogClassificationGroupsSearchText(productClassificationGroups(source, translate, ''));
}

export function productClassificationLabel(source: ProductCatalogItem, translate: Translate): string | null {
	const rows = baseClassificationRows(source, translate, '');
	const filledRows = rows.filter((row) => row.value);
	return filledRows.length > 0 ? filledRows.map((row) => `${row.label}: ${row.value}`).join('; ') : null;
}

function baseClassificationRows(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationRow[] {
	const profile = source.extension.classification.commercialTherapeutic;
	const rows: CatalogClassificationRow[] = [
		{
			label: translate('catalog.product.classification.origin'),
			value: productCompositionOriginLabel(profile.compositionOrigin, translate) ?? ''
		},
		{
			label: translate('catalog.product.classification.commercial'),
			value: productCommercialCategoryLabel(profile.commercialCategory, translate) ?? ''
		},
		{
			label: translate('catalog.product.classification.therapeuticAction'),
			value: productTherapeuticActionLabel(profile.therapeuticAction, translate) ?? ''
		}
	].filter((row) => row.value);

	return rows.length > 0 ? rows : [{ label: translate('formulary.classification'), value: notInformedLabel }];
}

function formClassificationRows(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationRow[] {
	const form = source.extension.classification.formAndAdministration;
	return [
		{
			label: translate('catalog.product.classification.pharmaceuticalForm'),
			value: productPharmaceuticalFormLabel(form.pharmaceuticalForm, translate) ?? notInformedLabel
		},
		{
			label: translate('catalog.product.classification.administrationRoutes'),
			value: productAdministrationRoutesLabel(form.administrationRoutes, translate) || notInformedLabel
		},
		{
			label: translate('catalog.product.classification.presentationDosage'),
			value: form.presentationDosage ?? notInformedLabel
		}
	];
}

function targetSpeciesClassificationRows(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationRow[] {
	return [
		{
			label: translate('catalog.product.classification.targetSpecies'),
			value: source.species.map((species) => productSpeciesLabel(species, translate)).join(', ') || notInformedLabel
		},
		{
			label: translate('catalog.product.classification.targetSpeciesWarnings'),
			value: source.extension.classification.targetSpecies.warnings.join('; ') || notInformedLabel
		}
	];
}

function regulatoryIdentifierRows(source: ProductCatalogItem, translate: Translate, notInformedLabel: string): CatalogClassificationRow[] {
	const identifiers = source.extension.classification.regulatoryIdentifiers;
	return [
		{
			label: translate('catalog.product.classification.brazilMapa'),
			value: identifiers.brazilMapa ?? notInformedLabel
		},
		{
			label: translate('catalog.product.classification.unitedStatesNada'),
			value: identifiers.unitedStatesNada ?? notInformedLabel
		},
		{
			label: translate('catalog.product.classification.unitedStatesAnada'),
			value: identifiers.unitedStatesAnada ?? notInformedLabel
		},
		{
			label: translate('catalog.product.classification.gtinEan'),
			value: identifiers.gtinEan ?? notInformedLabel
		}
	];
}

function productSpeciesLabel(species: ProductSpecies, translate: Translate): string {
	return species === 'canine' ? translate('pet.speciesCanine') : translate('pet.speciesFeline');
}

function productPharmaceuticalFormLabel(value: ProductPharmaceuticalForm | null, translate: Translate): string | null {
	if (!value || !PRODUCT_PHARMACEUTICAL_FORMS.includes(value)) return null;
	return translate(`catalog.product.classification.pharmaceuticalForm.${value}` as TranslationKey);
}

function productCompositionOriginLabel(value: string | null, translate: Translate): string | null {
	if (!value || !(PRODUCT_CLASSIFICATION_AXES[0].values as readonly string[]).includes(value)) return null;
	return translate(`catalog.product.classification.origin.${value}` as TranslationKey);
}

function productCommercialCategoryLabel(value: string | null, translate: Translate): string | null {
	if (!value || !(PRODUCT_CLASSIFICATION_AXES[1].values as readonly string[]).includes(value)) return null;
	return translate(`catalog.product.classification.commercial.${value}` as TranslationKey);
}

function productTherapeuticActionLabel(value: string | null, translate: Translate): string | null {
	if (!value || !(PRODUCT_CLASSIFICATION_AXES[2].values as readonly string[]).includes(value)) return null;
	return translate(`catalog.product.classification.therapeuticAction.${value}` as TranslationKey);
}

function productAdministrationRoutesLabel(values: readonly ProductAdministrationRoute[], translate: Translate): string {
	return values
		.filter((value) => PRODUCT_ADMINISTRATION_ROUTES.includes(value))
		.map((value) => translate(`catalog.product.classification.administrationRoute.${value}` as TranslationKey))
		.join(', ');
}
