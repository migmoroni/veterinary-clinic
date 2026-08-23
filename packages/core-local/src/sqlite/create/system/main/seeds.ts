import { stringifyActiveIngredientCatalogExtension, stringifyActiveIngredientType } from '@vet/types/domain/active-ingredient/catalog.js';
import { defaultActiveIngredientCatalogItems, type DefaultActiveIngredientCatalogImage } from '@vet/types/domain/active-ingredient/default-catalog.js';
import { stringifyConditionCatalogExtension, stringifyConditionType } from '@vet/types/domain/condition/catalog.js';
import { defaultConditionCatalogItems, type DefaultConditionCatalogImage } from '@vet/types/domain/condition/default-catalog.js';
import { stringifyManufacturerCatalogExtension, stringifyManufacturerType } from '@vet/types/domain/manufacturer/catalog.js';
import { defaultManufacturerCatalogItems, type DefaultManufacturerCatalogImage } from '@vet/types/domain/manufacturer/default-catalog.js';
import { stringifyBreedReferenceExtension, stringifyBreedSexRange } from '@vet/types/domain/pet/breed-reference.js';
import { defaultBreedReferenceItems, type DefaultBreedReferenceImage } from '@vet/types/domain/pet/default-breed-reference.js';
import { PRODUCT_TYPES, productTypeForTreatmentKind, productTypeMatchesTreatmentKind, stringifyProductCatalogExtension, stringifyProductType } from '@vet/types/domain/product/catalog.js';
import { defaultProductCatalogItems, type DefaultProductCatalogImage } from '@vet/types/domain/product/default-catalog.js';
import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { defaultTreatmentProtocols } from '@vet/types/domain/treatment/default-protocol.js';
import { stringifyTreatmentSpecies } from '@vet/types/domain/treatment/species.js';
import { mediaHashToSqlLiteral } from '../../../operations/media/hash.js';
import { insertMediaBlob } from '../../../operations/media/repository.js';
import {
	ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE,
	ACTIVE_INGREDIENT_CATALOG_IMAGE_MAX_ITEMS,
	BREED_REFERENCE_IMAGE_COLLECTION_TYPE,
	BREED_REFERENCE_IMAGE_MAX_ITEMS,
	CONDITION_CATALOG_IMAGE_COLLECTION_TYPE,
	CONDITION_CATALOG_IMAGE_MAX_ITEMS,
	MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE,
	MANUFACTURER_CATALOG_IMAGE_MAX_ITEMS,
	PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE,
	PRODUCT_CATALOG_IMAGE_MAX_ITEMS
} from '../../shared/catalog-entities.js';
import { normalizeCatalogName as normalizeProductCatalogName } from '../../shared/sql-utils.js';
import type { CountRow, Database } from '../../shared/types.js';

interface ProductCatalogRow {
	id: string;
}

interface ManufacturerCatalogRow {
	id: string;
}

interface ActiveIngredientCatalogRow {
	id: string;
}

interface ConditionCatalogRow {
	id: string;
}

interface BreedReferenceRow {
	id: string;
}

interface TreatmentProtocolRow {
	id: string;
	origin: string;
}

interface ImageCollectionRow {
	id: string;
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

async function ensureDefaultCatalogImages(
	database: Database,
	mediaDatabase: Database,
	entityType: string,
	entityId: string,
	maxItems: number,
	images: readonly DefaultCatalogImage[] | null | undefined,
	errorPrefix: string
): Promise<void> {
	const normalizedImages = normalizedDefaultCatalogImages(images, maxItems, errorPrefix);
	if (normalizedImages.length === 0) return;
	if ((await catalogImageCollectionItemCount(database, entityType, entityId)) > 0) return;

	await database.execute(
		`INSERT INTO image_collections (id, entity_type, entity_id, primary_required, max_items)
		 VALUES ($1, $2, $3, 1, $4)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items`,
		[createUuidV7(), entityType, entityId, maxItems]
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
		const imageHash = await insertMediaBlob(mediaDatabase, imageBytes, {}, 'system');
		await database.execute(
			`INSERT INTO image_collection_items (
				id, collection_id, image_hash, original_image_hash, description, is_primary, sort_order
			)
			 VALUES ($1, $2, ${mediaHashToSqlLiteral(imageHash)}, ${mediaHashToSqlLiteral(imageHash)}, $3, $4, $5)`,
			[createUuidV7(), collectionId, description || null, index === primaryIndex ? 1 : 0, index]
		);
	}
}

async function ensureDefaultProductImages(database: Database, mediaDatabase: Database, catalogItemId: string, images: readonly DefaultProductCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, mediaDatabase, PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, catalogItemId, PRODUCT_CATALOG_IMAGE_MAX_ITEMS, images, 'default_product');
}

async function ensureDefaultManufacturerImages(database: Database, mediaDatabase: Database, manufacturerId: string, images: readonly DefaultManufacturerCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, mediaDatabase, MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, manufacturerId, MANUFACTURER_CATALOG_IMAGE_MAX_ITEMS, images, 'default_manufacturer');
}

async function ensureDefaultActiveIngredientImages(database: Database, mediaDatabase: Database, activeIngredientId: string, images: readonly DefaultActiveIngredientCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, mediaDatabase, ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE, activeIngredientId, ACTIVE_INGREDIENT_CATALOG_IMAGE_MAX_ITEMS, images, 'default_active_ingredient');
}

async function ensureDefaultConditionImages(database: Database, mediaDatabase: Database, conditionId: string, images: readonly DefaultConditionCatalogImage[] | null | undefined): Promise<void> {
	await ensureDefaultCatalogImages(database, mediaDatabase, CONDITION_CATALOG_IMAGE_COLLECTION_TYPE, conditionId, CONDITION_CATALOG_IMAGE_MAX_ITEMS, images, 'default_condition');
}

function normalizedDefaultBreedReferenceImages(images: readonly DefaultBreedReferenceImage[] | null | undefined): DefaultBreedReferenceImage[] {
	const normalized = (images ?? []).filter((image) => image.source.trim());
	if (normalized.length === 0) return [];
	if (normalized.length > BREED_REFERENCE_IMAGE_MAX_ITEMS) throw new Error('default_breed_reference_image_limit_exceeded');
	if (normalized.filter((image) => image.primary).length > 1) throw new Error('default_breed_reference_image_multiple_primary');
	return normalized;
}

async function breedReferenceImageCollectionItemCount(database: Database, referenceItemId: string): Promise<number> {
	const rows = await database.select<CountRow[]>(
		`SELECT COUNT(*) AS total
		 FROM image_collection_items item
		 INNER JOIN image_collections collection ON collection.id = item.collection_id
		 WHERE collection.entity_type = $1 AND collection.entity_id = $2`,
		[BREED_REFERENCE_IMAGE_COLLECTION_TYPE, referenceItemId]
	);
	return Number(rows[0]?.total ?? 0);
}

async function ensureDefaultBreedReferenceImages(database: Database, mediaDatabase: Database, referenceItemId: string, images: readonly DefaultBreedReferenceImage[] | null | undefined): Promise<void> {
	const normalizedImages = normalizedDefaultBreedReferenceImages(images);
	if (normalizedImages.length === 0) return;
	if ((await breedReferenceImageCollectionItemCount(database, referenceItemId)) > 0) return;

	const entityId = String(referenceItemId);
	await database.execute(
		`INSERT INTO image_collections (id, entity_type, entity_id, primary_required, max_items)
		 VALUES ($1, $2, $3, 1, $4)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items`,
		[createUuidV7(), BREED_REFERENCE_IMAGE_COLLECTION_TYPE, entityId, BREED_REFERENCE_IMAGE_MAX_ITEMS]
	);

	const collectionRows = await database.select<ImageCollectionRow[]>(
		'SELECT id FROM image_collections WHERE entity_type = $1 AND entity_id = $2 LIMIT 1',
		[BREED_REFERENCE_IMAGE_COLLECTION_TYPE, entityId]
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
		const imageHash = await insertMediaBlob(mediaDatabase, imageBytes, {}, 'system');
		await database.execute(
			`INSERT INTO image_collection_items (
				id, collection_id, image_hash, original_image_hash, description, is_primary, sort_order
			)
			 VALUES ($1, $2, ${mediaHashToSqlLiteral(imageHash)}, ${mediaHashToSqlLiteral(imageHash)}, $3, $4, $5)`,
			[createUuidV7(), collectionId, description || null, index === primaryIndex ? 1 : 0, index]
		);
	}
}

export async function syncDefaultManufacturerCatalog(database: Database, mediaDatabase: Database): Promise<void> {
	for (const item of defaultManufacturerCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyManufacturerCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_manufacturer_extension_limit_exceeded');
		const values = [item.id, stringifyManufacturerType(item.type), item.name, normalizedName, JSON.stringify(item.aliases), JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ManufacturerCatalogRow[]>(
			'SELECT id FROM manufacturer_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]) {
			await database.execute(
				`UPDATE manufacturer_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					aliases = $5,
					regions = $6,
					extension = $7
				 WHERE id = $1`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO manufacturer_catalog_items (id, type, name, normalized_name, aliases, regions, extension)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					aliases = excluded.aliases,
					regions = excluded.regions,
					extension = excluded.extension`,
				values
			);
		}

		const rows = await database.select<ManufacturerCatalogRow[]>(
			'SELECT id FROM manufacturer_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const manufacturer = rows[0];
		if (manufacturer) await ensureDefaultManufacturerImages(database, mediaDatabase, manufacturer.id, item.images);
	}
}

export async function syncDefaultActiveIngredientCatalog(database: Database, mediaDatabase: Database): Promise<void> {
	for (const item of defaultActiveIngredientCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyActiveIngredientCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_active_ingredient_extension_limit_exceeded');
		const values = [item.id, stringifyActiveIngredientType(item.type), item.name, normalizedName, JSON.stringify(item.aliases), JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ActiveIngredientCatalogRow[]>(
			'SELECT id FROM active_ingredient_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]) {
			await database.execute(
				`UPDATE active_ingredient_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					aliases = $5,
					regions = $6,
					extension = $7
				 WHERE id = $1`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO active_ingredient_catalog_items (id, type, name, normalized_name, aliases, regions, extension)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					aliases = excluded.aliases,
					regions = excluded.regions,
					extension = excluded.extension`,
				values
			);
		}

		const rows = await database.select<ActiveIngredientCatalogRow[]>(
			'SELECT id FROM active_ingredient_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const activeIngredient = rows[0];
		if (activeIngredient) await ensureDefaultActiveIngredientImages(database, mediaDatabase, activeIngredient.id, item.images);
	}
}

export async function syncDefaultConditionCatalog(database: Database, mediaDatabase: Database): Promise<void> {
	for (const item of defaultConditionCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyConditionCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_condition_extension_limit_exceeded');
		const values = [item.id, stringifyConditionType(item.type), item.name, normalizedName, JSON.stringify(item.aliases), JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ConditionCatalogRow[]>(
			'SELECT id FROM condition_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]) {
			await database.execute(
				`UPDATE condition_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					aliases = $5,
					regions = $6,
					extension = $7
				 WHERE id = $1`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO condition_catalog_items (id, type, name, normalized_name, aliases, regions, extension)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					aliases = excluded.aliases,
					regions = excluded.regions,
					extension = excluded.extension`,
				values
			);
		}

		const rows = await database.select<ConditionCatalogRow[]>(
			'SELECT id FROM condition_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const condition = rows[0];
		if (condition) await ensureDefaultConditionImages(database, mediaDatabase, condition.id, item.images);
	}
}

export async function syncDefaultProductCatalog(database: Database, mediaDatabase: Database): Promise<void> {
	for (const item of defaultProductCatalogItems) {
		const normalizedName = normalizeProductCatalogName(item.name);
		const extension = stringifyProductCatalogExtension(item.extension);
		if (extension.length > FIELD_LIMITS.productExtensionJson) throw new Error('default_product_extension_limit_exceeded');
		const values = [item.id, stringifyProductType(item.type), item.name, normalizedName, JSON.stringify(item.species), JSON.stringify(item.aliases), item.manufacturerId, JSON.stringify(item.regions), extension];

		const rowsById = await database.select<ProductCatalogRow[]>(
			'SELECT id FROM product_catalog_items WHERE id = $1 LIMIT 1',
			[item.id]
		);
		if (rowsById[0]) {
			await database.execute(
				`UPDATE product_catalog_items
				 SET type = $2,
					name = $3,
					normalized_name = $4,
					species = $5,
					aliases = $6,
					manufacturer_id = $7,
					regions = $8,
					extension = $9
				 WHERE id = $1`,
				values
			);
		} else if (!rowsById[0]) {
			await database.execute(
				`INSERT INTO product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, regions, extension)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
				 ON CONFLICT(normalized_name) DO UPDATE SET
					name = excluded.name,
					type = excluded.type,
					species = excluded.species,
					aliases = excluded.aliases,
					manufacturer_id = excluded.manufacturer_id,
					regions = excluded.regions,
					extension = excluded.extension`,
				values
			);
		}

		const rows = await database.select<ProductCatalogRow[]>(
			'SELECT id FROM product_catalog_items WHERE normalized_name = $1 LIMIT 1',
			[normalizedName]
		);
		const catalogItem = rows[0];
		if (catalogItem) {
			await ensureDefaultProductImages(database, mediaDatabase, catalogItem.id, item.images);
			await database.execute('DELETE FROM product_active_ingredients WHERE product_id = $1', [catalogItem.id]);
			for (const [sortOrder, activeIngredientId] of (item.activeIngredientIds ?? []).entries()) {
				const activeRows = await database.select<ActiveIngredientCatalogRow[]>(
					'SELECT id FROM active_ingredient_catalog_items WHERE id = $1 LIMIT 1',
					[activeIngredientId]
				);
				if (!activeRows[0]) throw new Error(`default_product_active_ingredient_not_found:${activeIngredientId}`);
				await database.execute(
					`INSERT INTO product_active_ingredients (id, product_id, active_ingredient_id, sort_order)
					 VALUES ($1, $2, $3, $4)`,
					[createUuidV7(), catalogItem.id, activeIngredientId, sortOrder]
				);
			}
		}
	}
}

export async function syncDefaultBreedReferenceCatalog(database: Database, mediaDatabase: Database): Promise<void> {
	for (const item of defaultBreedReferenceItems) {
		const averageWeightKg = stringifyBreedSexRange(item.averageWeightKg);
		const averageHeightCm = stringifyBreedSexRange(item.averageHeightCm);
		const extension = stringifyBreedReferenceExtension(item.extension);
		if (extension.length > FIELD_LIMITS.breedReferenceExtensionJson) throw new Error('default_breed_reference_extension_limit_exceeded');

		await database.execute(
			`INSERT INTO breed_reference_items (
					id,
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
					extension
				)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
					extension = excluded.extension`,
				[
					item.id,
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
		if (referenceItem) await ensureDefaultBreedReferenceImages(database, mediaDatabase, referenceItem.id, item.images);
	}
}

async function isBreedReferenceCatalogEmpty(database: Database): Promise<boolean> {
	const rows = await database.select<CountRow[]>('SELECT COUNT(*) AS total FROM breed_reference_items');
	return Number(rows[0]?.total ?? 0) === 0;
}

export async function syncDefaultTreatmentProtocols(database: Database): Promise<void> {
	for (const protocol of defaultTreatmentProtocols) {
		const normalizedName = normalizeProductCatalogName(protocol.name);
		const species = stringifyTreatmentSpecies(protocol.species);
		await database.execute(
			`INSERT INTO treatment_protocols (id, kind, origin, name, normalized_name, species, observation, sort_order)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE((SELECT MAX(sort_order) + 1 FROM treatment_protocols WHERE kind = $2), 0))
			 ON CONFLICT(id) DO UPDATE SET
				kind = excluded.kind,
				origin = excluded.origin,
				name = excluded.name,
				normalized_name = excluded.normalized_name,
				species = excluded.species,
				observation = excluded.observation`,
			[protocol.id, protocol.kind, protocol.origin, protocol.name, normalizedName, species, protocol.observation]
		);

		const protocolRows = await database.select<TreatmentProtocolRow[]>(
			`SELECT id, origin FROM treatment_protocols WHERE id = $1 LIMIT 1`,
			[protocol.id]
		);
		const storedProtocol = protocolRows[0];
		if (!storedProtocol) throw new Error(`default_protocol_not_found:${protocol.name}`);
		if (storedProtocol.origin !== 'system') continue;

		await database.execute('DELETE FROM treatment_protocol_items WHERE protocol_id = $1', [storedProtocol.id]);

		for (const [sortOrder, catalogItemId] of protocol.catalogItemIds.entries()) {
			const expectedProductTypes = [
				stringifyProductType(productTypeForTreatmentKind(protocol.kind)),
				...PRODUCT_TYPES.filter((type) => productTypeMatchesTreatmentKind(type, protocol.kind)).map(stringifyProductType)
			].filter((value, index, values) => values.indexOf(value) === index);
			const placeholders = expectedProductTypes.map((_, index) => `$${index + 1}`).join(', ');
			const catalogRows = await database.select<{ id: string }[]>(
				`SELECT id FROM product_catalog_items WHERE type IN (${placeholders}) AND id = $${expectedProductTypes.length + 1} LIMIT 1`,
				[...expectedProductTypes, catalogItemId]
			);
			if (!catalogRows[0]) throw new Error(`default_protocol_catalog_item_not_found:${catalogItemId}`);

			await database.execute(
				`INSERT INTO treatment_protocol_items (id, protocol_id, catalog_item_id, sort_order)
				 VALUES ($1, $2, $3, $4)`,
				[createUuidV7(), storedProtocol.id, catalogItemId, sortOrder]
			);
		}

		await database.execute('DELETE FROM treatment_protocol_doses WHERE protocol_id = $1', [storedProtocol.id]);

		for (const [sortOrder, dose] of protocol.doses.entries()) {
			await database.execute(
				`INSERT INTO treatment_protocol_doses (id, protocol_id, dose, validity_value, validity_unit, sort_order)
				 VALUES ($1, $2, $3, $4, $5, $6)`,
				[createUuidV7(), storedProtocol.id, dose.dose, dose.validityValue, dose.validityUnit, sortOrder]
			);
		}
	}
}
