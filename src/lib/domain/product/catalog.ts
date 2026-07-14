import {
	catalogType,
	catalogTypeCategory,
	catalogTypeSubcategory,
	catalogTypeSubcategoryOptions,
	catalogTypesFromTree,
	isCatalogType,
	normalizeCatalogAliases as normalizeBaseCatalogAliases,
	normalizeCatalogRegions,
	normalizedNullableText,
	normalizedSectionTexts,
	parseCatalogAliases as parseBaseCatalogAliases,
	parseCatalogRegions,
	parseCatalogType,
	stringifyCatalogAliases as stringifyBaseCatalogAliases,
	stringifyCatalogRegions,
	stringifyCatalogType,
	type CatalogEntityBase,
	type CatalogEntityOrigin,
	type CatalogTypeTuple
} from '$lib/domain/catalog/catalog-entity.js';
import type { ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
import { defaultTreatmentSpecies, isTreatmentSpecies, normalizeTreatmentSpecies, parseTreatmentSpecies, stringifyTreatmentSpecies, type TreatmentSpecies } from '$lib/domain/treatment/species.js';

export const PRODUCT_TYPE_TREE = {
	product: {
		medication: ['vaccine', 'antiparasitic'],
		nutrition: [],
		hygiene: [],
		disinfectants: []
	}
} as const;

export const PRODUCT_CLASSIFICATION_AXES = [
	{ id: 'origin', values: ['allopathic', 'phytotherapeutic', 'homeopathic', 'biological'] },
	{ id: 'commercial', values: ['reference', 'generic', 'similar', 'branded', 'compounded', 'nonApplicable'] },
	{ id: 'therapeuticAction', values: ['prophylactic', 'curative', 'palliative', 'control'] }
] as const;

export const PRODUCT_PHARMACEUTICAL_FORMS = [
	'palatableTablet',
	'tablet',
	'capsule',
	'oralSuspension',
	'injectableSolution',
	'spotOn',
	'oticOintment',
	'ophthalmicSolution',
	'topicalSpray',
	'shampoo'
] as const;

export const PRODUCT_ADMINISTRATION_ROUTES = ['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'otic', 'ophthalmic', 'intranasal'] as const;

export type ProductTypeTree = typeof PRODUCT_TYPE_TREE;
export type ProductTypeMain = keyof ProductTypeTree['product'];
export type ProductTypeSubtype<TMain extends ProductTypeMain> = ProductTypeTree['product'][TMain][number];
export type ProductTypeTuple<TMain extends ProductTypeMain = ProductTypeMain> = Extract<CatalogTypeTuple<ProductTypeTree>, readonly ['product', TMain, string | null]>;
export type ProductType = ProductTypeTuple;
export type ProductCompositionOrigin = (typeof PRODUCT_CLASSIFICATION_AXES)[0]['values'][number];
export type ProductCommercialCategory = (typeof PRODUCT_CLASSIFICATION_AXES)[1]['values'][number];
export type ProductTherapeuticAction = (typeof PRODUCT_CLASSIFICATION_AXES)[2]['values'][number];
export type ProductPharmaceuticalForm = (typeof PRODUCT_PHARMACEUTICAL_FORMS)[number];
export type ProductAdministrationRoute = (typeof PRODUCT_ADMINISTRATION_ROUTES)[number];
export type ProductSpecies = TreatmentSpecies;
export type ProductCatalogOrigin = CatalogEntityOrigin;

export interface ProductCommercialTherapeuticClassification {
	compositionOrigin: ProductCompositionOrigin | null;
	commercialCategory: ProductCommercialCategory | null;
	therapeuticAction: ProductTherapeuticAction | null;
}

export interface ProductFormClassification {
	pharmaceuticalForm: ProductPharmaceuticalForm | null;
	administrationRoutes: ProductAdministrationRoute[];
	presentationDosage: string | null;
}

export interface ProductRegulatoryIdentifiers {
	brazilMapa: string | null;
	unitedStatesNada: string | null;
	unitedStatesAnada: string | null;
	gtinEan: string | null;
}

export interface ProductTargetSpeciesClassification {
	warnings: string[];
}

export interface ProductClassification {
	commercialTherapeutic: ProductCommercialTherapeuticClassification;
	formAndAdministration: ProductFormClassification;
	targetSpecies: ProductTargetSpeciesClassification;
	regulatoryIdentifiers: ProductRegulatoryIdentifiers;
}

export const PRODUCT_TYPES = catalogTypesFromTree(PRODUCT_TYPE_TREE) as ProductType[];

export function productTypeOptions<TMain extends ProductTypeMain>(main: TMain): readonly ProductTypeSubtype<TMain>[] {
	return catalogTypeSubcategoryOptions(PRODUCT_TYPE_TREE, 'product', main);
}

export function productType<TMain extends ProductTypeMain>(main: TMain, subtype: ProductTypeSubtype<TMain> extends never ? null : ProductTypeSubtype<TMain>): ProductTypeTuple<TMain> {
	return catalogType(PRODUCT_TYPE_TREE, 'product', main, subtype) as ProductTypeTuple<TMain>;
}

export function productTypeMain(type: ProductType): ProductTypeMain {
	return catalogTypeCategory(type) as ProductTypeMain;
}

export function productTypeSubtype<TMain extends ProductTypeMain>(type: ProductTypeTuple<TMain>): ProductTypeTuple<TMain>[2] {
	return catalogTypeSubcategory(type) as ProductTypeTuple<TMain>[2];
}

export function isProductType(value: unknown): value is ProductType {
	return isCatalogType(value, PRODUCT_TYPE_TREE);
}

export function parseProductType(value: string): ProductType {
	try {
		return parseCatalogType(value, PRODUCT_TYPE_TREE) as ProductType;
	} catch {
		throw new Error('product_type_invalid');
	}
}

export function stringifyProductType(type: ProductType): string {
	return stringifyCatalogType(type);
}

export const productLeafletSectionIds = [
	'about',
	'presentations',
	'indications',
	'administration',
	'interactions',
	'pharmacology',
	'studies',
	'videos',
	'distributors',
	'references'
] as const;

export type ProductLeafletSectionId = (typeof productLeafletSectionIds)[number];

export type ProductLeafletSections = Partial<Record<ProductLeafletSectionId, string>>;

export interface ProductCatalogExtension {
	classification: ProductClassification;
	commercialLine: string | null;
	sections: ProductLeafletSections;
}

export const defaultProductSpecies = [...defaultTreatmentSpecies];
export const emptyProductCommercialTherapeuticClassification: ProductCommercialTherapeuticClassification = {
	compositionOrigin: null,
	commercialCategory: null,
	therapeuticAction: null
};
export const emptyProductFormClassification: ProductFormClassification = {
	pharmaceuticalForm: null,
	administrationRoutes: [],
	presentationDosage: null
};
export const emptyProductTargetSpeciesClassification: ProductTargetSpeciesClassification = {
	warnings: []
};
export const emptyProductRegulatoryIdentifiers: ProductRegulatoryIdentifiers = {
	brazilMapa: null,
	unitedStatesNada: null,
	unitedStatesAnada: null,
	gtinEan: null
};
export const emptyProductCatalogExtension: ProductCatalogExtension = {
	classification: {
		commercialTherapeutic: emptyProductCommercialTherapeuticClassification,
		formAndAdministration: emptyProductFormClassification,
		targetSpecies: emptyProductTargetSpeciesClassification,
		regulatoryIdentifiers: emptyProductRegulatoryIdentifiers
	},
	commercialLine: null,
	sections: {}
};

export interface ProductCatalogMetadata {
	type: ProductType;
	aliases: string[];
	manufacturerId: string | null;
	manufacturerName: string | null;
	activeIngredientIds: string[];
	origin: ProductCatalogOrigin;
	regions: string[];
	species: ProductSpecies[];
	extension: ProductCatalogExtension;
}

export interface ProductCatalogItem extends CatalogEntityBase<ProductType, ProductCatalogExtension> {
	species: ProductSpecies[];
	manufacturerId: string | null;
	manufacturerName: string | null;
	activeIngredientIds: string[];
	activeIngredients: ActiveIngredientCatalogItem[];
}

export function canEditProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return item.origin === 'user';
}

export function canDeleteProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return canEditProductCatalogItem(item);
}

export function normalizeProductSpecies(values: readonly string[] | null | undefined): ProductSpecies[] {
	return normalizeTreatmentSpecies(values);
}

export function parseProductSpecies(value: string | null | undefined): ProductSpecies[] {
	return parseTreatmentSpecies(value);
}

export function stringifyProductSpecies(values: readonly string[] | null | undefined): string {
	return stringifyTreatmentSpecies(values);
}

/**
 * Normalizes product markets as unique ISO 3166-1 alpha-3 country codes.
 */
export function normalizeProductRegions(values: readonly string[] | null | undefined): string[] {
	return normalizeCatalogRegions(values);
}

export function parseProductRegions(value: string | null | undefined): string[] {
	return parseCatalogRegions(value);
}

export function stringifyProductRegions(values: readonly string[] | null | undefined): string {
	return stringifyCatalogRegions(values);
}

export function normalizeCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	return normalizeBaseCatalogAliases(values, maxLength, normalize, canonicalNormalizedName);
}

export function parseCatalogAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	return parseBaseCatalogAliases(value, maxLength, normalize, canonicalNormalizedName);
}

export function stringifyCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return stringifyBaseCatalogAliases(values, maxLength, normalize, canonicalNormalizedName);
}

export function productItemMatchesSpecies(species: readonly ProductSpecies[], petSpecies: string | null | undefined): boolean {
	if (!isTreatmentSpecies(petSpecies)) return true;
	return species.includes(petSpecies);
}

export function productItemMatchesSearch(name: string, aliases: readonly string[], query: string, normalize: (value: string) => string): boolean {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return true;
	if (normalize(name).includes(normalizedQuery)) return true;
	return aliases.some((alias) => normalize(alias).includes(normalizedQuery));
}

function normalizedLeafletSections(value: unknown): ProductLeafletSections {
	return normalizedSectionTexts(value, productLeafletSectionIds);
}

function normalizedProductOption<TOption extends string>(value: unknown, options: readonly TOption[]): TOption | null {
	if (typeof value !== 'string') return null;
	return (options as readonly string[]).includes(value) ? (value as TOption) : null;
}

function normalizedProductOptionList<TOption extends string>(value: unknown, options: readonly TOption[]): TOption[] {
	if (!Array.isArray(value)) return [];

	const normalized: TOption[] = [];
	for (const item of value) {
		const option = normalizedProductOption(item, options);
		if (option && !normalized.includes(option)) normalized.push(option);
	}
	return normalized;
}

function normalizedTextList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];

	const normalized: string[] = [];
	for (const item of value) {
		const text = normalizedNullableText(item);
		if (text && !normalized.includes(text)) normalized.push(text);
	}
	return normalized;
}

export function normalizeProductFormClassification(value: unknown): ProductFormClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductFormClassification, administrationRoutes: [] };

	const source = value as Record<string, unknown>;
	return {
		pharmaceuticalForm: normalizedProductOption(source.pharmaceuticalForm, PRODUCT_PHARMACEUTICAL_FORMS),
		administrationRoutes: normalizedProductOptionList(source.administrationRoutes, PRODUCT_ADMINISTRATION_ROUTES),
		presentationDosage: normalizedNullableText(source.presentationDosage)
	};
}

export function normalizeProductCommercialTherapeuticClassification(value: unknown): ProductCommercialTherapeuticClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCommercialTherapeuticClassification };

	const source = value as Record<string, unknown>;
	return {
		compositionOrigin: normalizedProductOption(source.compositionOrigin, PRODUCT_CLASSIFICATION_AXES[0].values),
		commercialCategory: normalizedProductOption(source.commercialCategory, PRODUCT_CLASSIFICATION_AXES[1].values),
		therapeuticAction: normalizedProductOption(source.therapeuticAction, PRODUCT_CLASSIFICATION_AXES[2].values)
	};
}

export function normalizeProductTargetSpeciesClassification(value: unknown): ProductTargetSpeciesClassification {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { warnings: [] };

	const source = value as Record<string, unknown>;
	return {
		warnings: normalizedTextList(source.warnings)
	};
}

export function normalizeProductRegulatoryIdentifiers(value: unknown): ProductRegulatoryIdentifiers {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductRegulatoryIdentifiers };

	const source = value as Record<string, unknown>;
	return {
		brazilMapa: normalizedNullableText(source.brazilMapa),
		unitedStatesNada: normalizedNullableText(source.unitedStatesNada),
		unitedStatesAnada: normalizedNullableText(source.unitedStatesAnada),
		gtinEan: normalizedNullableText(source.gtinEan)
	};
}

export function normalizeProductClassification(value: unknown): ProductClassification {
	if (!value || typeof value !== 'object') {
		return {
			commercialTherapeutic: { ...emptyProductCommercialTherapeuticClassification },
			formAndAdministration: { ...emptyProductFormClassification, administrationRoutes: [] },
			targetSpecies: { warnings: [] },
			regulatoryIdentifiers: { ...emptyProductRegulatoryIdentifiers }
		};
	}

	const source = value as Record<string, unknown>;
	return {
		commercialTherapeutic: normalizeProductCommercialTherapeuticClassification(source.commercialTherapeutic),
		formAndAdministration: normalizeProductFormClassification(source.formAndAdministration),
		targetSpecies: normalizeProductTargetSpeciesClassification(source.targetSpecies),
		regulatoryIdentifiers: normalizeProductRegulatoryIdentifiers(source.regulatoryIdentifiers)
	};
}

export function normalizeProductCatalogExtension(value: unknown): ProductCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizeProductClassification(source.classification),
		commercialLine: normalizedNullableText(source.commercialLine),
		sections: normalizedLeafletSections(source.sections)
	};
}

export function parseProductCatalogExtension(value: string | null | undefined): ProductCatalogExtension {
	if (!value) return { ...emptyProductCatalogExtension, sections: {} };

	try {
		return normalizeProductCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyProductCatalogExtension, sections: {} };
	}
}

export function stringifyProductCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeProductCatalogExtension(value));
}
