import type { ConditionCatalogExtension, ConditionType } from '$lib/domain/condition/catalog.js';

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

type DefaultConditionCatalogJsonItem = DefaultConditionCatalogItem;

const conditionCatalogModules = import.meta.glob('../../catalog/defaults/conditions/**/*.json', { eager: true, import: 'default' }) as Record<string, DefaultConditionCatalogJsonItem>;

export const defaultConditionCatalogItems: DefaultConditionCatalogItem[] = Object.entries(conditionCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => item);
