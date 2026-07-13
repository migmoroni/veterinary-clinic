import type { ManufacturerCatalogExtension, ManufacturerType } from '$lib/domain/manufacturer/catalog.js';

export interface DefaultManufacturerCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

export interface DefaultManufacturerCatalogItem {
	id: string;
	type: ManufacturerType;
	origin: 'system';
	name: string;
	aliases: string[];
	images?: DefaultManufacturerCatalogImage[];
	regions: string[];
	extension?: Partial<ManufacturerCatalogExtension>;
}

type DefaultManufacturerCatalogJsonItem = DefaultManufacturerCatalogItem;

const manufacturerCatalogModules = import.meta.glob('../../catalog/defaults/manufacturers/**/*.json', { eager: true, import: 'default' }) as Record<string, DefaultManufacturerCatalogJsonItem>;

export const defaultManufacturerCatalogItems: DefaultManufacturerCatalogItem[] = Object.entries(manufacturerCatalogModules)
	.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
	.map(([, item]) => item);
