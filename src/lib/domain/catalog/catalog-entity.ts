import type { ImageCollectionItem } from '$lib/domain/image-collection/image-collection.js';
import { assertTextLimit } from '$lib/domain/shared/field-limits.js';

export type CatalogEntityOrigin = 'system' | 'user';
export type CatalogTypeTree = Record<string, readonly string[]>;
export type CatalogTypeTuple<TTree extends CatalogTypeTree = CatalogTypeTree> = {
	[Main in keyof TTree & string]: readonly [Main, TTree[Main][number] extends never ? null : TTree[Main][number]];
}[keyof TTree & string];

export interface CatalogEntityBase<TType extends readonly [string, string | null], TExtension> {
	id: string;
	type: TType;
	name: string;
	normalizedName: string;
	aliases: string[];
	images: ImageCollectionItem[];
	primaryImage: ImageCollectionItem | null;
	origin: CatalogEntityOrigin;
	regions: string[];
	extension: TExtension;
	hiddenAt: string | null;
	updatedAt: string | null;
}

export function catalogTypesFromTree<TTree extends CatalogTypeTree>(tree: TTree): CatalogTypeTuple<TTree>[] {
	const types: CatalogTypeTuple<TTree>[] = [];

	for (const main of Object.keys(tree) as Array<keyof TTree & string>) {
		const subtypes = tree[main] as readonly string[];
		if (subtypes.length === 0) {
			types.push([main, null] as unknown as CatalogTypeTuple<TTree>);
			continue;
		}

		for (const subtype of subtypes) {
			types.push([main, subtype] as unknown as CatalogTypeTuple<TTree>);
		}
	}

	return types;
}

export function catalogTypeOptions<TTree extends CatalogTypeTree, TMain extends keyof TTree & string>(tree: TTree, main: TMain): readonly TTree[TMain][number][] {
	return tree[main] as readonly TTree[TMain][number][];
}

export function catalogType<TTree extends CatalogTypeTree, TMain extends keyof TTree & string>(tree: TTree, main: TMain, subtype: TTree[TMain][number] extends never ? null : TTree[TMain][number]): CatalogTypeTuple<TTree> {
	const candidate = [main, subtype] as CatalogTypeTuple<TTree>;
	if (!isCatalogType(candidate, tree)) throw new Error('catalog_type_invalid');
	return candidate;
}

export function catalogTypeMain<TType extends readonly [string, string | null]>(type: TType): TType[0] {
	return type[0];
}

export function catalogTypeSubtype<TType extends readonly [string, string | null]>(type: TType): TType[1] {
	return type[1];
}

export function isCatalogType<TTree extends CatalogTypeTree>(value: unknown, tree: TTree): value is CatalogTypeTuple<TTree> {
	if (!Array.isArray(value) || value.length !== 2) return false;
	const [main, subtype] = value;
	if (typeof main !== 'string' || !(main in tree)) return false;

	const validSubtypes = tree[main] as readonly string[];
	return validSubtypes.length === 0 ? subtype === null : typeof subtype === 'string' && validSubtypes.includes(subtype);
}

export function parseCatalogType<TTree extends CatalogTypeTree>(value: string, tree: TTree): CatalogTypeTuple<TTree> {
	const parsed = JSON.parse(value);
	if (!isCatalogType(parsed, tree)) throw new Error('catalog_type_invalid');
	return parsed;
}

export function stringifyCatalogType(type: readonly [string, string | null]): string {
	return JSON.stringify(type);
}

export function normalizeCatalogRegions(values: readonly string[] | null | undefined): string[] {
	const regions: string[] = [];

	for (const value of values ?? []) {
		const candidate = value.trim().toUpperCase();
		if (!/^[A-Z]{3}$/.test(candidate) || regions.includes(candidate)) continue;
		regions.push(candidate);
	}

	return regions;
}

export function parseCatalogRegions(value: string | null | undefined): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeCatalogRegions(parsed.filter((item): item is string => typeof item === 'string')) : [];
	} catch {
		return [];
	}
}

export function stringifyCatalogRegions(values: readonly string[] | null | undefined): string {
	return JSON.stringify(normalizeCatalogRegions(values));
}

export function normalizeCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
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

export function parseCatalogAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeCatalogAliases(parsed.filter((item): item is string => typeof item === 'string'), maxLength, normalize, canonicalNormalizedName) : [];
	} catch {
		return [];
	}
}

export function stringifyCatalogAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return JSON.stringify(normalizeCatalogAliases(values, maxLength, normalize, canonicalNormalizedName));
}

export function normalizedNullableText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

export function normalizedSectionTexts<TSectionId extends string>(value: unknown, sectionIds: readonly TSectionId[]): Partial<Record<TSectionId, string>> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const source = value as Record<string, unknown>;
	const sections: Partial<Record<TSectionId, string>> = {};

	for (const sectionId of sectionIds) {
		const text = normalizedNullableText(source[sectionId]);
		if (text) sections[sectionId] = text;
	}

	return sections;
}
