import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
import {
	ACTIVE_INGREDIENT_TYPE_SQL_VALUES,
	CONDITION_TYPE_SQL_VALUES,
	MANUFACTURER_TYPE_SQL_VALUES,
	PRODUCT_TYPE_SQL_VALUES
} from '../../shared/catalog-sql.js';
import { optionalTextCheck, requiredTextCheck, uuidTextCheck, uuidV4TextCheck } from '../../shared/sql-utils.js';
import type { Database } from '../../shared/types.js';

export async function createSystemSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collections (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			entity_type TEXT NOT NULL CHECK(${requiredTextCheck('entity_type', FIELD_LIMITS.imageCollectionEntityType)}),
			entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			UNIQUE(entity_type, entity_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collection_items (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			collection_id TEXT NOT NULL CHECK(${uuidTextCheck('collection_id')}),
			image_hash BLOB NOT NULL CHECK(length(image_hash) = 32),
			original_image_hash BLOB NOT NULL CHECK(length(original_image_hash) = 32),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.imageDescription)}),
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS breed_reference_items (
			id TEXT PRIMARY KEY CHECK(${requiredTextCheck('id', FIELD_LIMITS.breedReferenceId)}),
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
			UNIQUE(breed_id),
			CHECK((origin_latitude IS NULL AND origin_longitude IS NULL) OR (origin_latitude BETWEEN -90 AND 90 AND origin_longitude BETWEEN -180 AND 180))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS manufacturer_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN (${MANUFACTURER_TYPE_SQL_VALUES})),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productManufacturer)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS active_ingredient_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN (${ACTIVE_INGREDIENT_TYPE_SQL_VALUES})),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productName)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS condition_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN (${CONDITION_TYPE_SQL_VALUES})),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
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
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			FOREIGN KEY (manufacturer_id) REFERENCES manufacturer_catalog_items(id) ON DELETE SET NULL,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productName)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS product_active_ingredients (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			product_id TEXT NOT NULL CHECK(${uuidV4TextCheck('product_id')}),
			active_ingredient_id TEXT NOT NULL CHECK(${uuidV4TextCheck('active_ingredient_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
			FOREIGN KEY (active_ingredient_id) REFERENCES active_ingredient_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(product_id, active_ingredient_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocols (
			id TEXT PRIMARY KEY CHECK(${uuidV4TextCheck('id')}),
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			origin TEXT NOT NULL DEFAULT 'system' CHECK(origin = 'system'),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.treatmentProtocolName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.treatmentProtocolNormalizedName)}),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.productSpeciesJson)}),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.treatmentObservation)}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocol_items (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			protocol_id TEXT NOT NULL CHECK(${uuidV4TextCheck('protocol_id')}),
			catalog_item_id TEXT NOT NULL CHECK(${uuidV4TextCheck('catalog_item_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			FOREIGN KEY (catalog_item_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocol_doses (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			protocol_id TEXT NOT NULL CHECK(${uuidV4TextCheck('protocol_id')}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.treatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.treatmentValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.treatmentValidityMonths}) OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.treatmentValidityYears}))
		)
	`);
}

