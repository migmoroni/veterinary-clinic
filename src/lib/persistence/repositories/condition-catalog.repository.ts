import type { ImageCollectionItem, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import { parseConditionAliases, parseConditionCatalogExtension, parseConditionRegions, parseConditionType, type ConditionCatalogItem } from '$lib/domain/condition/catalog.js';
import { getImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';

export const CONDITION_CATALOG_IMAGE_COLLECTION_TYPE = 'condition_catalog_item';
export const CONDITION_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const CONDITION_CATALOG_COLUMNS = 'id, type, name, normalized_name, aliases, origin, regions, extension, hidden_at, updated_at';

interface ConditionCatalogItemRow {
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

function mapConditionCatalogItem(row: ConditionCatalogItemRow, images: ImageCollectionItem[] = []): ConditionCatalogItem {
	return {
		id: row.id,
		type: parseConditionType(row.type),
		name: row.name,
		normalizedName: row.normalized_name,
		aliases: parseConditionAliases(row.aliases, row.normalized_name),
		images,
		primaryImage: primaryImage(images),
		origin: row.origin,
		regions: parseConditionRegions(row.regions),
		extension: parseConditionCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadConditionCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(CONDITION_CATALOG_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

async function mapConditionCatalogItemWithImages(row: ConditionCatalogItemRow): Promise<ConditionCatalogItem> {
	return mapConditionCatalogItem(row, await loadConditionCatalogImages(row.id));
}

export async function listConditionCatalogItems(includeHidden = false, includeImages = true): Promise<ConditionCatalogItem[]> {
	const rows = await selectMany<ConditionCatalogItemRow>(
		`SELECT ${CONDITION_CATALOG_COLUMNS}
		 FROM condition_catalog_items
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`
	);

	if (!includeImages) return rows.map((row) => mapConditionCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadConditionCatalogImages(row.id)));
	return rows.map((row, index) => mapConditionCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function getConditionCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ConditionCatalogItem | null> {
	const rows = await selectMany<ConditionCatalogItemRow>(
		`SELECT ${CONDITION_CATALOG_COLUMNS}
		 FROM condition_catalog_items
		 WHERE id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapConditionCatalogItemWithImages(row) : mapConditionCatalogItem(row);
}
