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
	type ProductCatalogSource,
	type ProductType,
	type ProductTypeMain,
	type ProductTypeTuple
} from '$lib/domain/product/catalog.js';
import type { ImageCollectionItem, ImageCollectionItemInput, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText } from '$lib/domain/shared/field-limits.js';
import { createUuidV4 } from '$lib/domain/shared/uuid.js';
import type { TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';
import { ensureManufacturerCatalogItem, getManufacturerCatalogItemById } from '$lib/persistence/repositories/manufacturer-catalog.repository.js';
import { listActiveIngredientCatalogItemsByProductId } from '$lib/persistence/repositories/active-ingredient-catalog.repository.js';
import { deleteImageCollection, getImageCollection, replaceImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { execute, selectMany, selectSystemMany } from '$lib/persistence/sqlite/client.js';

interface ProductCatalogItemRow {
	id: TreatmentCatalogItemId;
	type: string;
	name: string;
	normalized_name: string;
	species: string;
	aliases: string;
	manufacturer_id: string | null;
	manufacturer_name: string | null;
	source: ProductCatalogSource;
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
	product.manufacturer_name AS manufacturer_name,
	'user' AS source,
	product.regions AS regions,
	product.extension AS extension,
	product.hidden_at AS hidden_at,
	product.updated_at AS updated_at`;
const SYSTEM_PRODUCT_CATALOG_COLUMNS = PRODUCT_CATALOG_COLUMNS
	.replace('product.manufacturer_name AS manufacturer_name', 'manufacturer.name AS manufacturer_name')
	.replace("'user' AS source", "'system' AS source");
const USER_PRODUCT_CATALOG_FROM = 'user_product_catalog_items product';
const SYSTEM_PRODUCT_CATALOG_FROM = `product_catalog_items product
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

async function activeIngredientIdsForProduct(id: TreatmentCatalogItemId, source: ProductCatalogSource): Promise<string[]> {
	if (source === 'user') return [];
	const rows = (
		await selectSystemMany<{ active_ingredient_id: string; sort_order: number }>(
			`SELECT active_ingredient_id, sort_order
			 FROM product_active_ingredients
			 WHERE product_id = $1`,
			[id]
		)
	).sort((first, second) => first.sort_order - second.sort_order || first.active_ingredient_id.localeCompare(second.active_ingredient_id));
	return rows.map((row) => row.active_ingredient_id);
}

async function mapCatalogItem(row: ProductCatalogItemRow, images: ImageCollectionItem[] = [], includeActiveIngredients = true): Promise<ProductCatalogItem> {
	const type = parseProductType(row.type);
	const config = configFor(productTypeMain(type));
	const activeIngredients = includeActiveIngredients && row.source === 'system' ? await listActiveIngredientCatalogItemsByProductId(row.id, false) : [];
	const activeIngredientIds = activeIngredients.length > 0 ? activeIngredients.map((ingredient) => ingredient.id) : await activeIngredientIdsForProduct(row.id, row.source);
	const referencedManufacturer = !row.manufacturer_name && row.manufacturer_id ? await getManufacturerCatalogItemById(row.manufacturer_id, true, false) : null;
	return {
		id: row.id,
		type,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseProductSpecies(row.species),
		aliases: parseCatalogAliases(row.aliases, FIELD_LIMITS.catalogAlias, config.normalize, row.normalized_name),
		manufacturerId: row.manufacturer_id,
		manufacturerName: row.manufacturer_name ?? referencedManufacturer?.name ?? null,
		activeIngredientIds,
		activeIngredients,
		images,
		primaryImage: primaryImage(images),
		source: row.source,
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

async function loadCatalogItemImages(id: TreatmentCatalogItemId, source: 'system' | 'user' = 'user'): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id, source);
	return collection?.items ?? [];
}

async function mapCatalogItemWithImages(row: ProductCatalogItemRow): Promise<ProductCatalogItem> {
	return mapCatalogItem(row, await loadCatalogItemImages(row.id, row.source));
}

async function mapTreatmentCatalogItemWithImages(row: ProductCatalogItemRow): Promise<TreatmentCatalogItem> {
	return mapTreatmentCatalogItem(row, await loadCatalogItemImages(row.id, row.source));
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

function sortProductRows(rows: ProductCatalogItemRow[]): ProductCatalogItemRow[] {
	return rows.sort((first, second) => first.name.localeCompare(second.name));
}

async function selectProductCatalogRows(filters: string[], values: unknown[] = []): Promise<ProductCatalogItemRow[]> {
	const where = filters.join(' AND ');
	const [userRows, referenceRows] = await Promise.all([
		selectMany<ProductCatalogItemRow>(
			`SELECT ${PRODUCT_CATALOG_COLUMNS}
			 FROM ${USER_PRODUCT_CATALOG_FROM}
			 WHERE ${where}`,
			values
		),
		selectSystemMany<ProductCatalogItemRow>(
			`SELECT ${SYSTEM_PRODUCT_CATALOG_COLUMNS}
			 FROM ${SYSTEM_PRODUCT_CATALOG_FROM}
			 WHERE ${where}`,
			values
		)
	]);
	return sortProductRows([...referenceRows, ...userRows]);
}

async function selectProductCatalogItemRowById(id: TreatmentCatalogItemId, includeHidden = false): Promise<ProductCatalogItemRow | null> {
	const filters = ['product.id = $1', includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'];
	const userRows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${USER_PRODUCT_CATALOG_FROM}
		 WHERE ${filters.join(' AND ')}
		 LIMIT 1`,
		[id]
	);
	if (userRows[0]) return userRows[0];
	const referenceRows = await selectSystemMany<ProductCatalogItemRow>(
		`SELECT ${SYSTEM_PRODUCT_CATALOG_COLUMNS}
		 FROM ${SYSTEM_PRODUCT_CATALOG_FROM}
		 WHERE ${filters.join(' AND ')}
		 LIMIT 1`,
		[id]
	);
	return referenceRows[0] ?? null;
}

async function selectProductCatalogItemRowByNormalizedName(normalizedName: string): Promise<ProductCatalogItemRow | null> {
	const referenceRows = await selectSystemMany<ProductCatalogItemRow>(
		`SELECT ${SYSTEM_PRODUCT_CATALOG_COLUMNS}
		 FROM ${SYSTEM_PRODUCT_CATALOG_FROM}
		 WHERE product.normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);
	if (referenceRows[0]) return referenceRows[0];
	const userRows = await selectMany<ProductCatalogItemRow>(
		`SELECT ${PRODUCT_CATALOG_COLUMNS}
		 FROM ${USER_PRODUCT_CATALOG_FROM}
		 WHERE product.normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);
	return userRows[0] ?? null;
}

async function getProductCatalogItemByNormalizedName(normalizedName: string): Promise<ProductCatalogItem | null> {
	const row = await selectProductCatalogItemRowByNormalizedName(normalizedName);
	return row ? mapCatalogItemWithImages(row) : null;
}

async function assertProductCatalogItemEditable(id: TreatmentCatalogItemId): Promise<void> {
	const row = await selectProductCatalogItemRowById(id, true);
	if (row && !canEditProductCatalogItem(row)) throw new Error('product_catalog_system_item');
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
		`INSERT INTO user_product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, manufacturer_name, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
		 ON CONFLICT(normalized_name) DO NOTHING`,
		[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, null, metadata.manufacturerName, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item || stringifyProductType(item.type) !== serializedType) throw new Error(configFor('medication').saveFailedError);
	return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
}

export async function listProductCatalogItems(includeHidden = false, includeImages = true): Promise<ProductCatalogItem[]> {
	const filters = [includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'];
	const rows = await selectProductCatalogRows(filters);

	if (!includeImages) return Promise.all(rows.map((row) => mapCatalogItem(row, [], true)));

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id, row.source)));
	return Promise.all(rows.map((row, index) => mapCatalogItem(row, imagesByIndex[index] ?? [])));
}

export async function listTreatmentProductCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	const filters = [includeHidden ? '1 = 1' : 'product.hidden_at IS NULL'];
	const values: unknown[] = [];
	const typeValues = kind ? treatmentProductTypeValues(kind) : TREATMENT_PRODUCT_TYPES;
	const placeholders = typeValues.map((_, index) => `$${values.length + index + 1}`).join(', ');
	filters.push(`product.type IN (${placeholders})`);
	values.push(...typeValues);
	const rows = await selectProductCatalogRows(filters, values);

	if (!includeImages) return Promise.all(rows.map((row) => mapTreatmentCatalogItem(row, [], true)));

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id, row.source)));
	return Promise.all(rows.map((row, index) => mapTreatmentCatalogItem(row, imagesByIndex[index] ?? [])));
}

export async function getProductCatalogItemById(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<ProductCatalogItem | null> {
	const row = await selectProductCatalogItemRowById(id, includeHidden);
	if (!row) return null;
	return includeImages ? mapCatalogItemWithImages(row) : mapCatalogItem(row);
}

export async function getTreatmentProductCatalogItemById(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem | null> {
	const row = await selectProductCatalogItemRowById(id, includeHidden);
	if (!row) return null;
	return includeImages ? mapTreatmentCatalogItemWithImages(row) : mapTreatmentCatalogItem(row);
}

export async function saveTreatmentProductCatalogItem(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<TreatmentCatalogItem> {
	const serializedType = stringifyProductType(productTypeForTreatmentKind(kind));
	const { name, normalizedName } = normalizeProductCatalogInput(kind, input.name);
	const metadata = normalizeProductCatalogMetadata(input, normalizedName);
	const manufacturer = await ensureManufacturerCatalogItem(metadata.manufacturerName);
	const manufacturerName = manufacturer?.name ?? metadata.manufacturerName;

	if (id) {
		await assertProductCatalogItemEditable(id);
		const conflictingItem = await getProductCatalogItemByNormalizedName(normalizedName);
		if (conflictingItem && conflictingItem.id !== id) {
			if (!canEditProductCatalogItem(conflictingItem)) throw new Error('product_catalog_system_item');
			throw new Error('product_catalog_duplicate_name');
		}

		await execute(
			`UPDATE user_product_catalog_items
			 SET type = $2,
				name = $3,
				normalized_name = $4,
				species = $5,
				aliases = $6,
				manufacturer_id = $7,
				manufacturer_name = $8,
				regions = $9,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, serializedType, name, normalizedName, metadata.species, metadata.aliases, manufacturer?.id ?? null, manufacturerName, metadata.regions]
		);

		const rows = await selectMany<ProductCatalogItemRow>(
			`SELECT ${PRODUCT_CATALOG_COLUMNS}
			 FROM ${USER_PRODUCT_CATALOG_FROM}
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
			`UPDATE user_product_catalog_items
			 SET type = $2,
				name = $3,
				species = $4,
				aliases = $5,
				manufacturer_id = $6,
				manufacturer_name = $7,
				regions = $8,
				hidden_at = NULL,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[existingItem.id, serializedType, name, metadata.species, metadata.aliases, manufacturer?.id ?? null, manufacturerName, metadata.regions]
		);

		const item = await getProductCatalogItemByNormalizedName(normalizedName);
		if (!item) throw new Error(configFor('medication').saveFailedError);
		return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
	}

	const newId = createUuidV4();
	await execute(
		`INSERT INTO user_product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, manufacturer_name, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
		[newId, serializedType, name, normalizedName, metadata.species, metadata.aliases, manufacturer?.id ?? null, manufacturerName, metadata.regions]
	);

	const item = await getProductCatalogItemByNormalizedName(normalizedName);
	if (!item) throw new Error(configFor('medication').saveFailedError);
	return { ...item, type: item.type as ProductTypeTuple<'medication'>, kind };
}

export async function setProductCatalogItemHidden(_kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<TreatmentCatalogItem> {
	await assertProductCatalogItemEditable(id);
	await execute(
		`UPDATE user_product_catalog_items
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const row = await selectProductCatalogItemRowById(id, true);
	if (!row) throw new Error(configFor('medication').saveFailedError);
	return mapTreatmentCatalogItemWithImages(row);
}

export async function deleteProductCatalogItem(_kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await assertProductCatalogItemEditable(id);
	await deleteImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id);
	await execute('DELETE FROM user_product_catalog_items WHERE id = $1', [id]);
}

export async function saveProductCatalogItemImages(_kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	const row = await selectProductCatalogItemRowById(id, true);
	if (!row) throw new Error(configFor('medication').saveFailedError);
	if (!canEditProductCatalogItem(row)) throw new Error('product_catalog_system_item');

	const collection = await replaceImageCollection(PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, id, images, PRODUCT_CATALOG_IMAGE_POLICY);
	return mapTreatmentCatalogItem(row, collection.items);
}
