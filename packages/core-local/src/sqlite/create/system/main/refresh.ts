import { tableExists, tableHasColumns, tableSql } from '../../shared/table-introspection.js';
import type { Database } from '../../shared/types.js';

async function systemCatalogSchemaNeedsRefresh(database: Database): Promise<boolean> {
	if ((await tableExists(database, 'image_collection_items')) && (await tableHasColumns(database, 'image_collection_items', ['image_blob', 'original_image_blob']))) return true;
	if ((await tableExists(database, 'breed_reference_items')) && /AUTOINCREMENT|INTEGER\s+PRIMARY\s+KEY/i.test(await tableSql(database, 'breed_reference_items'))) return true;
	if ((await tableExists(database, 'image_collections')) && (await tableHasColumns(database, 'image_collections', ['created_at']))) return true;
	if ((await tableExists(database, 'image_collection_items')) && (await tableHasColumns(database, 'image_collection_items', ['created_at']))) return true;
	if ((await tableExists(database, 'breed_reference_items')) && (await tableHasColumns(database, 'breed_reference_items', ['created_at']))) return true;
	if ((await tableExists(database, 'product_catalog_items')) && (await tableHasColumns(database, 'product_catalog_items', ['removed_at']))) return true;
	if ((await tableExists(database, 'product_active_ingredients')) && (await tableHasColumns(database, 'product_active_ingredients', ['removed_at']))) return true;
	if ((await tableExists(database, 'treatment_protocols')) && (await tableHasColumns(database, 'treatment_protocols', ['deleted_at', 'purge_after']))) return true;
	if ((await tableExists(database, 'treatment_protocols')) && (await tableHasColumns(database, 'treatment_protocols', ['created_at', 'updated_by', 'removed_at']))) return true;
	if ((await tableExists(database, 'treatment_protocol_items')) && (await tableHasColumns(database, 'treatment_protocol_items', ['created_at', 'updated_by', 'removed_at']))) return true;
	if ((await tableExists(database, 'treatment_protocol_doses')) && (await tableHasColumns(database, 'treatment_protocol_doses', ['created_at', 'updated_by', 'removed_at']))) return true;
	const catalogTables = ['manufacturer_catalog_items', 'active_ingredient_catalog_items', 'condition_catalog_items', 'product_catalog_items'] as const;
	for (const table of catalogTables) {
		if ((await tableExists(database, table)) && (await tableHasColumns(database, table, ['origin']))) return true;
		if ((await tableExists(database, table)) && (await tableHasColumns(database, table, ['created_at', 'updated_at', 'removed_at']))) return true;
	}
	return false;
}

export async function refreshOutdatedSystemCatalogSchema(database: Database): Promise<void> {
	if (!(await systemCatalogSchemaNeedsRefresh(database))) return;
	await database.execute('DROP TABLE IF EXISTS treatment_protocol_items');
	await database.execute('DROP TABLE IF EXISTS product_active_ingredients');
	await database.execute('DROP TABLE IF EXISTS product_catalog_items');
	await database.execute('DROP TABLE IF EXISTS manufacturer_catalog_items');
	await database.execute('DROP TABLE IF EXISTS active_ingredient_catalog_items');
	await database.execute('DROP TABLE IF EXISTS condition_catalog_items');
	await database.execute('DROP TABLE IF EXISTS breed_reference_items');
	await database.execute('DROP TABLE IF EXISTS image_collection_items');
	await database.execute('DROP TABLE IF EXISTS image_collections');
}

