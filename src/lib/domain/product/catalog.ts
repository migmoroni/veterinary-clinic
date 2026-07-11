import { assertTextLimit } from '$lib/domain/shared/field-limits.js';
import { defaultTreatmentSpecies, isTreatmentSpecies, normalizeTreatmentSpecies, parseTreatmentSpecies, stringifyTreatmentSpecies, type TreatmentSpecies } from '$lib/domain/treatment/species.js';

export const PRODUCT_TYPE_TREE = {
	medication: ['vaccine', 'antiparasitic'],
	nutrition: [],
	hygiene: [],
	disinfectants: []
} as const;

export type ProductTypeTree = typeof PRODUCT_TYPE_TREE;
export type ProductTypeMain = keyof ProductTypeTree;
export type ProductTypeSubtype<TMain extends ProductTypeMain> = ProductTypeTree[TMain][number];
export type ProductTypeTuple<TMain extends ProductTypeMain = ProductTypeMain> = {
	[Main in TMain]: readonly [Main, ProductTypeSubtype<Main> extends never ? null : ProductTypeSubtype<Main>];
}[TMain];
export type ProductType = ProductTypeTuple;
export type ProductSpecies = TreatmentSpecies;
export type ProductCatalogOrigin = 'system' | 'user';

function productTypesFromTree(): ProductType[] {
	const types: ProductType[] = [];

	for (const main of Object.keys(PRODUCT_TYPE_TREE) as ProductTypeMain[]) {
		const subtypes = PRODUCT_TYPE_TREE[main] as readonly string[];
		if (subtypes.length === 0) {
			types.push([main, null] as ProductType);
			continue;
		}

		for (const subtype of subtypes) {
			types.push([main, subtype] as ProductType);
		}
	}

	return types;
}

export const PRODUCT_TYPES = productTypesFromTree();

export function productTypeOptions<TMain extends ProductTypeMain>(main: TMain): readonly ProductTypeSubtype<TMain>[] {
	return PRODUCT_TYPE_TREE[main];
}

export function productType<TMain extends ProductTypeMain>(main: TMain, subtype: ProductTypeSubtype<TMain> extends never ? null : ProductTypeSubtype<TMain>): ProductTypeTuple<TMain> {
	return [main, subtype] as ProductTypeTuple<TMain>;
}

export function productTypeMain(type: ProductType): ProductTypeMain {
	return type[0];
}

export function productTypeSubtype<TMain extends ProductTypeMain>(type: ProductTypeTuple<TMain>): ProductTypeTuple<TMain>[1] {
	return type[1];
}

export function isProductType(value: unknown): value is ProductType {
	if (!Array.isArray(value) || value.length !== 2) return false;
	const [main, subtype] = value;
	if (typeof main !== 'string' || !(main in PRODUCT_TYPE_TREE)) return false;

	const validSubtypes = PRODUCT_TYPE_TREE[main as ProductTypeMain];
	return validSubtypes.length === 0 ? subtype === null : typeof subtype === 'string' && (validSubtypes as readonly string[]).includes(subtype);
}

export function parseProductType(value: string): ProductType {
	const parsed = JSON.parse(value);
	if (!isProductType(parsed)) throw new Error('product_type_invalid');
	return parsed;
}

export function stringifyProductType(type: ProductType): string {
	return JSON.stringify(type);
}

export const productLeafletSectionIds = [
	'about',
	'presentations',
	'indications',
	'administration',
	'interactions',
	'pharmacology',
	'studies',
	'videos',
	'distributors',
	'references'
] as const;

export type ProductLeafletSectionId = (typeof productLeafletSectionIds)[number];

export type ProductLeafletSections = Partial<Record<ProductLeafletSectionId, string>>;

export interface ProductCatalogExtension {
	classification: string | null;
	commercialLine: string | null;
	sections: ProductLeafletSections;
}

export const defaultProductSpecies = [...defaultTreatmentSpecies];
export const emptyProductCatalogExtension: ProductCatalogExtension = {
	classification: null,
	commercialLine: null,
	sections: {}
};

export interface ProductCatalogMetadata {
	type: ProductType;
	aliases: string[];
	manufacturer: string | null;
	origin: ProductCatalogOrigin;
	regions: string[];
	species: ProductSpecies[];
	extension: ProductCatalogExtension;
}

export function canEditProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return item.origin === 'user';
}

export function canDeleteProductCatalogItem(item: Pick<ProductCatalogMetadata, 'origin'>): boolean {
	return canEditProductCatalogItem(item);
}

export function normalizeProductSpecies(values: readonly string[] | null | undefined): ProductSpecies[] {
	return normalizeTreatmentSpecies(values);
}

export function parseProductSpecies(value: string | null | undefined): ProductSpecies[] {
	return parseTreatmentSpecies(value);
}

export function stringifyProductSpecies(values: readonly string[] | null | undefined): string {
	return stringifyTreatmentSpecies(values);
}

/**
 * Normalizes product markets as unique ISO 3166-1 alpha-3 country codes.
 */
export function normalizeProductRegions(values: readonly string[] | null | undefined): string[] {
	const regions: string[] = [];

	for (const value of values ?? []) {
		const candidate = value.trim().toUpperCase();
		if (!/^[A-Z]{3}$/.test(candidate) || regions.includes(candidate)) continue;
		regions.push(candidate);
	}

	return regions;
}

export function parseProductRegions(value: string | null | undefined): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeProductRegions(parsed.filter((item): item is string => typeof item === 'string')) : [];
	} catch {
		return [];
	}
}

export function stringifyProductRegions(values: readonly string[] | null | undefined): string {
	return JSON.stringify(normalizeProductRegions(values));
}

export function normalizeProductAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	const aliases: string[] = [];
	const seen = new Set<string>();

	for (const value of values ?? []) {
		const alias = value.trim();
		if (!alias) continue;
		assertTextLimit(alias, maxLength);

		const normalized = normalize(alias);
		if (!normalized || normalized === canonicalNormalizedName || seen.has(normalized)) continue;
		seen.add(normalized);
		aliases.push(alias);
	}

	return aliases;
}

export function parseProductAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeProductAliases(parsed.filter((item): item is string => typeof item === 'string'), maxLength, normalize, canonicalNormalizedName) : [];
	} catch {
		return [];
	}
}

export function stringifyProductAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return JSON.stringify(normalizeProductAliases(values, maxLength, normalize, canonicalNormalizedName));
}

export function productItemMatchesSpecies(species: readonly ProductSpecies[], petSpecies: string | null | undefined): boolean {
	if (!isTreatmentSpecies(petSpecies)) return true;
	return species.includes(petSpecies);
}

export function productItemMatchesSearch(name: string, aliases: readonly string[], query: string, normalize: (value: string) => string): boolean {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return true;
	if (normalize(name).includes(normalizedQuery)) return true;
	return aliases.some((alias) => normalize(alias).includes(normalizedQuery));
}

function normalizedNullableText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizedLeafletSections(value: unknown): ProductLeafletSections {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const source = value as Record<string, unknown>;
	const sections: ProductLeafletSections = {};

	for (const sectionId of productLeafletSectionIds) {
		const text = normalizedNullableText(source[sectionId]);
		if (text) sections[sectionId] = text;
	}

	return sections;
}

export function normalizeProductCatalogExtension(value: unknown): ProductCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizedNullableText(source.classification),
		commercialLine: normalizedNullableText(source.commercialLine),
		sections: normalizedLeafletSections(source.sections)
	};
}

export function parseProductCatalogExtension(value: string | null | undefined): ProductCatalogExtension {
	if (!value) return { ...emptyProductCatalogExtension, sections: {} };

	try {
		return normalizeProductCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyProductCatalogExtension, sections: {} };
	}
}

export function stringifyProductCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeProductCatalogExtension(value));
}
