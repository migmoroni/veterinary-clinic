import type { ImageCollectionItem, ImageCollectionPolicy } from '@vet/types/domain/image-collection/image-collection.js';
import { parseConditionAliases, parseConditionCatalogExtension, parseConditionRegions, parseConditionType, type ConditionCatalogItem } from '@vet/types/domain/condition/catalog.js';
import { getImageCollection } from '@vet/modules/core_repositories/image-collection.repository.js';
import { selectSystemMany } from '@vet/core-local/sqlite/client.js';

export const CONDITION_CATALOG_IMAGE_COLLECTION_TYPE = 'condition_catalog_item';
export const CONDITION_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const CONDITION_CATALOG_COLUMNS = 'id, type, name, normalized_name, aliases, regions, extension, hidden_at, NULL AS updated_at';

interface ConditionCatalogItemRow {
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

function mapConditionCatalogItem(row: ConditionCatalogItemRow, images: ImageCollectionItem[] = []): ConditionCatalogItem {
	return {
		id: row.id,
		type: parseConditionType(row.type),
		name: row.name,
		normalizedName: row.normalized_name,
		aliases: parseConditionAliases(row.aliases, row.normalized_name),
		images,
		primaryImage: primaryImage(images),
		regions: parseConditionRegions(row.regions),
		extension: parseConditionCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadConditionCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(CONDITION_CATALOG_IMAGE_COLLECTION_TYPE, id, 'system');
	return collection?.items ?? [];
}

async function mapConditionCatalogItemWithImages(row: ConditionCatalogItemRow): Promise<ConditionCatalogItem> {
	return mapConditionCatalogItem(row, await loadConditionCatalogImages(row.id));
}

export async function listConditionCatalogItems(includeHidden = false, includeImages = true): Promise<ConditionCatalogItem[]> {
	const where = includeHidden ? '1 = 1' : 'hidden_at IS NULL';
	const rows = (
		await selectSystemMany<ConditionCatalogItemRow>(
			`SELECT ${CONDITION_CATALOG_COLUMNS}
			 FROM condition_catalog_items
			 WHERE ${where}`
		)
	).sort((first, second) => first.name.localeCompare(second.name));

	if (!includeImages) return rows.map((row) => mapConditionCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadConditionCatalogImages(row.id)));
	return rows.map((row, index) => mapConditionCatalogItem(row, imagesByIndex[index] ?? []));
}

async function selectConditionCatalogItemById(id: string, includeHidden = false): Promise<ConditionCatalogItemRow | null> {
	const where = `id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}`;
	const referenceRows = await selectSystemMany<ConditionCatalogItemRow>(
		`SELECT ${CONDITION_CATALOG_COLUMNS}
		 FROM condition_catalog_items
		 WHERE ${where}
		 LIMIT 1`,
		[id]
	);
	return referenceRows[0] ?? null;
}

export async function getConditionCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ConditionCatalogItem | null> {
	const row = await selectConditionCatalogItemById(id, includeHidden);
	if (!row) return null;
	return includeImages ? mapConditionCatalogItemWithImages(row) : mapConditionCatalogItem(row);
}
