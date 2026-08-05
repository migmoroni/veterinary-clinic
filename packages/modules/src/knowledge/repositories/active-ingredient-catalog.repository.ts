import type { ImageCollectionItem, ImageCollectionPolicy } from '@vet/types/domain/image-collection/image-collection.js';
import {
	parseActiveIngredientAliases,
	parseActiveIngredientCatalogExtension,
	parseActiveIngredientRegions,
	parseActiveIngredientType,
	type ActiveIngredientCatalogItem
} from '@vet/types/domain/active-ingredient/catalog.js';
import { getImageCollection } from '@vet/modules/core_repositories/image-collection.repository.js';
import { selectSystemMany } from '@vet/core-local/sqlite/client.js';

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
		${alias}.regions AS regions,
		${alias}.extension AS extension,
		${alias}.hidden_at AS hidden_at,
		NULL AS updated_at`;
}

interface ActiveIngredientCatalogItemRow {
	id: string;
	type: string;
	name: string;
	normalized_name: string;
	aliases: string;
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
		regions: parseActiveIngredientRegions(row.regions),
		extension: parseActiveIngredientCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadActiveIngredientCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE, id, 'system');
	return collection?.items ?? [];
}

async function mapActiveIngredientCatalogItemWithImages(row: ActiveIngredientCatalogItemRow): Promise<ActiveIngredientCatalogItem> {
	return mapActiveIngredientCatalogItem(row, await loadActiveIngredientCatalogImages(row.id));
}

export async function listActiveIngredientCatalogItems(includeHidden = false, includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	const where = includeHidden ? '1 = 1' : 'hidden_at IS NULL';
	const rows = (
		await selectSystemMany<ActiveIngredientCatalogItemRow>(
			`SELECT ${activeIngredientCatalogColumns()}
			 FROM active_ingredient_catalog_items
			 WHERE ${where}`
		)
	).sort((first, second) => first.name.localeCompare(second.name));

	if (!includeImages) return rows.map((row) => mapActiveIngredientCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadActiveIngredientCatalogImages(row.id)));
	return rows.map((row, index) => mapActiveIngredientCatalogItem(row, imagesByIndex[index] ?? []));
}

async function selectActiveIngredientCatalogRowsByIds(ids: readonly string[], includeHidden = true): Promise<ActiveIngredientCatalogItemRow[]> {
	if (ids.length === 0) return [];
	const uniqueIds = [...new Set(ids)];
	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const where = `id IN (${placeholders}) AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}`;
	return selectSystemMany<ActiveIngredientCatalogItemRow>(
		`SELECT ${activeIngredientCatalogColumns()}
		 FROM active_ingredient_catalog_items
		 WHERE ${where}`,
		uniqueIds
	);
}

export async function getActiveIngredientCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ActiveIngredientCatalogItem | null> {
	const row = (await selectActiveIngredientCatalogRowsByIds([id], includeHidden))[0];
	if (!row) return null;
	return includeImages ? mapActiveIngredientCatalogItemWithImages(row) : mapActiveIngredientCatalogItem(row);
}

export async function listActiveIngredientCatalogItemsByIds(ids: readonly string[], includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	const rowsById = new Map((await selectActiveIngredientCatalogRowsByIds(ids)).map((row) => [row.id, row]));
	const rows = [...new Set(ids)].map((id) => rowsById.get(id)).filter((row): row is ActiveIngredientCatalogItemRow => Boolean(row));

	if (!includeImages) return rows.map((row) => mapActiveIngredientCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadActiveIngredientCatalogImages(row.id)));
	return rows.map((row, index) => mapActiveIngredientCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function listActiveIngredientCatalogItemsByProductId(productId: string, includeImages = true): Promise<ActiveIngredientCatalogItem[]> {
	const relationRows = (
		await selectSystemMany<{ active_ingredient_id: string; sort_order: number }>(
			`SELECT active_ingredient_id, sort_order
			 FROM product_active_ingredients
			 WHERE product_id = $1`,
			[productId]
		)
	).sort((first, second) => first.sort_order - second.sort_order || first.active_ingredient_id.localeCompare(second.active_ingredient_id));
	const items = await listActiveIngredientCatalogItemsByIds(
		relationRows.map((row) => row.active_ingredient_id),
		includeImages
	);
	const itemById = new Map(items.map((item) => [item.id, item]));
	return relationRows.map((row) => itemById.get(row.active_ingredient_id)).filter((item): item is ActiveIngredientCatalogItem => Boolean(item));
}
