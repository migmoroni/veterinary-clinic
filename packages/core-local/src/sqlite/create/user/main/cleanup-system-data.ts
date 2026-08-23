import {
	ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE,
	BREED_REFERENCE_IMAGE_COLLECTION_TYPE,
	CONDITION_CATALOG_IMAGE_COLLECTION_TYPE,
	MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE,
	PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE
} from '../../shared/catalog-entities.js';
import { quoteIdentifier, quoteSqlString } from '../../shared/sql-utils.js';
import { tableExists, tableHasColumns } from '../../shared/table-introspection.js';
import type { Database } from '../../shared/types.js';

const RETIRED_USER_TABLES = [
	'tag_assignments',
	'tags',
	'vaccine_dose_options',
	'vaccine_dose_types',
	'vaccine_preset_doses',
	'vaccine_presets',
	'vaccine_protocols',
	'vaccine_validity_options',
	'vaccines'
] as const;

async function deleteImageCollectionsForEntitySubquery(database: Database, entityType: string, entityIdSubquery: string): Promise<void> {
	await database.execute(`
		DELETE FROM image_collection_items
		WHERE collection_id IN (
			SELECT id
			FROM image_collections
			WHERE entity_type = ${quoteSqlString(entityType)}
				AND entity_id IN (${entityIdSubquery})
		)
	`);
	await database.execute(`
		DELETE FROM image_collections
		WHERE entity_type = ${quoteSqlString(entityType)}
			AND entity_id IN (${entityIdSubquery})
	`);
}

export async function removeSystemDataFromClientDatabase(database: Database): Promise<void> {
	if (await tableExists(database, 'breed_reference_items')) {
		await deleteImageCollectionsForEntitySubquery(database, BREED_REFERENCE_IMAGE_COLLECTION_TYPE, 'SELECT CAST(id AS TEXT) FROM breed_reference_items');
	}

	if (await tableExists(database, 'product_catalog_items')) {
		if (await tableHasColumns(database, 'product_catalog_items', ['origin'])) {
			await deleteImageCollectionsForEntitySubquery(database, PRODUCT_CATALOG_IMAGE_COLLECTION_TYPE, "SELECT id FROM product_catalog_items WHERE origin = 'system'");
		}
	}
	if (await tableExists(database, 'manufacturer_catalog_items')) {
		await deleteImageCollectionsForEntitySubquery(database, MANUFACTURER_CATALOG_IMAGE_COLLECTION_TYPE, 'SELECT id FROM manufacturer_catalog_items');
	}
	if (await tableExists(database, 'active_ingredient_catalog_items')) {
		await deleteImageCollectionsForEntitySubquery(database, ACTIVE_INGREDIENT_CATALOG_IMAGE_COLLECTION_TYPE, 'SELECT id FROM active_ingredient_catalog_items');
	}
	if (await tableExists(database, 'condition_catalog_items')) {
		await deleteImageCollectionsForEntitySubquery(database, CONDITION_CATALOG_IMAGE_COLLECTION_TYPE, 'SELECT id FROM condition_catalog_items');
	}

	if (await tableExists(database, 'treatment_protocols')) {
		await database.execute("DELETE FROM treatment_protocol_doses WHERE protocol_id IN (SELECT id FROM treatment_protocols WHERE origin = 'system')");
		await database.execute("DELETE FROM treatment_protocol_items WHERE protocol_id IN (SELECT id FROM treatment_protocols WHERE origin = 'system')");
		await database.execute("DELETE FROM treatment_protocols WHERE origin = 'system'");
	}

	await database.execute('DROP TABLE IF EXISTS product_active_ingredients');
	await database.execute('DROP TABLE IF EXISTS product_catalog_items');
	await database.execute('DROP TABLE IF EXISTS breed_reference_items');
	await database.execute('DROP TABLE IF EXISTS condition_catalog_items');
	await database.execute('DROP TABLE IF EXISTS active_ingredient_catalog_items');
	await database.execute('DROP TABLE IF EXISTS manufacturer_catalog_items');
	for (const table of RETIRED_USER_TABLES) {
		await database.execute(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`);
	}
}

