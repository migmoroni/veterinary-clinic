import type Database from '@tauri-apps/plugin-sql';
import { defaultProductCatalogItems, type DefaultProductCatalogImage } from '$lib/domain/product/default-catalog.js';
import { PRODUCT_TYPES, productType, stringifyProductCatalogExtension, stringifyProductType } from '$lib/domain/product/catalog.js';
import { defaultManufacturerCatalogItems, type DefaultManufacturerCatalogImage } from '$lib/domain/manufacturer/default-catalog.js';
import { stringifyManufacturerCatalogExtension, stringifyManufacturerType } from '$lib/domain/manufacturer/catalog.js';
import { defaultActiveIngredientCatalogItems, type DefaultActiveIngredientCatalogImage } from '$lib/domain/active-ingredient/default-catalog.js';
import { stringifyActiveIngredientCatalogExtension, stringifyActiveIngredientType } from '$lib/domain/active-ingredient/catalog.js';
import { defaultTreatmentProtocols } from '$lib/domain/treatment/default-protocol.js';
import { stringifyTreatmentSpecies } from '$lib/domain/treatment/species.js';
import { defaultBreedReferenceItems, type DefaultBreedReferenceImage } from '$lib/domain/pet/default-breed-reference.js';
import { stringifyBreedReferenceExtension, stringifyBreedSexRange } from '$lib/domain/pet/breed-reference.js';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { incrementalSchemaMigrations } from './schema-migrations/registry.js';
import type { SchemaMigration } from './schema-migrations/types.js';

export const CURRENT_SCHEMA_VERSION = 1;
export const BASELINE_APP_VERSION = '0.2.0';

type BaselineDetection = 'empty' | 'current-unversioned' | 'unknown-unversioned' | 'versioned';

interface TableColumnRow {
	name: string;
}

interface TableNameRow {
	name: string;
}

interface UserVersionRow {
	user_version: number;
}

interface IntegrityCheckRow {
	integrity_check: string;
}

interface ForeignKeyCheckRow {
	table: string;
	rowid: number;
	parent: string;
	fkid: number;
}

interface MigrationRecordRow {
	version: number;
}

interface ProductCatalogRow {
	id: string;
	origin: string;
}

interface ManufacturerCatalogRow {
	id: string;
	origin: string;
}

interface ActiveIngredientCatalogRow {
	id: string;
	origin: string;
}

interface BreedReferenceRow {
	id: number;
}

interface TreatmentProtocolRow {
	id: string;
	origin: string;
}

interface ImageCollectionRow {
	id: number;
}

interface CountRow {
	total: number;
}

export interface SchemaStatus {
	currentVersion: number;
	targetVersion: number;
	migrationRequired: boolean;
	detection: BaselineDetection;
	isSupported: boolean;
	reason?: 'future-version' | 'unknown-schema';
}

function optionalTextCheck(column: string, maxLength: number): string {
	return `${column} IS NULL OR length(${column}) <= ${maxLength}`;
}

function requiredTextCheck(column: string, maxLength: number): string {
	return `length(trim(${column})) BETWEEN 1 AND ${maxLength}`;
}

function uuidV4TextCheck(column: string): string {
	return `length(trim(${column})) = 36 AND substr(lower(trim(${column})), 15, 1) = '4' AND substr(lower(trim(${column})), 20, 1) IN ('8', '9', 'a', 'b')`;
}

interface RunMigrationsOptions {
	seedDefaultData?: boolean;
	createIndexes?: boolean;
	syncDefaultProductData?: boolean;
	syncDefaultTreatmentProtocolData?: boolean;
	syncDefaultBreedReferenceData?: boolean;
}

const PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE = 'product_catalog_item';
const PRODUCT_CATALOG_IMAGE_MAX_ITEMS = 9;
const MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE = 'manufacturer_catalog_item';
const MANUFACTURER_CATALOG_IMAGE_MAX_ITEMS = 9;
const ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE = 'active_ingredient_catalog_item';
const ACTIVE_INGREDIENT_CATALOG_IMAGE_MAX_ITEMS = 9;
const BREED_REFERENCE_IMAGE_COLLECTION_TYPE = 'breed_reference_item';
const BREED_REFERENCE_IMAGE_MAX_ITEMS = 9;

function normalizeProductCatalogName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

function quoteSqlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

const PRODUCT_TYPE_SQL_VALUES = PRODUCT_TYPES.map((type) => quoteSqlString(stringifyProductType(type))).join(', ');

function bytesToSqlLiteral(value: Uint8Array): string {
	if (value.length === 0) throw new Error('image_required');
	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

async function tableHasColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${quoteIdentifier(table)})`);
	const names = new Set(rows.map((row) => row.name));
	return columns.every((column) => names.has(column));
}

async function tableHasExactColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${quoteIdentifier(table)})`);
	const names = rows.map((row) => row.name);
	if (names.length !== columns.length) return false;
	return columns.every((column) => names.includes(column));
}

async function tableExists(database: Database, table: string): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = $1 LIMIT 1", [table]);
	return rows.length > 0;
}

async function productCatalogHasCurrentTypes(database: Database): Promise<boolean> {
	const rows = await database.select<CountRow[]>(`SELECT COUNT(*) AS total FROM product_catalog_items WHERE type NOT IN (${PRODUCT_TYPE_SQL_VALUES})`);
	return (rows[0]?.total ?? 0) === 0;
}

async function getUserVersion(database: Database): Promise<number> {
	const rows = await database.select<UserVersionRow[]>('PRAGMA user_version');
	return Number(rows[0]?.user_version ?? 0);
}

async function setUserVersion(database: Database, version: number): Promise<void> {
	if (!Number.isInteger(version) || version < 0) throw new Error(`database_schema_invalid_version:${version}`);
	await database.execute(`PRAGMA user_version = ${version}`);
}

async function isEmptyDatabase(database: Database): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>(
		"SELECT name FROM sqlite_master WHERE type IN ('table', 'view', 'trigger', 'index') AND name NOT LIKE 'sqlite_%' LIMIT 1"
	);
	return rows.length === 0;
}

async function loadDefaultProductImageBytes(source: string): Promise<Uint8Array> {
	if (typeof fetch !== 'function') throw new Error('default_product_image_loader_unavailable');
	const response = await fetch(source);
	if (!response.ok) throw new Error(`default_product_image_not_found:${source}`);
	const buffer = await response.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	if (bytes.length === 0) throw new Error(`default_product_image_empty:${source}`);
	return bytes;
}

interface DefaultCatalogImage {
	source: string;
	description?: string;
	primary?: boolean;
}

function normalizedDefaultCatalogImages<TImage extends DefaultCatalogImage>(images: readonly TImage[] | null | undefined, maxItems: number, errorPrefix: string): TImage[] {
	const normalized = (images ?? []).filter((image) => image.source.trim());
	if (normalized.length === 0) return [];
	if (normalized.length > maxItems) throw new Error(`${errorPrefix}_image_limit_exceeded`);
	if (normalized.filter((image) => image.primary).length > 1) throw new Error(`${errorPrefix}_image_multiple_primary`);
	return normalized;
}

async function catalogImageCollectionItemCount(database: Database, entityType: string, entityId: string): Promise<number> {
	const rows = await database.select<CountRow[]>(
		`SELECT COUNT(*) AS total
		 FROM image_collection_items item
		 INNER JOIN image_collections collection ON collection.id = item.collection_id
		 WHERE collection.entity_type = $1 AND collection.entity_id = $2`,
		[entityType, entityId]
	);
	return Number(rows[0]?.total ?? 0);
}

async function ensureDefaultCatalogImages(database: Database, entityType: string, entityId: string, maxItems: number, images: readonly DefaultCatalogImage[] | null | undefined, errorPrefix: string): Promise<void> {
	const normalizedImages = normalizedDefaultCatalogImages(images, maxItems, errorPrefix);
	if (normalizedImages.length === 0) return;
	if ((await catalogImageCollectionItemCount(database, entityType, entityId)) > 0) return;

	await database.execute(
		`INSERT INTO image_collections (entity_type, entity_id, primary_required, max_items, updated_at)
		 VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items,
			updated_at = CURRENT_TIMESTAMP`,
		[entityType, entityId, maxItems]
	);

	const collectionRows = await database.select<ImageCollectionRow[]>(
		'SELECT id FROM image_collections WHERE entity_type = $1 AND entity_id = $2 LIMIT 1',
		[entityType, entityId]
	);
	const collectionId = collectionRows[0]?.id;
	if (!collectionId) throw new Error(`${errorPrefix}_image_collection_not_found`);

	await database.execute('DELETE FROM image_collection_items WHERE collection_id = $1', [collectionId]);
	const explicitPrimaryIndex = normalizedImages.findIndex((image) => image.primary);
	const primaryIndex = explicitPrimaryIndex >= 0 ? explicitPrimaryIndex : 0;

	for (const [index, image] of normalizedImages.entries()) {
		const description = image.description?.trim() ?? '';
		if (description.length > FIELD_LIMITS.imageDescription) throw new Error('field_limit_exceeded');
		const imageBytes = await loadDefaultProductImageBytes(image.source);
		await database.execute(
			`INSERT INTO image_collection_items (
				collection_id, image_blob, original_image_blob, description, is_primary, sort_order, updated_at
			)
			 VALUES ($1, ${bytesToSqlLiteral(imageBytes)}, ${bytesToSqlLiteral(imageBytes)}, $2, $3, $4, CURRENT_TIMESTAMP)`,
			[collectionId, description || null, index === primaryIndex ? 1 : 0, index]
		);
	}
}

async function ensureDefaultProductImages(database: Database, catalogItemId: string, images: readonly DefaultProductCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, catalogItemId, PRODUCT_CATALOG_IMAGE_MAX_ITEMS, images, 'default_product');
}

async function ensureDefaultManufacturerImages(database: Database, manufacturerId: string, images: readonly DefaultManufacturerCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, manufacturerId, MANUFACTURER_CATALOG_IMAGE_MAX_ITEMS, images, 'default_manufacturer');
}

async function ensureDefaultActiveIngredientImages(database: Database, activeIngredientId: string, images: readonly DefaultActiveIngredientCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE, activeIngredientId, ACTIVE_INGREDIENT_CATALOG_IMAGE_MAX_ITEMS, images, 'default_active_ingredient');
}

function normalizedDefaultBreedReferenceImages(images: readonly DefaultBreedReferenceImage[] | null | undefined): DefaultBreedReferenceImage[] {
	const normalized = (images ?? []).filter((image) => image.source.trim());
	if (normalized.length === 0) return [];
	if (normalized.length > BREED_REFERENCE_IMAGE_MAX_ITEMS) throw new Error('default_breed_reference_image_limit_exceeded');
	if (normalized.filter((image) => image.primary).length > 1) throw new Error('default_breed_reference_image_multiple_primary');
	return normalized;
}

async function breedReferenceImageCollectionItemCount(database: Database, referenceItemId: number): Promise<number> {
	const rows = await database.select<CountRow[]>(
		`SELECT COUNT(*) AS total
		 FROM image_collection_items item
		 INNER JOIN image_collections collection ON collection.id = item.collection_id
		 WHERE collection.entity_type = $1 AND collection.entity_id = $2`,
		[BREED_REFERENCE_IMAGE_COLLECTION_TYPE, referenceItemId]
	);
	return Number(rows[0]?.total ?? 0);
}

async function ensureDefaultBreedReferenceImages(database: Database, referenceItemId: number, images: readonly DefaultBreedReferenceImage[] | null | undefined): Promise<void> {
	const normalizedImages = normalizedDefaultBreedReferenceImages(images);
	if (normalizedImages.length === 0) return;
	if ((await breedReferenceImageCollectionItemCount(database, referenceItemId)) > 0) return;

	await database.execute(
		`INSERT INTO image_collections (entity_type, entity_id, primary_required, max_items, updated_at)
		 VALUES ($1, $2, 1, $3, CURRENT_TIMESTAMP)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items,
			updated_at = CURRENT_TIMESTAMP`,
		[BREED_REFERENCE_IMAGE_COLLECTION_TYPE, referenceItemId, BREED_REFERENCE_IMAGE_MAX_ITEMS]
	);

	const collectionRows = await database.select<ImageCollectionRow[]>(
		'SELECT id FROM image_collections WHERE entity_type = $1 AND entity_id = $2 LIMIT 1',
		[BREED_REFERENCE_IMAGE_COLLECTION_TYPE, referenceItemId]
	);
	const collectionId = collectionRows[0]?.id;
	if (!collectionId) throw new Error('default_breed_reference_image_collection_not_found');

	await database.execute('DELETE FROM image_collection_items WHERE collection_id = $1', [collectionId]);
	const explicitPrimaryIndex = normalizedImages.findIndex((image) => image.primary);
	const primaryIndex = explicitPrimaryIndex >= 0 ? explicitPrimaryIndex : 0;

	for (const [index, image] of normalizedImages.entries()) {
		const description = image.description?.trim() ?? '';
		if (description.length > FIELD_LIMITS.imageDescription) throw new Error('field_limit_exceeded');
		const imageBytes = await loadDefaultProductImageBytes(image.source);
		await database.execute(
			`INSERT INTO image_collection_items (
				collection_id, image_blob, original_image_blob, description, is_primary, sort_order, updated_at
			)
			 VALUES ($1, ${bytesToSqlLiteral(imageBytes)}, ${bytesToSqlLiteral(imageBytes)}, $2, $3, $4, CURRENT_TIMESTAMP)`,
			[collectionId, description || null, index === primaryIndex ? 1 : 0, index]
		);
	}
}

async function syncDefaultManufacturerCatalog(database: Database): Promise<void> {
	for (const item of defaultManufacturerCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyManufacturerCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_manufacturer_extension_limit_exceeded');
		const values = [item.id, stringifyManufacturerType(item.type), item.name, normalizedName, JSON.stringify(item.aliases), item.origin, JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ManufacturerCatalogRow[]>(
			'SELECT id, origin FROM manufacturer_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]?.origin === 'system') {
			await database.execute(
				`UPDATE manufacturer_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					aliases = $5,
					origin = $6,
					regions = $7,
					extension = $8,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1
					AND origin = 'system'`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO manufacturer_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					aliases = excluded.aliases,
					regions = excluded.regions,
					extension = excluded.extension,
					updated_at = CURRENT_TIMESTAMP
				 WHERE manufacturer_catalog_items.origin = 'system'`,
				values
			);
		}

		const rows = await database.select<ManufacturerCatalogRow[]>(
			'SELECT id, origin FROM manufacturer_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const manufacturer = rows[0];
		if (manufacturer?.origin === 'system') await ensureDefaultManufacturerImages(database, manufacturer.id, item.images);
	}
}

async function syncDefaultActiveIngredientCatalog(database: Database): Promise<void> {
	for (const item of defaultActiveIngredientCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyActiveIngredientCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_active_ingredient_extension_limit_exceeded');
		const values = [item.id, stringifyActiveIngredientType(item.type), item.name, normalizedName, JSON.stringify(item.aliases), item.origin, JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ActiveIngredientCatalogRow[]>(
			'SELECT id, origin FROM active_ingredient_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]?.origin === 'system') {
			await database.execute(
				`UPDATE active_ingredient_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					aliases = $5,
					origin = $6,
					regions = $7,
					extension = $8,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1
					AND origin = 'system'`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO active_ingredient_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					aliases = excluded.aliases,
					regions = excluded.regions,
					extension = excluded.extension,
					updated_at = CURRENT_TIMESTAMP
				 WHERE active_ingredient_catalog_items.origin = 'system'`,
				values
			);
		}

		const rows = await database.select<ActiveIngredientCatalogRow[]>(
			'SELECT id, origin FROM active_ingredient_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const activeIngredient = rows[0];
		if (activeIngredient?.origin === 'system') await ensureDefaultActiveIngredientImages(database, activeIngredient.id, item.images);
	}
}

async function syncDefaultProductCatalog(database: Database): Promise<void> {
	for (const item of defaultProductCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyProductCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_product_extension_limit_exceeded');
		const values = [item.id, stringifyProductType(item.type), item.name, normalizedName, JSON.stringify(item.species), JSON.stringify(item.aliases), item.manufacturerId, item.origin, JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ProductCatalogRow[]>(
			'SELECT id, origin FROM product_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]?.origin === 'system') {
			await database.execute(
				`UPDATE product_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					species = $5,
					aliases = $6,
					manufacturer_id = $7,
					origin = $8,
					regions = $9,
					extension = $10,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1
					AND origin = 'system'`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, origin, regions, extension, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					species = excluded.species,
					aliases = excluded.aliases,
					manufacturer_id = excluded.manufacturer_id,
					regions = excluded.regions,
					extension = excluded.extension,
					updated_at = CURRENT_TIMESTAMP
				 WHERE product_catalog_items.origin = 'system'`,
				values
			);
		}

		const rows = await database.select<ProductCatalogRow[]>(
			'SELECT id, origin FROM product_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const catalogItem = rows[0];
		if (catalogItem?.origin === 'system') {
			await ensureDefaultProductImages(database, catalogItem.id, item.images);
			await database.execute('DELETE FROM product_active_ingredients WHERE product_id = $1', [catalogItem.id]);
			for (const [sortOrder, activeIngredientId] of (item.activeIngredientIds ?? []).entries()) {
				const activeRows = await database.select<ActiveIngredientCatalogRow[]>(
					'SELECT id, origin FROM active_ingredient_catalog_items WHERE id = $1 LIMIT 1',
					[activeIngredientId]
				);
				if (!activeRows[0]) throw new Error(`default_product_active_ingredient_not_found:${activeIngredientId}`);
				await database.execute(
					`INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order, updated_at)
					 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
					 ON CONFLICT(product_id, active_ingredient_id) DO UPDATE SET
						sort_order = excluded.sort_order,
						updated_at = CURRENT_TIMESTAMP`,
					[catalogItem.id, activeIngredientId, sortOrder]
				);
			}
		}
	}
}

async function syncDefaultBreedReferenceCatalog(database: Database): Promise<void> {
	for (const item of defaultBreedReferenceItems) {
		const averageWeightKg = stringifyBreedSexRange(item.averageWeightKg);
		const averageHeightCm = stringifyBreedSexRange(item.averageHeightCm);
		const extension = stringifyBreedReferenceExtension(item.extension);
		if (extension.length > FIELD_LIMITS.breedReferenceExtensionJson) throw new Error('default_breed_reference_extension_limit_exceeded');

		await database.execute(
			`INSERT INTO breed_reference_items (
				breed_id,
				species,
				label_key,
				origin_id,
				origin_label_key,
				origin_country_code,
				origin_latitude,
				origin_longitude,
				size_category,
				average_weight_kg,
				average_height_cm,
				extension,
				updated_at
			)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
			 ON CONFLICT(breed_id) DO UPDATE SET
				species = excluded.species,
				label_key = excluded.label_key,
				origin_id = excluded.origin_id,
				origin_label_key = excluded.origin_label_key,
				origin_country_code = excluded.origin_country_code,
				origin_latitude = excluded.origin_latitude,
				origin_longitude = excluded.origin_longitude,
				size_category = excluded.size_category,
				average_weight_kg = excluded.average_weight_kg,
				average_height_cm = excluded.average_height_cm,
				extension = excluded.extension,
				updated_at = CURRENT_TIMESTAMP`,
			[
				item.id,
				item.species,
				item.labelKey,
				item.origin.id,
				item.origin.labelKey ?? null,
				item.origin.countryCode ?? null,
				item.origin.latitude,
				item.origin.longitude,
				item.sizeCategory,
				averageWeightKg,
				averageHeightCm,
				extension
			]
		);

		const rows = await database.select<BreedReferenceRow[]>(
			'SELECT id FROM breed_reference_items WHERE breed_id = $1 LIMIT 1',
			[item.id]
		);
		const referenceItem = rows[0];
		if (referenceItem) await ensureDefaultBreedReferenceImages(database, referenceItem.id, item.images);
	}
}

async function isBreedReferenceCatalogEmpty(database: Database): Promise<boolean> {
	const rows = await database.select<CountRow[]>('SELECT COUNT(*) AS total FROM breed_reference_items');
	return Number(rows[0]?.total ?? 0) === 0;
}

async function hasSystemTreatmentProtocols(database: Database): Promise<boolean> {
	const rows = await database.select<CountRow[]>("SELECT COUNT(*) AS total FROM treatment_protocols WHERE origin = 'system'");
	return Number(rows[0]?.total ?? 0) > 0;
}

async function syncDefaultTreatmentProtocols(database: Database): Promise<void> {
	for (const protocol of defaultTreatmentProtocols) {
		const normalizedName = normalizeProductCatalogName(protocol.name);
		const species = stringifyTreatmentSpecies(protocol.species);
		await database.execute(
			`INSERT INTO treatment_protocols (id, kind, origin, name, normalized_name, species, observation, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(sort_order) + 1 FROM treatment_protocols WHERE kind = $2), 0), CURRENT_TIMESTAMP)
			 ON CONFLICT(id) DO NOTHING`,
			[protocol.id, protocol.kind, protocol.origin, protocol.name, normalizedName, species, protocol.observation]
		);

		const protocolRows = await database.select<TreatmentProtocolRow[]>(
			`SELECT id, origin FROM treatment_protocols WHERE id = $1 LIMIT 1`,
			[protocol.id]
		);
		const storedProtocol = protocolRows[0];
		if (!storedProtocol) throw new Error(`default_protocol_not_found:${protocol.name}`);
		if (storedProtocol.origin !== 'system') continue;

		await database.execute(
			`UPDATE treatment_protocols
			 SET name = $2,
				species = $3,
				observation = $4,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1
				AND origin = 'system'
				AND (
					name <> $2
					OR species <> $3
					OR COALESCE(observation, '') <> COALESCE($4, '')
				)`,
			[storedProtocol.id, protocol.name, species, protocol.observation]
		);

		await database.execute('DELETE FROM treatment_protocol_items WHERE protocol_id = $1', [storedProtocol.id]);

		for (const [sortOrder, catalogItemId] of protocol.catalogItemIds.entries()) {
			const expectedProductType = stringifyProductType(productType('medication', protocol.kind));
			const catalogRows = await database.select<{ id: string }[]>(
				'SELECT id FROM product_catalog_items WHERE type = $1 AND id = $2 LIMIT 1',
				[expectedProductType, catalogItemId]
			);
			if (!catalogRows[0]) throw new Error(`default_protocol_catalog_item_not_found:${catalogItemId}`);

			await database.execute(
				`INSERT INTO treatment_protocol_items (protocol_id, catalog_item_id, sort_order, updated_at)
				 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
				[storedProtocol.id, catalogItemId, sortOrder]
			);
		}

		await database.execute('DELETE FROM treatment_protocol_doses WHERE protocol_id = $1', [storedProtocol.id]);

		for (const [sortOrder, dose] of protocol.doses.entries()) {
			await database.execute(
				`INSERT INTO treatment_protocol_doses (protocol_id, dose, validity_value, validity_unit, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
				[storedProtocol.id, dose.dose, dose.validityValue, dose.validityUnit, sortOrder]
			);
		}
	}
}

async function createCurrentSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerName)}),
			avatar_blob BLOB,
			additional_information TEXT CHECK(${optionalTextCheck('additional_information', FIELD_LIMITS.ownerAdditionalInformation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS veterinarian_profiles (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.veterinarianName)}),
			professional_registration TEXT CHECK(${optionalTextCheck('professional_registration', FIELD_LIMITS.veterinarianProfessionalRegistration)}),
			avatar_blob BLOB,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS workplaces (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.workplaceName)}),
			services_description TEXT CHECK(${optionalTextCheck('services_description', FIELD_LIMITS.workplaceServicesDescription)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS addresses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER,
			workplace_id INTEGER,
			street TEXT CHECK(${optionalTextCheck('street', FIELD_LIMITS.ownerStreet)}),
			street_number TEXT CHECK(${optionalTextCheck('street_number', FIELD_LIMITS.ownerStreetNumber)}),
			address_complement TEXT CHECK(${optionalTextCheck('address_complement', FIELD_LIMITS.ownerAddressComplement)}),
			neighborhood TEXT CHECK(${optionalTextCheck('neighborhood', FIELD_LIMITS.ownerNeighborhood)}),
			city TEXT CHECK(${optionalTextCheck('city', FIELD_LIMITS.ownerCity)}),
			state TEXT CHECK(${optionalTextCheck('state', FIELD_LIMITS.ownerState)}),
			country TEXT NOT NULL DEFAULT 'BRA' CHECK(length(country) = ${FIELD_LIMITS.ownerCountry}),
			postal_code TEXT CHECK(${optionalTextCheck('postal_code', FIELD_LIMITS.ownerPostalCode)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK((owner_id IS NOT NULL) + (workplace_id IS NOT NULL) = 1),
			UNIQUE(owner_id),
			UNIQUE(workplace_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL CHECK(${requiredTextCheck('entity_type', FIELD_LIMITS.imageCollectionEntityType)}),
			entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(entity_type, entity_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collection_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			collection_id INTEGER NOT NULL,
			image_blob BLOB NOT NULL CHECK(length(image_blob) > 0),
			original_image_blob BLOB NOT NULL CHECK(length(original_image_blob) > 0),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.imageDescription)}),
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER,
			responsible_id INTEGER,
			veterinarian_profile_id INTEGER,
			workplace_id INTEGER,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			FOREIGN KEY (veterinarian_profile_id) REFERENCES veterinarian_profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK(
				(owner_id IS NOT NULL) +
				(responsible_id IS NOT NULL) +
				(veterinarian_profile_id IS NOT NULL) +
				(workplace_id IS NOT NULL) = 1
			),
			UNIQUE(owner_id, kind, label, value),
			UNIQUE(responsible_id, kind, label, value),
			UNIQUE(veterinarian_profile_id, kind, label, value),
			UNIQUE(workplace_id, kind, label, value)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_additional_responsibles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerAdditionalResponsibleName)}),
			avatar_blob BLOB,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.petName)}),
			birth_date TEXT CHECK(${optionalTextCheck('birth_date', FIELD_LIMITS.petBirthDate)}),
			species TEXT CHECK(${optionalTextCheck('species', FIELD_LIMITS.petSpecies)}),
			breed TEXT CHECK(${optionalTextCheck('breed', FIELD_LIMITS.petBreed)}),
			sex TEXT CHECK(sex IS NULL OR (sex IN ('M', 'F') AND length(sex) = ${FIELD_LIMITS.petSex})),
			avatar_blob BLOB,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS breed_reference_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			breed_id TEXT NOT NULL CHECK(${requiredTextCheck('breed_id', FIELD_LIMITS.breedReferenceId)}),
			species TEXT NOT NULL CHECK(species IN ('canine', 'feline')),
			label_key TEXT NOT NULL CHECK(${requiredTextCheck('label_key', FIELD_LIMITS.breedReferenceLabelKey)}),
			origin_id TEXT NOT NULL CHECK(${requiredTextCheck('origin_id', FIELD_LIMITS.breedReferenceOriginId)}),
			origin_label_key TEXT CHECK(${optionalTextCheck('origin_label_key', FIELD_LIMITS.breedReferenceLabelKey)}),
			origin_country_code TEXT CHECK(${optionalTextCheck('origin_country_code', FIELD_LIMITS.breedReferenceOriginCountryCode)}),
			origin_latitude REAL,
			origin_longitude REAL,
			size_category TEXT NOT NULL CHECK(size_category IN ('small', 'medium', 'large', 'giant')),
			average_weight_kg TEXT NOT NULL CHECK(${requiredTextCheck('average_weight_kg', FIELD_LIMITS.breedReferenceRangeJson)}),
			average_height_cm TEXT NOT NULL CHECK(${requiredTextCheck('average_height_cm', FIELD_LIMITS.breedReferenceRangeJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.breedReferenceExtensionJson)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(breed_id),
			CHECK((origin_latitude IS NULL AND origin_longitude IS NULL) OR (origin_latitude BETWEEN -90 AND 90 AND origin_longitude BETWEEN -180 AND 180))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			owner_id INTEGER NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(pet_id, owner_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS medical_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			title TEXT CHECK(${optionalTextCheck('title', FIELD_LIMITS.medicalRecordTitle)}),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.medicalRecordDescription)}),
			admitted_at TEXT DEFAULT CURRENT_DATE CHECK(${optionalTextCheck('admitted_at', FIELD_LIMITS.isoDate)}),
			discharged_at TEXT CHECK(${optionalTextCheck('discharged_at', FIELD_LIMITS.isoDate)}),
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY CHECK(${requiredTextCheck('key', FIELD_LIMITS.settingKey)}),
			value TEXT CHECK(${optionalTextCheck('value', FIELD_LIMITS.settingValue)}),
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS backup_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			path TEXT NOT NULL CHECK(${requiredTextCheck('path', FIELD_LIMITS.backupPath)}),
			kind TEXT NOT NULL CHECK(kind IN ('manual_backup', 'automatic_backup', 'export', 'import', 'pre_import_backup') AND length(kind) <= ${FIELD_LIMITS.backupKind}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS manufacturer_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type = '["manufacturer",null]'),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productManufacturer)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS active_ingredient_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN ('["activeIngredient","substance"]', '["activeIngredient","combination"]')),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productName)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS product_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN (${PRODUCT_TYPE_SQL_VALUES})),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.productSpeciesJson)}),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			manufacturer_id TEXT CHECK(manufacturer_id IS NULL OR ${uuidV4TextCheck('manufacturer_id')}),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (manufacturer_id) REFERENCES manufacturer_catalog_items(id) ON DELETE SET NULL,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productName)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS product_active_ingredients (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id TEXT NOT NULL CHECK(${uuidV4TextCheck('product_id')}),
			active_ingredient_id TEXT NOT NULL CHECK(${uuidV4TextCheck('active_ingredient_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
			FOREIGN KEY (active_ingredient_id) REFERENCES active_ingredient_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(product_id, active_ingredient_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocols (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.treatmentProtocolName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.treatmentProtocolNormalizedName)}),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.productSpeciesJson)}),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.treatmentObservation)}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

		await database.execute(`
			CREATE TABLE IF NOT EXISTS treatment_protocol_items (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				protocol_id TEXT NOT NULL CHECK(${uuidV4TextCheck('protocol_id')}),
				catalog_item_id TEXT NOT NULL CHECK(${uuidV4TextCheck('catalog_item_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			FOREIGN KEY (catalog_item_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocol_doses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			protocol_id TEXT NOT NULL CHECK(${uuidV4TextCheck('protocol_id')}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.treatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.treatmentValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.treatmentValidityMonths}) OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.treatmentValidityYears}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_treatments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.treatmentName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.treatmentNormalizedName)}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.treatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.treatmentObservation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK(
				(validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.treatmentValidityDays})
				OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.treatmentValidityMonths})
				OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.treatmentValidityYears})
			)
		)
	`);

}

export async function createCurrentIndexes(database: Database): Promise<void> {
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_owner_id ON addresses(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_workplace_id ON addresses(workplace_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_state ON addresses(state)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_responsible_id ON contacts(responsible_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_veterinarian_profile_id ON contacts(veterinarian_profile_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_workplace_id ON contacts(workplace_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_label ON contacts(label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_value ON contacts(value)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collection_items_collection_id ON image_collection_items(collection_id, sort_order, id)');
	await database.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_name ON owner_additional_responsibles(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_owner_id ON pet_owners(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_breed_reference_items_species_label ON breed_reference_items(species, label_key COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_breed_reference_items_origin_id ON breed_reference_items(origin_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_type_name ON manufacturer_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_hidden_at ON manufacturer_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_type_name ON active_ingredient_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_hidden_at ON active_ingredient_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_name ON product_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_normalized_name ON product_catalog_items(type, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_manufacturer_id ON product_catalog_items(manufacturer_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_hidden_at ON product_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_product_id ON product_active_ingredients(product_id, sort_order, id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_active_ingredient_id ON product_active_ingredients(active_ingredient_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_kind_name ON treatment_protocols(kind, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_kind_normalized_name ON treatment_protocols(kind, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_hidden_at ON treatment_protocols(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_deleted_at ON treatment_protocols(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_items_protocol_id ON treatment_protocol_items(protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_items_catalog_item_id ON treatment_protocol_items(catalog_item_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_doses_protocol_id ON treatment_protocol_doses(protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_pet_id ON pet_treatments(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_kind_applied_at ON pet_treatments(kind, applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_kind_normalized_name ON pet_treatments(kind, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_latest_active ON pet_treatments(kind, pet_id, normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_validity_ignored_at ON pet_treatments(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_treatments_deleted_at ON pet_treatments(deleted_at)');
}

async function assertCurrentSchema(database: Database): Promise<void> {
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code'])) &&
		(await tableHasColumns(database, 'veterinarian_profiles', ['id', 'name', 'professional_registration', 'avatar_blob'])) &&
		(await tableHasColumns(database, 'workplaces', ['id', 'name', 'services_description'])) &&
		(await tableHasColumns(database, 'image_collections', ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items'])) &&
		(await tableHasColumns(database, 'image_collection_items', ['id', 'collection_id', 'image_blob', 'original_image_blob', 'description', 'is_primary', 'sort_order'])) &&
		(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value'])) &&
		(await tableHasColumns(database, 'owner_additional_responsibles', ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order'])) &&
		(await tableHasColumns(database, 'pets', ['id', 'name', 'species', 'breed', 'updated_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'breed_reference_items', ['id', 'breed_id', 'species', 'label_key', 'origin_id', 'origin_label_key', 'origin_country_code', 'origin_latitude', 'origin_longitude', 'size_category', 'average_weight_kg', 'average_height_cm', 'extension'])) &&
		(await tableHasColumns(database, 'pet_owners', ['id', 'pet_id', 'owner_id', 'sort_order'])) &&
		(await tableHasColumns(database, 'medical_records', ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'deleted_at', 'purge_after'])) &&
			(await tableHasColumns(database, 'app_settings', ['key', 'value', 'updated_at'])) &&
			(await tableHasColumns(database, 'schema_migrations', ['version', 'name', 'app_version', 'applied_at'])) &&
			(await tableHasColumns(database, 'backup_history', ['id', 'path', 'kind', 'created_at'])) &&
			(await tableHasExactColumns(database, 'manufacturer_catalog_items', ['id', 'type', 'name', 'normalized_name', 'aliases', 'origin', 'regions', 'extension', 'hidden_at', 'created_at', 'updated_at'])) &&
			(await tableHasExactColumns(database, 'active_ingredient_catalog_items', ['id', 'type', 'name', 'normalized_name', 'aliases', 'origin', 'regions', 'extension', 'hidden_at', 'created_at', 'updated_at'])) &&
			(await tableHasExactColumns(database, 'product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer_id', 'origin', 'regions', 'extension', 'hidden_at', 'created_at', 'updated_at'])) &&
			(await tableHasColumns(database, 'product_active_ingredients', ['id', 'product_id', 'active_ingredient_id', 'sort_order'])) &&
			(await productCatalogHasCurrentTypes(database)) &&
		(await tableHasColumns(database, 'treatment_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'treatment_protocol_items', ['id', 'protocol_id', 'catalog_item_id', 'sort_order'])) &&
		(await tableHasColumns(database, 'treatment_protocol_doses', ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order'])) &&
		(await tableHasColumns(database, 'pet_treatments', ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'validity_ignored_at']));

	if (!valid) throw new Error('database_schema_current_invalid');
}

async function hasCurrentUnversionedSchema(database: Database): Promise<boolean> {
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information'])) &&
			(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code'])) &&
			(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value'])) &&
			(await tableHasColumns(database, 'manufacturer_catalog_items', ['id', 'type', 'name', 'normalized_name'])) &&
			(await tableHasColumns(database, 'active_ingredient_catalog_items', ['id', 'type', 'name', 'normalized_name'])) &&
			(await tableHasColumns(database, 'product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'manufacturer_id'])) &&
			(await tableHasColumns(database, 'product_active_ingredients', ['id', 'product_id', 'active_ingredient_id'])) &&
			(await tableHasColumns(database, 'treatment_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name'])) &&
		(await tableHasColumns(database, 'pet_treatments', ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit']));

	return valid;
}

async function hasSchemaMigrationRecord(database: Database, version: number): Promise<boolean> {
	if (!(await tableExists(database, 'schema_migrations'))) return false;
	const rows = await database.select<MigrationRecordRow[]>('SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1', [version]);
	return rows.length > 0;
}

export async function getSchemaStatus(database: Database): Promise<SchemaStatus> {
	const currentVersion = await getUserVersion(database);

	if (currentVersion > CURRENT_SCHEMA_VERSION) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: false,
			detection: 'versioned',
			isSupported: false,
			reason: 'future-version'
		};
	}

	if (currentVersion > 0) {
		if (currentVersion === CURRENT_SCHEMA_VERSION && !(await hasCurrentUnversionedSchema(database))) {
			return {
				currentVersion,
				targetVersion: CURRENT_SCHEMA_VERSION,
				migrationRequired: false,
				detection: 'versioned',
				isSupported: false,
				reason: 'unknown-schema'
			};
		}

		const missingMetadata = !(await hasSchemaMigrationRecord(database, currentVersion));
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: currentVersion < CURRENT_SCHEMA_VERSION || missingMetadata,
			detection: 'versioned',
			isSupported: true
		};
	}

	if (await isEmptyDatabase(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'empty',
			isSupported: true
		};
	}

	if (await hasCurrentUnversionedSchema(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'current-unversioned',
			isSupported: true
		};
	}

	return {
		currentVersion,
		targetVersion: CURRENT_SCHEMA_VERSION,
		migrationRequired: false,
		detection: 'unknown-unversioned',
		isSupported: false,
		reason: 'unknown-schema'
	};
}

export async function assertDatabaseCanMigrate(database: Database): Promise<SchemaStatus> {
	const status = await getSchemaStatus(database);
	if (status.isSupported) return status;

	if (status.reason === 'future-version') throw new Error(`database_schema_from_future:${status.currentVersion}`);
	throw new Error('database_schema_unsupported');
}

async function ensureMigrationMetadataTable(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

async function recordMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await database.execute(
		`INSERT OR IGNORE INTO schema_migrations (version, name, app_version, applied_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
		[migration.version, migration.name, migration.introducedInAppVersion]
	);
	await setUserVersion(database, migration.version);
}

async function backfillMigrationMetadata(database: Database, version: number): Promise<void> {
	for (const migration of SCHEMA_MIGRATIONS.filter((item) => item.version <= version)) {
		await recordMigration(database, migration);
	}
}

async function validateDatabaseIntegrity(database: Database): Promise<void> {
	const integrityRows = await database.select<IntegrityCheckRow[]>('PRAGMA integrity_check');
	const integrityResult = integrityRows[0]?.integrity_check;
	if (integrityResult !== 'ok') throw new Error(`database_integrity_check_failed:${integrityResult ?? 'unknown'}`);

	const foreignKeyRows = await database.select<ForeignKeyCheckRow[]>('PRAGMA foreign_key_check');
	if (foreignKeyRows.length > 0) {
		const violation = foreignKeyRows[0];
		throw new Error(`database_foreign_key_check_failed:${violation.table}.${violation.rowid}->${violation.parent}`);
	}
}

const BASELINE_SCHEMA_MIGRATION = {
	version: 1,
	name: '0001_baseline_current_schema',
	introducedInAppVersion: BASELINE_APP_VERSION,
	up: createCurrentSchema,
	verify: assertCurrentSchema
} satisfies SchemaMigration;

function buildSchemaMigrationRegistry(): SchemaMigration[] {
	const migrations = [BASELINE_SCHEMA_MIGRATION, ...incrementalSchemaMigrations].sort((first, second) => first.version - second.version);
	const seenVersions = new Set<number>();

	for (const migration of migrations) {
		if (seenVersions.has(migration.version)) throw new Error(`database_schema_migration_duplicate:${migration.version}`);
		seenVersions.add(migration.version);
		if (migration.version > CURRENT_SCHEMA_VERSION) throw new Error(`database_schema_migration_above_current:${migration.version}`);
	}

	for (let expectedVersion = 1; expectedVersion <= CURRENT_SCHEMA_VERSION; expectedVersion += 1) {
		if (!seenVersions.has(expectedVersion)) throw new Error(`database_schema_migration_registry_gap:${expectedVersion}`);
	}

	return migrations;
}

const SCHEMA_MIGRATIONS = buildSchemaMigrationRegistry();

async function applyMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await migration.up(database);
	if (migration.verify) await migration.verify(database);
	await recordMigration(database, migration);
}

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	const { createIndexes = true, seedDefaultData = false, syncDefaultProductData = true, syncDefaultTreatmentProtocolData = true, syncDefaultBreedReferenceData = true } = options;
	const status = await assertDatabaseCanMigrate(database);
	let appliedSchemaChange = false;

	await database.execute('BEGIN IMMEDIATE');
	try {
		await ensureMigrationMetadataTable(database);

		if (status.detection === 'current-unversioned') {
			await createCurrentSchema(database);
			await assertCurrentSchema(database);
			await backfillMigrationMetadata(database, CURRENT_SCHEMA_VERSION);
			appliedSchemaChange = true;
		} else {
			const unappliedMigrations = SCHEMA_MIGRATIONS.filter((migration) => migration.version > status.currentVersion && migration.version <= CURRENT_SCHEMA_VERSION);
			for (const migration of unappliedMigrations) {
				await applyMigration(database, migration);
			}
			appliedSchemaChange = unappliedMigrations.length > 0;

			if (status.detection === 'versioned' && status.migrationRequired && unappliedMigrations.length === 0) {
				await backfillMigrationMetadata(database, status.currentVersion);
			}
		}

		await createCurrentSchema(database);
		await assertCurrentSchema(database);

		if (seedDefaultData || (syncDefaultProductData && appliedSchemaChange)) {
			await syncDefaultManufacturerCatalog(database);
			await syncDefaultActiveIngredientCatalog(database);
			await syncDefaultProductCatalog(database);
		}
		if (seedDefaultData || (syncDefaultBreedReferenceData && (appliedSchemaChange || (await isBreedReferenceCatalogEmpty(database))))) await syncDefaultBreedReferenceCatalog(database);
		if (seedDefaultData || (syncDefaultTreatmentProtocolData && (appliedSchemaChange || !(await hasSystemTreatmentProtocols(database))))) await syncDefaultTreatmentProtocols(database);
		if (createIndexes) await createCurrentIndexes(database);
		await validateDatabaseIntegrity(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}
