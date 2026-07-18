import {
	PRODUCT_TYPES,
	canEditProductCatalogItem,
	parseCatalogAliases,
	parseProductCatalogExtension,
	parseProductRegions,
	parseProductSpecies,
	parseProductType,
	productTreatmentKind,
	productTypeForTreatmentKind,
	productTypeMain,
	productTypeMatchesTreatmentKind,
	stringifyCatalogAliases,
	stringifyProductRegions,
	stringifyProductSpecies,
	stringifyProductType,
	type ProductCatalogItem,
	type ProductCatalogOrigin,
	type ProductType,
	type ProductTypeMain,
	type ProductTypeTuple
} from '$lib/domain/product/catalog.js';
import type { ImageCollectionItem, ImageCollectionItemInput, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText } from '$lib/domain/shared/field-limits.js';
import { createUuidV4 } from '$lib/domain/shared/uuid.js';
import type { TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';
import { ensureManufacturerCatalogItem } from '$lib/persistence/repositories/manufacturer-catalog.repository.js';
import { listActiveIngredientCatalogItemsByProductId } from '$lib/persistence/repositories/active-ingredient-catalog.repository.js';
import { deleteImageCollection, getImageCollection, replaceImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface ProductCatalogItemRow {
	id: TreatmentCatalogItemId;
	type: string;
	name: string;
	normalized_name: string;
	species: string;
	aliases: string;
	manufacturer_id: string | null;
	manufacturer_name: string | null;
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

const treatmentProductConfig: ProductCatalogConfig = {
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

const PRODUCT_CATALOG_COLUMNS = `product.id AS id,
	product.type AS type,
	product.name AS name,
	product.normalized_name AS normalized_name,
	product.species AS species,
	product.aliases AS aliases,
	product.manufacturer_id AS manufacturer_id,
	manufacturer.name AS manufacturer_name,
	product.origin AS origin,
	product.regions AS regions,
	product.extension AS extension,
	product.hidden_at AS hidden_at,
	product.updated_at AS updated_at`;
const PRODUCT_CATALOG_FROM = `product_catalog_items product
	LEFT JOIN manufacturer_catalog_items manufacturer ON manufacturer.id = product.manufacturer_id`;
const TREATMENT_KINDS = ['vaccine', 'antiparasitic'] as const satisfies readonly TreatmentKind[];

function treatmentProductTypeValues(kind: TreatmentKind): string[] {
	const values = PRODUCT_TYPES.filter((type) => productTypeMatchesTreatmentKind(type, kind)).map(stringifyProductType);
	values.unshift(stringifyProductType(productTypeForTreatmentKind(kind)));
	return [...new Set(values)];
}

const TREATMENT_PRODUCT_TYPES = [...new Set(TREATMENT_KINDS.flatMap((kind) => treatmentProductTypeValues(kind)))];

function configFor(_type: ProductTypeMain): ProductCatalogConfig {
	return treatmentProductConfig;
}

function primaryImage(images: ImageCollectionItem[]): ImageCollectionItem | null {
	return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

async function activeIngredientIdsForProduct(id: TreatmentCatalogItemId): Promise<string[]> {
	const rows = await selectMany<{ active_ingredient_id: string }>(
		`SELECT active_ingredient_id
		 FROM product_active_ingredients
		 WHERE product_id = $1
		 ORDER BY sort_order, active_ingredient_id`,
		[id]
	);
	return rows.map((row) => row.active_ingredient_id);
}

async function mapCatalogItem(row: ProductCatalogItemRow, images: ImageCollectionItem[] = [], includeActiveIngredients = true): Promise<ProductCatalogItem> {
	const type = parseProductType(row.type);
	const config = configFor(productTypeMain(type));
	const activeIngredients = includeActiveIngredients ? await listActiveIngredientCatalogItemsByProductId(row.id, false) : [];
	const activeIngredientIds = activeIngredients.length > 0 ? activeIngredients.map((ingredient) => ingredient.id) : await activeIngredientIdsForProduct(row.id);
	return {
		id: row.id,
		type,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseProductSpecies(row.species),
		aliases: parseCatalogAliases(row.aliases, FIELD_LIMITS.catalogAlias, config.normalize, row.normalized_name),
		manufacturerId: row.manufacturer_id,
		manufacturerName: row.manufacturer_name,
		activeIngredientIds,
		activeIngredients,
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
	const kind = productTreatmentKind(type);
	if (!kind) throw new Error('product_catalog_type_invalid');
	return kind;
}

async function mapTreatmentCatalogItem(row: ProductCatalogItemRow, images: ImageCollectionItem[] = [], includeActiveIngredients = true): Promise<TreatmentCatalogItem> {
	const item = await mapCatalogItem(row, images, includeActiveIngredients);
	const kind = productCatalogTreatmentKind(item.type);
	return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
}

async function loadCatalogItemImages(id: TreatmentCatalogItemId): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

async function mapCatalogItemWithImages(row: ProductCatalogItemRow): Promise<ProductCatalogItem> {
	return mapCatalogItem(row, await loadCatalogItemImages(row.id));
}

async function mapTreatmentCatalogItemWithImages(row: ProductCatalogItemRow): Promise<TreatmentCatalogItem> {
	return mapTreatmentCatalogItem(row, await loadCatalogItemImages(row.id));
}

function normalizeProductCatalogMetadata(
	input: Pick<TreatmentCatalogItemInput, 'species' | 'aliases' | 'manufacturerName' | 'regions'>,
	normalizedName: string
): { species: string; aliases: string; manufacturerName: string | null; regions: string } {
	const config = configFor('medication');
	const species = stringifyProductSpecies(input.species);
	const aliases = stringifyCatalogAliases(input.aliases, FIELD_LIMITS.catalogAlias, config.normalize, normalizedName);
	const manufacturerName = nullableLimitedText(input.manufacturerName, FIELD_LIMITS.productManufacturer);
	const regions = stringifyProductRegions(input.regions);
	assertTextLimit(species, FIELD_LIMITS.productSpeciesJson);
	assertTextLimit(aliases, FIELD_LIMITS.catalogAliasesJson);
	assertTextLimit(regions, FIELD_LIMITS.productRegionsJson);
	return { species, aliases, manufacturerName, regions };
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
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE product.normalized_name = $1
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

export async function ensureTreatmentProductCatalogItem(kind: TreatmentKind, name: string, normalizedName: string): Promise<TreatmentCatalogItem> {
	const type = productTypeForTreatmentKind(kind);
	const serializedType = stringifyProductType(type);
	const existingItem = await getProductCatalogItemByNormalizedName(normalizedName);
	if (existingItem) {
		if (!productTypeMatchesTreatmentKind(existingItem.type, kind)) throw new Error('product_catalog_type_mismatch');
		return { ...existingItem, type: existingItem.type as ProductTypeTuple<'medication'>, kind };
	}

	const metadata = normalizeProductCatalogMetadata({}, normalizedName);
	const id = createUuidV4();
	await execute(
		`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', $8, CURRENT_TIMESTAMP)
		 ON CONFLICT(normalized_name) DO NOTHING`,
		[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, null, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item || stringifyProductType(item.type) !== serializedType) throw new Error(configFor('medication').saveFailedError);
	return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
}

export async function listProductCatalogItems(includeHidden = false, includeImages = true): Promise<ProductCatalogItem[]> {
	const filters = [includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'];

	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE ${filters.join(' AND ')}
		 ORDER BY product.name COLLATE NOCASE`,
	);

	if (!includeImages) return Promise.all(rows.map((row) => mapCatalogItem(row, [], true)));

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id)));
	return Promise.all(rows.map((row, index) => mapCatalogItem(row, imagesByIndex[index] ?? [])));
}

export async function listTreatmentProductCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	const filters = [includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'];
	const values: unknown[] = [];
	const typeValues = kind ? treatmentProductTypeValues(kind) : TREATMENT_PRODUCT_TYPES;
	const placeholders = typeValues.map((_, index) => `$${values.length + index + 1}`).join(', ');
	filters.push(`product.type IN (${placeholders})`);
	values.push(...typeValues);

	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE ${filters.join(' AND ')}
		 ORDER BY product.name COLLATE NOCASE`,
		values
	);

	if (!includeImages) return Promise.all(rows.map((row) => mapTreatmentCatalogItem(row, [], true)));

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id)));
	return Promise.all(rows.map((row, index) => mapTreatmentCatalogItem(row, imagesByIndex[index] ?? [])));
}

export async function getProductCatalogItemById(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<ProductCatalogItem | null> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE product.id = $1 AND ${includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapCatalogItemWithImages(row) : mapCatalogItem(row);
}

export async function getTreatmentProductCatalogItemById(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem | null> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE product.id = $1 AND ${includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	const row = rows[0];
	if (!row) return null;
	return includeImages ? mapTreatmentCatalogItemWithImages(row) : mapTreatmentCatalogItem(row);
}

export async function saveTreatmentProductCatalogItem(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<TreatmentCatalogItem> {
	const serializedType = stringifyProductType(productTypeForTreatmentKind(kind));
	const { name, normalizedName } = normalizeProductCatalogInput(kind, input.name);
	const metadata = normalizeProductCatalogMetadata(input, normalizedName);
	const manufacturer = await ensureManufacturerCatalogItem(metadata.manufacturerName);

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
				manufacturer_id = $7,
				regions = $8,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, manufacturer?.id ?? null, metadata.regions]
		);

		const rows = await selectMany<ProductCatalogItemRow>(
			`SELECT ${PRODUCT_CATALOG_COLUMNS}
			 FROM ${PRODUCT_CATALOG_FROM}
			 WHERE product.id = $1
			 LIMIT 1`,
			[id]
		);
		if (rows[0]) return mapTreatmentCatalogItemWithImages(rows[0]);
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
				manufacturer_id = $6,
				regions = $7,
				hidden_at = NULL,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[existingItem.id, serializedType, name, metadata.species, metadata.aliases, manufacturer?.id ?? null, metadata.regions]
		);

		const item = await getProductCatalogItemByNormalizedName(normalizedName);
		if (!item) throw new Error(configFor('medication').saveFailedError);
		return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
	}

	const newId = createUuidV4();
	await execute(
		`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', $8, CURRENT_TIMESTAMP)`,
		[newId, serializedType, name, normalizedName, metadata.species, metadata.aliases, manufacturer?.id ?? null, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item) throw new Error(configFor('medication').saveFailedError);
	return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
}

export async function setProductCatalogItemHidden(_kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<TreatmentCatalogItem> {
	await execute(
		`UPDATE product_catalog_items
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE product.id = $1
		 LIMIT 1`,
		[id]
	);
	if (!rows[0]) throw new Error(configFor('medication').saveFailedError);
	return mapTreatmentCatalogItemWithImages(rows[0]);
}

export async function deleteProductCatalogItem(_kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await assertProductCatalogItemEditable(id);
	await deleteImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	await execute('DELETE FROM product_catalog_items WHERE id = $1', [id]);
}

export async function saveProductCatalogItemImages(_kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	const rows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${PRODUCT_CATALOG_FROM}
		 WHERE product.id = $1
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) throw new Error(configFor('medication').saveFailedError);
	if (!canEditProductCatalogItem(row)) throw new Error('product_catalog_system_item');

	const collection = await replaceImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id, images, PRODUCT_CATALOG_IMAGE_POLICY);
	return mapTreatmentCatalogItem(row, collection.items);
}
