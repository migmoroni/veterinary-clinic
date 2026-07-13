import {
	catalogType,
	catalogTypeMain,
	catalogTypeOptions,
	catalogTypeSubtype,
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

export const ACTIVE_INGREDIENT_TYPE_TREE = {
	activeIngredient: ['substance', 'combination']
} as const;

export type ActiveIngredientTypeTree = typeof ACTIVE_INGREDIENT_TYPE_TREE;
export type ActiveIngredientTypeMain = keyof ActiveIngredientTypeTree;
export type ActiveIngredientTypeSubtype<TMain extends ActiveIngredientTypeMain> = ActiveIngredientTypeTree[TMain][number];
export type ActiveIngredientType = CatalogTypeTuple<ActiveIngredientTypeTree>;

export const ACTIVE_INGREDIENT_TYPES = catalogTypesFromTree(ACTIVE_INGREDIENT_TYPE_TREE);

export const activeIngredientProfileSectionIds = ['about', 'uses', 'safety', 'references'] as const;
export type ActiveIngredientProfileSectionId = (typeof activeIngredientProfileSectionIds)[number];
export type ActiveIngredientProfileSections = Partial<Record<ActiveIngredientProfileSectionId, string>>;

export interface ActiveIngredientCatalogExtension {
	classification: string | null;
	sections: ActiveIngredientProfileSections;
}

export interface ActiveIngredientCatalogItem extends CatalogEntityBase<ActiveIngredientType, ActiveIngredientCatalogExtension> {}

export const emptyActiveIngredientCatalogExtension: ActiveIngredientCatalogExtension = {
	classification: null,
	sections: {}
};

export function activeIngredientType<TMain extends ActiveIngredientTypeMain>(main: TMain, subtype: ActiveIngredientTypeSubtype<TMain> extends never ? null : ActiveIngredientTypeSubtype<TMain>): ActiveIngredientType {
	return catalogType(ACTIVE_INGREDIENT_TYPE_TREE, main, subtype) as ActiveIngredientType;
}

export function activeIngredientTypeOptions<TMain extends ActiveIngredientTypeMain>(main: TMain): readonly ActiveIngredientTypeSubtype<TMain>[] {
	return catalogTypeOptions(ACTIVE_INGREDIENT_TYPE_TREE, main);
}

export function activeIngredientTypeMain(type: ActiveIngredientType): ActiveIngredientTypeMain {
	return catalogTypeMain(type) as ActiveIngredientTypeMain;
}

export function activeIngredientTypeSubtype<TMain extends ActiveIngredientTypeMain>(type: ActiveIngredientType): ActiveIngredientTypeSubtype<TMain> | null {
	return catalogTypeSubtype(type) as ActiveIngredientTypeSubtype<TMain> | null;
}

export function parseActiveIngredientType(value: string): ActiveIngredientType {
	return parseCatalogType(value, ACTIVE_INGREDIENT_TYPE_TREE) as ActiveIngredientType;
}

export function stringifyActiveIngredientType(type: ActiveIngredientType): string {
	return stringifyCatalogType(type);
}

export function parseActiveIngredientAliases(value: string | null | undefined, canonicalNormalizedName = ''): string[] {
	return parseCatalogAliases(value, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export function stringifyActiveIngredientAliases(values: readonly string[] | null | undefined, canonicalNormalizedName = ''): string {
	return stringifyCatalogAliases(values, FIELD_LIMITS.catalogAlias, normalizeTreatmentName, canonicalNormalizedName);
}

export const parseActiveIngredientRegions = parseCatalogRegions;
export const stringifyActiveIngredientRegions = stringifyCatalogRegions;

export function normalizeActiveIngredientCatalogExtension(value: unknown): ActiveIngredientCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyActiveIngredientCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizedNullableText(source.classification),
		sections: normalizedSectionTexts(source.sections, activeIngredientProfileSectionIds)
	};
}

export function parseActiveIngredientCatalogExtension(value: string | null | undefined): ActiveIngredientCatalogExtension {
	if (!value) return { ...emptyActiveIngredientCatalogExtension, sections: {} };

	try {
		return normalizeActiveIngredientCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyActiveIngredientCatalogExtension, sections: {} };
	}
}

export function stringifyActiveIngredientCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeActiveIngredientCatalogExtension(value));
}

export function canEditActiveIngredientCatalogItem(item: Pick<ActiveIngredientCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return item.origin === 'user';
}

export function canDeleteActiveIngredientCatalogItem(item: Pick<ActiveIngredientCatalogItem, 'origin'> | { origin: CatalogEntityOrigin }): boolean {
	return canEditActiveIngredientCatalogItem(item);
}
