import {
	catalogType,
	catalogTypeCategory,
	catalogTypeEntity,
	catalogTypesFromTree,
	normalizedNullableText,
	normalizedSectionTexts,
	parseCatalogAliases,
	parseCatalogRegions,
	parseCatalogType,
	stringifyCatalogAliases,
	stringifyCatalogRegions,
	stringifyCatalogType,
	type CatalogEntityBase,
	type CatalogEntityOrigin,
	type CatalogTypeTuple
} from '$lib/domain/catalog/catalog-entity.js';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';

export const MANUFACTURER_TYPE_TREE = {
	manufacturer: {}
} as const;

export type ManufacturerTypeTree = typeof MANUFACTURER_TYPE_TREE;
export type ManufacturerTypeMain = keyof ManufacturerTypeTree;
export type ManufacturerTypeSubtype<TMain extends ManufacturerTypeMain> = never;
export type ManufacturerType = CatalogTypeTuple<ManufacturerTypeTree>;

export const MANUFACTURER_TYPES = catalogTypesFromTree(MANUFACTURER_TYPE_TREE);

export const manufacturerProfileSectionIds = ['about', 'portfolio', 'support', 'references'] as const;
export type ManufacturerProfileSectionId = (typeof manufacturerProfileSectionIds)[number];
export type ManufacturerProfileSections = Partial<Record<ManufacturerProfileSectionId, string>>;

export interface ManufacturerCatalogExtension {
	website: string | null;
	sections: ManufacturerProfileSections;
}

export interface ManufacturerCatalogItem extends CatalogEntityBase<ManufacturerType, ManufacturerCatalogExtension> {}

export const emptyManufacturerCatalogExtension: ManufacturerCatalogExtension = {
	website: null,
	sections: {}
};

export function manufacturerType<TMain extends ManufacturerTypeMain>(main: TMain, subtype: ManufacturerTypeSubtype<TMain> extends never ? null : ManufacturerTypeSubtype<TMain>): ManufacturerType {
	if (subtype !== null) throw new Error('catalog_type_invalid');
	return catalogType(MANUFACTURER_TYPE_TREE, main, null, null) as ManufacturerType;
}

export function manufacturerTypeOptions<TMain extends ManufacturerTypeMain>(main: TMain): readonly ManufacturerTypeSubtype<TMain>[] {
	return [];
}

export function manufacturerTypeMain(type: ManufacturerType): ManufacturerTypeMain {
	return catalogTypeEntity(type) as ManufacturerTypeMain;
}

export function manufacturerTypeSubtype<TMain extends ManufacturerTypeMain>(type: ManufacturerType): ManufacturerTypeSubtype<TMain> | null {
	return catalogTypeCategory(type) as ManufacturerTypeSubtype<TMain> | null;
}

export function parseManufacturerType(value: string): ManufacturerType {
	return parseCatalogType(value, MANUFACTURER_TYPE_TREE) as ManufacturerType;
}

export function stringifyManufacturerType(type: ManufacturerType): string {
	return stringifyCatalogType(type);
}

export function parseManufacturerAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyManufacturerAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseManufacturerRegions = parseCatalogRegions;
export const stringifyManufacturerRegions = stringifyCatalogRegions;

export function normalizeManufacturerCatalogExtension(value: unknown): ManufacturerCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyManufacturerCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		website: normalizedNullableText(source.website),
		sections: normalizedSectionTexts(source.sections, manufacturerProfileSectionIds)
	};
}

export function parseManufacturerCatalogExtension(value: string | null | undefined): ManufacturerCatalogExtension {
	if (!value) return { ...emptyManufacturerCatalogExtension, sections: {} };

	try {
		return normalizeManufacturerCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyManufacturerCatalogExtension, sections: {} };
	}
}

export function stringifyManufacturerCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeManufacturerCatalogExtension(value));
}

export function canEditManufacturerCatalogItem(item: Pick<ManufacturerCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return item.origin === 'user';
}

export function canDeleteManufacturerCatalogItem(item: Pick<ManufacturerCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return canEditManufacturerCatalogItem(item);
}
