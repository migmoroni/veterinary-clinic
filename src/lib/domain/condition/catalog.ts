import {
	catalogType,
	catalogTypeCategory,
	catalogTypeEntity,
	catalogTypeCategories,
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

export const CONDITION_TYPE_TREE = {
	condition: {
		disease: [],
		syndrome: [],
		disorder: [],
		injury: []
	}
} as const;

export type ConditionTypeTree = typeof CONDITION_TYPE_TREE;
export type ConditionTypeMain = keyof ConditionTypeTree;
export type ConditionTypeSubtype<TMain extends ConditionTypeMain> = keyof ConditionTypeTree[TMain] & string;
export type ConditionType = CatalogTypeTuple<ConditionTypeTree>;
export type ConditionCatalogOrigin = CatalogEntityOrigin;

export const CONDITION_TYPES = catalogTypesFromTree(CONDITION_TYPE_TREE);

export const conditionProfileSectionIds = ['about', 'clinicalSigns', 'diagnosis', 'management', 'prevention', 'references'] as const;
export type ConditionProfileSectionId = (typeof conditionProfileSectionIds)[number];
export type ConditionProfileSections = Partial<Record<ConditionProfileSectionId, string>>;

export interface ConditionCatalogExtension {
	classification: string | null;
	sections: ConditionProfileSections;
}

export interface ConditionCatalogItem extends CatalogEntityBase<ConditionType, ConditionCatalogExtension> {}

export const emptyConditionCatalogExtension: ConditionCatalogExtension = {
	classification: null,
	sections: {}
};

export function conditionType<TMain extends ConditionTypeMain>(main: TMain, subtype: ConditionTypeSubtype<TMain> extends never ? null : ConditionTypeSubtype<TMain>): ConditionType {
	return catalogType(CONDITION_TYPE_TREE, main, subtype, null) as ConditionType;
}

export function conditionTypeOptions<TMain extends ConditionTypeMain>(main: TMain): readonly ConditionTypeSubtype<TMain>[] {
	return catalogTypeCategories(CONDITION_TYPE_TREE, main) as readonly ConditionTypeSubtype<TMain>[];
}

export function conditionTypeMain(type: ConditionType): ConditionTypeMain {
	return catalogTypeEntity(type) as ConditionTypeMain;
}

export function conditionTypeSubtype<TMain extends ConditionTypeMain>(type: ConditionType): ConditionTypeSubtype<TMain> | null {
	return catalogTypeCategory(type) as ConditionTypeSubtype<TMain> | null;
}

export function parseConditionType(value: string): ConditionType {
	return parseCatalogType(value, CONDITION_TYPE_TREE) as ConditionType;
}

export function stringifyConditionType(type: ConditionType): string {
	return stringifyCatalogType(type);
}

export function parseConditionAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyConditionAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseConditionRegions = parseCatalogRegions;
export const stringifyConditionRegions = stringifyCatalogRegions;

export function normalizeConditionCatalogExtension(value: unknown): ConditionCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyConditionCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizedNullableText(source.classification),
		sections: normalizedSectionTexts(source.sections, conditionProfileSectionIds)
	};
}

export function parseConditionCatalogExtension(value: string | null | undefined): ConditionCatalogExtension {
	if (!value) return { ...emptyConditionCatalogExtension, sections: {} };

	try {
		return normalizeConditionCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyConditionCatalogExtension, sections: {} };
	}
}

export function stringifyConditionCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeConditionCatalogExtension(value));
}

export function canEditConditionCatalogItem(item: Pick<ConditionCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return item.origin === 'user';
}

export function canDeleteConditionCatalogItem(item: Pick<ConditionCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return canEditConditionCatalogItem(item);
}
