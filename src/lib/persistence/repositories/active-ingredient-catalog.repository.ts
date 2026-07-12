import type { ImageCollectionItem, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import {
	parseActiveIngredientAliases,
	parseActiveIngredientCatalogExtension,
	parseActiveIngredientRegions,
	parseActiveIngredientType,
	type ActiveIngredientCatalogItem
} from '$lib/domain/active-ingredient/catalog.js';
import { getImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';

export const ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE = 'active_ingredient_catalog_item';
export const ACTIVE_INGREDIENT_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

function activeIngredientCatalogColumns(alias = 'active_ingredient_catalog_items'): string {
	return `${alias}.id AS id,
		${alias}.type AS type,
		${alias}.name AS name,
		${alias}.normalized_name AS normalized_name,
		${alias}.aliases AS aliases,
		${alias}.origin AS origin,
		${alias}.regions AS regions,
		${alias}.extension AS extension,
		${alias}.hidden_at AS hidden_at,
		${alias}.updated_at AS updated_at`;
}

interface ActiveIngredientCatalogItemRow {
	id: string;
	type: string;
	name: string;
	normalized_name: string;
	aliases: string;
	origin: 'system' | 'user';
	regions: string;
	extension: string;
	hidden_at: string | null;
	updated_at: string | null;
}

function primaryImage(images: ImageCollectionItem[]): ImageCollectionItem | null {
	return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

function mapActiveIngredientCatalogItem(row: ActiveIngredientCatalogItemRow, images: ImageCollectionItem[] = []): ActiveIngredientCatalogItem {
	return {
		id: row.id,
		type: parseActiveIngredientType(row.type),
		name: row.name,
		normalizedName: row.normalized_name,
		aliases: parseActiveIngredientAliases(row.aliases, row.normalized_name),
		images,
		primaryImage: primaryImage(images),
		origin: row.origin,
		regions: parseActiveIngredientRegions(row.regions),
		extension: parseActiveIngredientCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadActiveIngredientCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

async function mapActiveIngredientCatalogItemWithImages(row: ActiveIngredientCatalogItemRow): Promise<ActiveIngredientCatalogItem> {
	return mapActiveIngredientCatalogItem(row, await loadActiveIngredientCatalogImages(row.id));
}

export async function listActiveIngredientCatalogItems(includeHidden = false, includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	const rows = await selectMany<ActiveIngredientCatalogItemRow>(
		`SELECT ${activeIngredientCatalogColumns()}
		 FROM active_ingredient_catalog_items
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`
	);

	if (!includeImages) return rows.map((row) => mapActiveIngredientCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadActiveIngredientCatalogImages(row.id)));
	return rows.map((row, index) => mapActiveIngredientCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function getActiveIngredientCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ActiveIngredientCatalogItem | null> {
	const rows = await selectMany<ActiveIngredientCatalogItemRow>(
		`SELECT ${activeIngredientCatalogColumns()}
		 FROM active_ingredient_catalog_items
		 WHERE id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapActiveIngredientCatalogItemWithImages(row) : mapActiveIngredientCatalogItem(row);
}

export async function listActiveIngredientCatalogItemsByIds(ids: readonly string[], includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	if (ids.length === 0) return [];
	const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<ActiveIngredientCatalogItemRow>(
		`SELECT ${activeIngredientCatalogColumns()}
		 FROM active_ingredient_catalog_items
		 WHERE id IN (${placeholders})
		 ORDER BY name COLLATE NOCASE`,
		[...ids]
	);

	if (!includeImages) return rows.map((row) => mapActiveIngredientCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadActiveIngredientCatalogImages(row.id)));
	return rows.map((row, index) => mapActiveIngredientCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function listActiveIngredientCatalogItemsByProductId(productId: string, includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	const rows = await selectMany<ActiveIngredientCatalogItemRow>(
		`SELECT ${activeIngredientCatalogColumns('ingredient')}
		 FROM active_ingredient_catalog_items ingredient
		 INNER JOIN product_active_ingredients relation ON relation.active_ingredient_id = ingredient.id
		 WHERE relation.product_id = $1
		 ORDER BY relation.sort_order, ingredient.name COLLATE NOCASE`,
		[productId]
	);

	if (!includeImages) return rows.map((row) => mapActiveIngredientCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadActiveIngredientCatalogImages(row.id)));
	return rows.map((row, index) => mapActiveIngredientCatalogItem(row, imagesByIndex[index] ?? []));
}
