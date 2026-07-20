import type { ImageCollectionItem } from '$lib/domain/image-collection/image-collection.js';
import { assertTextLimit } from '$lib/domain/shared/field-limits.js';

export type CatalogTypeBranch = Record<string, readonly string[] | Record<string, readonly string[]>>;
export type CatalogTypeTree = Record<string, CatalogTypeBranch>;
export type CatalogTypeTuple<TTree extends CatalogTypeTree = CatalogTypeTree> = {
	[Entity in keyof TTree & string]: keyof TTree[Entity] extends never
		? readonly [Entity, null, null]
		: {
				[Category in keyof TTree[Entity] & string]: TTree[Entity][Category] extends readonly string[]
					? TTree[Entity][Category][number] extends never
						? readonly [Entity, Category, null]
						: readonly [Entity, Category, TTree[Entity][Category][number]] | readonly [Entity, Category, null]
					: TTree[Entity][Category] extends Record<string, readonly string[]>
						? {
								[Subcategory in keyof TTree[Entity][Category] & string]: TTree[Entity][Category][Subcategory][number] extends never
									? readonly [Entity, Category, Subcategory, null]
									: readonly [Entity, Category, Subcategory, TTree[Entity][Category][Subcategory][number]] | readonly [Entity, Category, Subcategory, null];
							}[keyof TTree[Entity][Category] & string] | readonly [Entity, Category, null, null]
						: never;
			}[keyof TTree[Entity] & string];
}[keyof TTree & string];

export interface CatalogEntityBase<TType extends readonly [string, ...(string | null)[]], TExtension> {
	id: string;
	type: TType;
	name: string;
	normalizedName: string;
	aliases: string[];
	images: ImageCollectionItem[];
	primaryImage: ImageCollectionItem | null;
	regions: string[];
	extension: TExtension;
	hiddenAt: string | null;
	updatedAt: string | null;
}

export function catalogTypesFromTree<TTree extends CatalogTypeTree>(tree: TTree): CatalogTypeTuple<TTree>[] {
	const types: CatalogTypeTuple<TTree>[] = [];

	for (const entity of Object.keys(tree) as Array<keyof TTree & string>) {
		const categories = tree[entity];
		const categoryNames = Object.keys(categories) as Array<keyof typeof categories & string>;
		if (categoryNames.length === 0) {
			types.push([entity, null, null] as unknown as CatalogTypeTuple<TTree>);
			continue;
		}

		for (const category of categoryNames) {
			const categoryNode = categories[category];
			if (Array.isArray(categoryNode)) {
				types.push([entity, category, null] as unknown as CatalogTypeTuple<TTree>);
				if (categoryNode.length === 0) {
					continue;
				}

				for (const subcategory of categoryNode) {
					types.push([entity, category, subcategory] as unknown as CatalogTypeTuple<TTree>);
				}
				continue;
			}

			const subcategoryNames = Object.keys(categoryNode) as Array<keyof typeof categoryNode & string>;
			types.push([entity, category, null, null] as unknown as CatalogTypeTuple<TTree>);
			if (subcategoryNames.length === 0) {
				continue;
			}

			for (const subcategory of subcategoryNames) {
				const details = categoryNode[subcategory] as readonly string[];
				types.push([entity, category, subcategory, null] as unknown as CatalogTypeTuple<TTree>);
				if (details.length === 0) {
					continue;
				}

				for (const detail of details) {
					types.push([entity, category, subcategory, detail] as unknown as CatalogTypeTuple<TTree>);
				}
			}
		}
	}

	return types;
}

export function catalogTypeCategories<TTree extends CatalogTypeTree, TEntity extends keyof TTree & string>(tree: TTree, entity: TEntity): readonly (keyof TTree[TEntity] & string)[] {
	return Object.keys(tree[entity]) as Array<keyof TTree[TEntity] & string>;
}

export function catalogTypeSubcategoryOptions<TTree extends CatalogTypeTree, TEntity extends keyof TTree & string, TCategory extends keyof TTree[TEntity] & string>(tree: TTree, entity: TEntity, category: TCategory): readonly string[] {
	const node = tree[entity][category];
	return Array.isArray(node) ? node : Object.keys(node);
}

export function catalogTypeDetailOptions<TTree extends CatalogTypeTree, TEntity extends keyof TTree & string, TCategory extends keyof TTree[TEntity] & string>(
	tree: TTree,
	entity: TEntity,
	category: TCategory,
	subcategory: string
): readonly string[] {
	const node = tree[entity][category];
	if (Array.isArray(node) || !(subcategory in node)) return [];
	const recordNode = node as Record<string, readonly string[]>;
	return recordNode[subcategory] ?? [];
}

export function catalogType<TTree extends CatalogTypeTree>(tree: TTree, entity: keyof TTree & string, category: string | null, subcategory: string | null, detail?: string | null): CatalogTypeTuple<TTree> {
	const candidate = detail === undefined ? [entity, category, subcategory] : [entity, category, subcategory, detail];
	if (!isCatalogType(candidate, tree)) throw new Error('catalog_type_invalid');
	return candidate as CatalogTypeTuple<TTree>;
}

export function catalogTypeEntity<TType extends readonly [string, ...(string | null)[]]>(type: TType): TType[0] {
	return type[0];
}

export function catalogTypeCategory<TType extends readonly [string, ...(string | null)[]]>(type: TType): TType[1] {
	return type[1];
}

export function catalogTypeSubcategory<TType extends readonly [string, ...(string | null)[]]>(type: TType): TType[2] {
	return type[2];
}

export function catalogTypeDetail<TType extends readonly [string, ...(string | null)[]]>(type: TType): TType[3] | null {
	return (type[3] ?? null) as TType[3] | null;
}

export function isCatalogType<TTree extends CatalogTypeTree>(value: unknown, tree: TTree): value is CatalogTypeTuple<TTree> {
	if (!Array.isArray(value) || (value.length !== 3 && value.length !== 4)) return false;
	const [entity, category, subcategory, detail] = value;
	if (typeof entity !== 'string' || !(entity in tree)) return false;

	const categories = tree[entity];
	if (Object.keys(categories).length === 0) return value.length === 3 && category === null && subcategory === null;
	if (category === null) return value.slice(1).every((item) => item === null);
	if (typeof category !== 'string' || !(category in categories)) return false;

	const categoryNode = categories[category];
	if (Array.isArray(categoryNode)) {
		if (value.length !== 3) return false;
		if (subcategory === null) return true;
		return typeof subcategory === 'string' && categoryNode.includes(subcategory);
	}

	if (value.length !== 4) return false;
	if (subcategory === null) return detail === null;
	if (typeof subcategory !== 'string' || !(subcategory in categoryNode)) return false;
	if (detail === null) return true;
	const details = (categoryNode as Record<string, readonly string[]>)[subcategory] ?? [];
	return typeof detail === 'string' && details.includes(detail);
}

export function parseCatalogType<TTree extends CatalogTypeTree>(value: string, tree: TTree): CatalogTypeTuple<TTree> {
	const parsed = JSON.parse(value);
	if (!isCatalogType(parsed, tree)) throw new Error('catalog_type_invalid');
	return parsed;
}

export function stringifyCatalogType(type: readonly [string, ...(string | null)[]]): string {
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
