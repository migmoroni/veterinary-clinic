import type { ImageCollectionItem, ImageCollectionPolicy } from '@vet/types/domain/image-collection/image-collection.js';
import {
	parseManufacturerAliases,
	parseManufacturerCatalogExtension,
	parseManufacturerRegions,
	parseManufacturerType,
	type ManufacturerCatalogItem
} from '@vet/types/domain/manufacturer/catalog.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '@vet/types/domain/shared/field-limits.js';
import { normalizeTreatmentName } from '@vet/types/domain/treatment/treatment.js';
import { getImageCollection } from '@vet/core-local/repositories/image-collection.repository.js';
import { selectSystemMany } from '@vet/core-local/sqlite/client.js';

export const MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE = 'manufacturer_catalog_item';
export const MANUFACTURER_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const MANUFACTURER_CATALOG_COLUMNS = 'id, type, name, normalized_name, aliases, regions, extension, hidden_at, NULL AS updated_at';

interface ManufacturerCatalogItemRow {
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

function mapManufacturerCatalogItem(row: ManufacturerCatalogItemRow, images: ImageCollectionItem[] = []): ManufacturerCatalogItem {
	return {
		id: row.id,
		type: parseManufacturerType(row.type),
		name: row.name,
		normalizedName: row.normalized_name,
		aliases: parseManufacturerAliases(row.aliases, row.normalized_name),
		images,
		primaryImage: primaryImage(images),
		regions: parseManufacturerRegions(row.regions),
		extension: parseManufacturerCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadManufacturerCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, id, 'system');
	return collection?.items ?? [];
}

async function mapManufacturerCatalogItemWithImages(row: ManufacturerCatalogItemRow): Promise<ManufacturerCatalogItem> {
	return mapManufacturerCatalogItem(row, await loadManufacturerCatalogImages(row.id));
}

export function normalizeManufacturerCatalogInput(value: string): { name: string; normalizedName: string } {
	const name = requireLimitedText(value, FIELD_LIMITS.productManufacturer, 'manufacturer_name_required');
	const normalizedName = normalizeTreatmentName(name);
	if (!normalizedName) throw new Error('manufacturer_name_required');
	assertTextLimit(normalizedName, FIELD_LIMITS.productNormalizedName);
	return { name, normalizedName };
}

export async function listManufacturerCatalogItems(includeHidden = false, includeImages = true): Promise<ManufacturerCatalogItem[]> {
	const where = includeHidden ? '1 = 1' : 'hidden_at IS NULL';
	const rows = (
		await selectSystemMany<ManufacturerCatalogItemRow>(
			`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
			 FROM manufacturer_catalog_items
			 WHERE ${where}`
		)
	).sort((first, second) => first.name.localeCompare(second.name));

	if (!includeImages) return rows.map((row) => mapManufacturerCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadManufacturerCatalogImages(row.id)));
	return rows.map((row, index) => mapManufacturerCatalogItem(row, imagesByIndex[index] ?? []));
}

async function selectManufacturerCatalogItemById(id: string, includeHidden = false): Promise<ManufacturerCatalogItemRow | null> {
	const where = `id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}`;
	const referenceRows = await selectSystemMany<ManufacturerCatalogItemRow>(
		`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
		 FROM manufacturer_catalog_items
		 WHERE ${where}
		 LIMIT 1`,
		[id]
	);
	return referenceRows[0] ?? null;
}

export async function getManufacturerCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ManufacturerCatalogItem | null> {
	const row = await selectManufacturerCatalogItemById(id, includeHidden);
	if (!row) return null;
	return includeImages ? mapManufacturerCatalogItemWithImages(row) : mapManufacturerCatalogItem(row);
}

async function selectManufacturerCatalogItemByNormalizedName(normalizedName: string): Promise<ManufacturerCatalogItemRow | null> {
	const rows = await selectSystemMany<ManufacturerCatalogItemRow>(
		`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
		 FROM manufacturer_catalog_items
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);
	return rows[0] ?? null;
}

export async function getManufacturerCatalogItemByNormalizedName(normalizedName: string): Promise<ManufacturerCatalogItem | null> {
	const row = await selectManufacturerCatalogItemByNormalizedName(normalizedName);
	return row ? mapManufacturerCatalogItemWithImages(row) : null;
}

export async function ensureManufacturerCatalogItem(nameValue: string | null | undefined): Promise<ManufacturerCatalogItem | null> {
	const name = nullableLimitedText(nameValue, FIELD_LIMITS.productManufacturer);
	if (!name) return null;

	const { normalizedName } = normalizeManufacturerCatalogInput(name);
	return getManufacturerCatalogItemByNormalizedName(normalizedName);
}

export async function deleteManufacturerCatalogItem(id: string): Promise<void> {
	const row = await selectManufacturerCatalogItemById(id, true);
	if (row) throw new Error('manufacturer_catalog_system_item');
}
