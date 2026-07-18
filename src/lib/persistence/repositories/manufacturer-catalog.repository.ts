import type { ImageCollectionItem, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import {
	canEditManufacturerCatalogItem,
	manufacturerType,
	parseManufacturerAliases,
	parseManufacturerCatalogExtension,
	parseManufacturerRegions,
	parseManufacturerType,
	stringifyManufacturerAliases,
	stringifyManufacturerCatalogExtension,
	stringifyManufacturerRegions,
	stringifyManufacturerType,
	type ManufacturerCatalogItem,
	type ManufacturerType
} from '$lib/domain/manufacturer/catalog.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '$lib/domain/shared/field-limits.js';
import { createUuidV4 } from '$lib/domain/shared/uuid.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';
import { deleteImageCollection, getImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export const MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE = 'manufacturer_catalog_item';
export const MANUFACTURER_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const MANUFACTURER_CATALOG_COLUMNS = 'id, type, name, normalized_name, aliases, origin, regions, extension, hidden_at, updated_at';

interface ManufacturerCatalogItemRow {
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

function mapManufacturerCatalogItem(row: ManufacturerCatalogItemRow, images: ImageCollectionItem[] = []): ManufacturerCatalogItem {
	return {
		id: row.id,
		type: parseManufacturerType(row.type),
		name: row.name,
		normalizedName: row.normalized_name,
		aliases: parseManufacturerAliases(row.aliases, row.normalized_name),
		images,
		primaryImage: primaryImage(images),
		origin: row.origin,
		regions: parseManufacturerRegions(row.regions),
		extension: parseManufacturerCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadManufacturerCatalogImages(id: string): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, id);
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

function normalizeManufacturerCatalogMetadata(
	input: { aliases?: string[]; regions?: string[]; extension?: unknown },
	normalizedName: string
): { aliases: string; regions: string; extension: string } {
	const aliases = stringifyManufacturerAliases(input.aliases, normalizedName);
	const regions = stringifyManufacturerRegions(input.regions);
	const extension = stringifyManufacturerCatalogExtension(input.extension);
	assertTextLimit(aliases, FIELD_LIMITS.catalogAliasesJson);
	assertTextLimit(regions, FIELD_LIMITS.productRegionsJson);
	assertTextLimit(extension, FIELD_LIMITS.productExtensionJson);
	return { aliases, regions, extension };
}

export async function listManufacturerCatalogItems(includeHidden = false, includeImages = true): Promise<ManufacturerCatalogItem[]> {
	const rows = await selectMany<ManufacturerCatalogItemRow>(
		`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
		 FROM manufacturer_catalog_items
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`
	);

	if (!includeImages) return rows.map((row) => mapManufacturerCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadManufacturerCatalogImages(row.id)));
	return rows.map((row, index) => mapManufacturerCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function getManufacturerCatalogItemById(id: string, includeHidden = false, includeImages = true): Promise<ManufacturerCatalogItem | null> {
	const rows = await selectMany<ManufacturerCatalogItemRow>(
		`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
		 FROM manufacturer_catalog_items
		 WHERE id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapManufacturerCatalogItemWithImages(row) : mapManufacturerCatalogItem(row);
}

export async function getManufacturerCatalogItemByNormalizedName(normalizedName: string): Promise<ManufacturerCatalogItem | null> {
	const rows = await selectMany<ManufacturerCatalogItemRow>(
		`SELECT ${MANUFACTURER_CATALOG_COLUMNS}
		 FROM manufacturer_catalog_items
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);
	return rows[0] ? mapManufacturerCatalogItemWithImages(rows[0]) : null;
}

export async function ensureManufacturerCatalogItem(nameValue: string | null | undefined): Promise<ManufacturerCatalogItem | null> {
	const name = nullableLimitedText(nameValue, FIELD_LIMITS.productManufacturer);
	if (!name) return null;

	const { normalizedName } = normalizeManufacturerCatalogInput(name);
	const existing = await getManufacturerCatalogItemByNormalizedName(normalizedName);
	if (existing) return existing;

	const id = createUuidV4();
	const type: ManufacturerType = manufacturerType('veterinaryIndustrial', 'veterinaryIndustrialLaboratory');
	const metadata = normalizeManufacturerCatalogMetadata({ regions: [] }, normalizedName);
	await execute(
		`INSERT INTO manufacturer_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
		 VALUES ($1, $2, $3, $4, $5, 'user', $6, $7, CURRENT_TIMESTAMP)`,
		[id, stringifyManufacturerType(type), name, normalizedName, metadata.aliases, metadata.regions, metadata.extension]
	);

	const item = await getManufacturerCatalogItemByNormalizedName(normalizedName);
	if (!item) throw new Error('manufacturer_save_failed');
	return item;
}

export async function deleteManufacturerCatalogItem(id: string): Promise<void> {
	const rows = await selectMany<Pick<ManufacturerCatalogItemRow, 'origin'>>('SELECT origin FROM manufacturer_catalog_items WHERE id = $1 LIMIT 1', [id]);
	if (rows[0] && !canEditManufacturerCatalogItem(rows[0])) throw new Error('manufacturer_catalog_system_item');
	await deleteImageCollection(MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, id);
	await execute('DELETE FROM manufacturer_catalog_items WHERE id = $1', [id]);
}
