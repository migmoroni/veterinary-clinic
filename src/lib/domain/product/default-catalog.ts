import { productType, type ProductCatalogExtension, type ProductType, type ProductTypeSubtype } from '$lib/domain/product/catalog.js';

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
	origin: 'system';
	name: string;
	species: DefaultProductSpecies[];
	aliases: string[];
	manufacturer: string;
	images?: DefaultProductCatalogImage[];
	regions: string[];
	extension?: Partial<ProductCatalogExtension>;
}

type DefaultProductCatalogJsonItem = Omit<DefaultProductCatalogItem, 'type'>;

const vaccineCatalogModules = import.meta.glob('./defaults/medication/vaccine/*.json', { eager: true, import: 'default' }) as Record<string, DefaultProductCatalogJsonItem>;
const antiparasiticCatalogModules = import.meta.glob('./defaults/medication/antiparasitic/*.json', { eager: true, import: 'default' }) as Record<string, DefaultProductCatalogJsonItem>;

function withProductType(subtype: DefaultTreatmentProductSubtype, modules: Record<string, DefaultProductCatalogJsonItem>): DefaultProductCatalogItem[] {
	return Object.entries(modules)
		.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
		.map(([, item]) => ({ type: productType('medication', subtype), ...item }));
}

export const defaultProductCatalogItems: DefaultProductCatalogItem[] = [
	...withProductType('vaccine', vaccineCatalogModules),
	...withProductType('antiparasitic', antiparasiticCatalogModules)
];
