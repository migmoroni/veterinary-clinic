import { conditionType, type ConditionCatalogExtension, type ConditionType, type ConditionTypeSubtype } from '$lib/domain/condition/catalog.js';

export interface DefaultConditionCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultConditionCatalogItem {
	id: string;
	type: ConditionType;
	origin: 'system';
	name: string;
	aliases: string[];
	images?: DefaultConditionCatalogImage[];
	regions: string[];
	extension?: Partial<ConditionCatalogExtension>;
}

type DefaultConditionCatalogJsonItem = Omit<DefaultConditionCatalogItem, 'type'> & {
	subtype?: ConditionTypeSubtype<'condition'>;
};

const conditionCatalogModules = import.meta.glob('./defaults/*.json', { eager: true, import: 'default' }) as Record<string, DefaultConditionCatalogJsonItem>;

export const defaultConditionCatalogItems: DefaultConditionCatalogItem[] = Object.entries(conditionCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => {
		const { subtype = 'disease', ...rest } = item;
		return { type: conditionType('condition', subtype), ...rest };
	});
