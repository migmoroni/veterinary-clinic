import { canEditProductCatalogItem, parseProductAliases, parseProductCatalogExtension, parseProductRegions, parseProductSpecies, parseProductType, productType, productTypeMain, productTypeSubtype, stringifyProductAliases, stringifyProductRegions, stringifyProductSpecies, stringifyProductType, type ProductCatalogOrigin, type ProductType, type ProductTypeMain } from '$lib/domain/product/catalog.js';
import type { ImageCollectionItem, ImageCollectionItemInput, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText } from '$lib/domain/shared/field-limits.js';
import { createUuidV4 } from '$lib/domain/shared/uuid.js';
import type { TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';
import { deleteImageCollection, getImageCollection, replaceImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type ProductCatalogItem = TreatmentCatalogItem;

interface ProductCatalogItemRow {
	id: TreatmentCatalogItemId;
	type: string;
	name: string;
	normalized_name: string;
	species: string;
	aliases: string;
	manufacturer: string | null;
	origin: ProductCatalogOrigin;
	regions: string;
	extension: string;
	hidden_at: string | null;
	updated_at: string | null;
}

interface ProductCatalogConfig {
	nameLimit: number;
	normalizedNameLimit: number;
	requiredError: string;
	saveFailedError: string;
	normalize: (value: string) => string;
}

const medicationProductConfig: ProductCatalogConfig = {
	nameLimit: FIELD_LIMITS.productName,
	normalizedNameLimit: FIELD_LIMITS.productNormalizedName,
	requiredError: 'treatment_name_required',
	saveFailedError: 'treatment_save_failed',
	normalize: normalizeTreatmentName
};

export const PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE = 'product_catalog_item';
export const PRODUCT_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const PRODUCT_CATALOG_COLUMNS = 'id, type, name, normalized_name, species, aliases, manufacturer, origin, regions, extension, hidden_at, updated_at';

function configFor(_type: ProductTypeMain): ProductCatalogConfig {
	return medicationProductConfig;
}

function primaryImage(images: ImageCollectionItem[]): ImageCollectionItem | null {
	return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

function mapCatalogItem(row: ProductCatalogItemRow, images: ImageCollectionItem[] = []): ProductCatalogItem {
	const type = parseProductType(row.type);
	const config = configFor(productTypeMain(type));
	return {
		id: row.id,
		type,
		kind: productCatalogTreatmentKind(type),
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseProductSpecies(row.species),
		aliases: parseProductAliases(row.aliases, FIELD_LIMITS.productAlias, config.normalize, row.normalized_name),
		manufacturer: row.manufacturer,
		images,
		primaryImage: primaryImage(images),
		origin: row.origin,
		regions: parseProductRegions(row.regions),
		extension: parseProductCatalogExtension(row.extension),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

function productCatalogTreatmentKind(type: ProductType): TreatmentKind {
	if (productTypeMain(type) !== 'medication') throw new Error('product_catalog_type_invalid');
	const subtype = productTypeSubtype(type);
	if (subtype !== 'vaccine' && subtype !== 'antiparasitic') throw new Error('product_catalog_type_invalid');
	return subtype;
}

async function loadCatalogItemImages(id: TreatmentCatalogItemId): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

async function mapCatalogItemWithImages(row: ProductCatalogItemRow): Promise<ProductCatalogItem> {
	return mapCatalogItem(row, await loadCatalogItemImages(row.id));
}

function normalizeProductCatalogMetadata(
	input: Pick<TreatmentCatalogItemInput, 'species' | 'aliases' | 'manufacturer' | 'regions'>,
	normalizedName: string
): { species: string; aliases: string; manufacturer: string | null; regions: string } {
	const config = configFor('medication');
	const species = stringifyProductSpecies(input.species);
	const aliases = stringifyProductAliases(input.aliases, FIELD_LIMITS.productAlias, config.normalize, normalizedName);
	const manufacturer = nullableLimitedText(input.manufacturer, FIELD_LIMITS.productManufacturer);
	const regions = stringifyProductRegions(input.regions);
	assertTextLimit(species, FIELD_LIMITS.productSpeciesJson);
	assertTextLimit(aliases, FIELD_LIMITS.productAliasesJson);
	assertTextLimit(regions, FIELD_LIMITS.productRegionsJson);
	return { species, aliases, manufacturer, regions };
}

export function normalizeProductCatalogInput(_kind: TreatmentKind, value: string): { name: string; normalizedName: string } {
	const config = configFor('medication');
	const name = value.trim();
	if (!name) throw new Error(config.requiredError);
	assertTextLimit(name, config.nameLimit);

	const normalizedName = config.normalize(name);
	if (!normalizedName) throw new Error(config.requiredError);
	assertTextLimit(normalizedName, config.normalizedNameLimit);

	return { name, normalizedName };
}

async function getProductCatalogItemByNormalizedName(normalizedName: string): Promise<ProductCatalogItem | null> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM product_catalog_items
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);

	return rows[0] ? mapCatalogItemWithImages(rows[0]) : null;
}

async function assertProductCatalogItemEditable(id: TreatmentCatalogItemId): Promise<void> {
	const rows = await selectMany<Pick<ProductCatalogItemRow, 'origin'>>(
		`SELECT origin
		 FROM product_catalog_items
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	if (rows[0] && !canEditProductCatalogItem(rows[0])) throw new Error('product_catalog_system_item');
}

export async function ensureMedicationProductCatalogItem(kind: TreatmentKind, name: string, normalizedName: string): Promise<ProductCatalogItem> {
	const type = productType('medication', kind);
	const serializedType = stringifyProductType(type);
	const existingItem = await getProductCatalogItemByNormalizedName(normalizedName);
	if (existingItem) {
		if (stringifyProductType(existingItem.type) !== serializedType) throw new Error('product_catalog_type_mismatch');
		return existingItem;
	}

	const metadata = normalizeProductCatalogMetadata({}, normalizedName);
	const id = createUuidV4();
	await execute(
		`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', $8, CURRENT_TIMESTAMP)
		 ON CONFLICT(normalized_name) DO NOTHING`,
		[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item || stringifyProductType(item.type) !== serializedType) throw new Error(configFor('medication').saveFailedError);
	return item;
}

export async function listProductCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<ProductCatalogItem[]> {
	const filters = [includeHidden ? '1 = 1' : 'hidden_at IS NULL'];
	const values: unknown[] = [];
	if (kind) {
		values.push(stringifyProductType(productType('medication', kind)));
		filters.push(`type = $${values.length}`);
	}

	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM product_catalog_items
		 WHERE ${filters.join(' AND ')}
		 ORDER BY name COLLATE NOCASE`,
		values
	);

	if (!includeImages) return rows.map((row) => mapCatalogItem(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id)));
	return rows.map((row, index) => mapCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function getProductCatalogItemById(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<ProductCatalogItem | null> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM product_catalog_items
		 WHERE id = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapCatalogItemWithImages(row) : mapCatalogItem(row);
}

export async function saveMedicationProductCatalogItem(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<ProductCatalogItem> {
	const serializedType = stringifyProductType(productType('medication', kind));
	const { name, normalizedName } = normalizeProductCatalogInput(kind, input.name);
	const metadata = normalizeProductCatalogMetadata(input, normalizedName);

	if (id) {
		await assertProductCatalogItemEditable(id);
		const conflictingItem = await getProductCatalogItemByNormalizedName(normalizedName);
		if (conflictingItem && conflictingItem.id !== id) {
			if (!canEditProductCatalogItem(conflictingItem)) throw new Error('product_catalog_system_item');
			throw new Error('product_catalog_duplicate_name');
		}

		await execute(
			`UPDATE product_catalog_items
			 SET type = $2,
				name = $3,
				normalized_name = $4,
				species = $5,
				aliases = $6,
				manufacturer = $7,
				regions = $8,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
		);

		const rows = await selectMany<ProductCatalogItemRow>(
			`SELECT ${PRODUCT_CATALOG_COLUMNS}
			 FROM product_catalog_items
			 WHERE id = $1
			 LIMIT 1`,
			[id]
		);
		if (rows[0]) return mapCatalogItemWithImages(rows[0]);
		throw new Error(configFor('medication').saveFailedError);
	}

	const existingItem = await getProductCatalogItemByNormalizedName(normalizedName);
	if (existingItem && !canEditProductCatalogItem(existingItem)) throw new Error('product_catalog_system_item');
	if (existingItem) {
		await execute(
			`UPDATE product_catalog_items
			 SET type = $2,
				name = $3,
				species = $4,
				aliases = $5,
				manufacturer = $6,
				regions = $7,
				hidden_at = NULL,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[existingItem.id, serializedType, name, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
		);

		const item = await getProductCatalogItemByNormalizedName(normalizedName);
		if (!item) throw new Error(configFor('medication').saveFailedError);
		return item;
	}

	const newId = createUuidV4();
	await execute(
		`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', $8, CURRENT_TIMESTAMP)`,
		[newId, serializedType, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item) throw new Error(configFor('medication').saveFailedError);
	return item;
}

export async function setProductCatalogItemHidden(_kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<ProductCatalogItem> {
	await execute(
		`UPDATE product_catalog_items
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM product_catalog_items
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	if (!rows[0]) throw new Error(configFor('medication').saveFailedError);
	return mapCatalogItemWithImages(rows[0]);
}

export async function deleteProductCatalogItem(_kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await assertProductCatalogItemEditable(id);
	await deleteImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	await execute('DELETE FROM product_catalog_items WHERE id = $1', [id]);
}

export async function saveProductCatalogItemImages(_kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<ProductCatalogItem> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM product_catalog_items
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) throw new Error(configFor('medication').saveFailedError);
	if (!canEditProductCatalogItem(row)) throw new Error('product_catalog_system_item');

	const collection = await replaceImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id, images, PRODUCT_CATALOG_IMAGE_POLICY);
	return mapCatalogItem(row, collection.items);
}
