import { activeIngredientType, type ActiveIngredientCatalogExtension, type ActiveIngredientType, type ActiveIngredientTypeSubtype } from '$lib/domain/active-ingredient/catalog.js';

export interface DefaultActiveIngredientCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultActiveIngredientCatalogItem {
	id: string;
	type: ActiveIngredientType;
	origin: 'system';
	name: string;
	aliases: string[];
	images?: DefaultActiveIngredientCatalogImage[];
	regions: string[];
	extension?: Partial<ActiveIngredientCatalogExtension>;
}

type DefaultActiveIngredientCatalogJsonItem = Omit<DefaultActiveIngredientCatalogItem, 'type'> & {
	subtype?: ActiveIngredientTypeSubtype<'activeIngredient'>;
};

const activeIngredientCatalogModules = import.meta.glob('./defaults/*.json', { eager: true, import: 'default' }) as Record<string, DefaultActiveIngredientCatalogJsonItem>;

export const defaultActiveIngredientCatalogItems: DefaultActiveIngredientCatalogItem[] = Object.entries(activeIngredientCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => {
		const { subtype = 'substance', ...rest } = item;
		return { type: activeIngredientType('activeIngredient', subtype), ...rest };
	});
