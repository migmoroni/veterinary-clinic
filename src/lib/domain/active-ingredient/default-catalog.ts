import type { ActiveIngredientCatalogExtension, ActiveIngredientType } from '$lib/domain/active-ingredient/catalog.js';

export interface DefaultActiveIngredientCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultActiveIngredientCatalogItem {
	id: string;
	type: ActiveIngredientType;
	name: string;
	aliases: string[];
	images?: DefaultActiveIngredientCatalogImage[];
	regions: string[];
	extension?: Partial<ActiveIngredientCatalogExtension>;
}

type DefaultActiveIngredientCatalogJsonItem = DefaultActiveIngredientCatalogItem;

const activeIngredientCatalogModules = import.meta.glob('../../catalog/defaults/active-ingredients/**/*.json', { eager: true, import: 'default' }) as Record<string, DefaultActiveIngredientCatalogJsonItem>;

export const defaultActiveIngredientCatalogItems: DefaultActiveIngredientCatalogItem[] = Object.entries(activeIngredientCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => item);
