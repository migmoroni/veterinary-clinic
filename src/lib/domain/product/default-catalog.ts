import type { ProductCatalogExtension, ProductType, ProductTypeSubtype } from '$lib/domain/product/catalog.js';

export type DefaultProductType = ProductType;
export type DefaultTreatmentProductSubtype = ProductTypeSubtype<'medication'>;
export type DefaultProductSpecies = 'canine' | 'feline';

export interface DefaultProductCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultProductCatalogItem {
	id: string;
	type: DefaultProductType;
	name: string;
	species: DefaultProductSpecies[];
	aliases: string[];
	manufacturerId: string | null;
	activeIngredientIds?: string[];
	images?: DefaultProductCatalogImage[];
	regions: string[];
	extension?: Partial<ProductCatalogExtension>;
}

type DefaultProductCatalogJsonItem = DefaultProductCatalogItem;

const productCatalogModules = import.meta.glob('../../catalog/defaults/products/**/*.json', { eager: true, import: 'default' }) as Record<string, DefaultProductCatalogJsonItem>;

export const defaultProductCatalogItems: DefaultProductCatalogItem[] = Object.entries(productCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => item);
