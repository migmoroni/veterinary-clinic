import type { Database } from '../../shared/types.js';

export async function createSystemIndexes(database: Database): Promise<void> {
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collection_items_collection_id ON image_collection_items(collection_id, sort_order, id)');
	await database.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_breed_reference_items_species_label ON breed_reference_items(species, label_key COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_breed_reference_items_origin_id ON breed_reference_items(origin_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_type_name ON manufacturer_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_hidden_at ON manufacturer_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_type_name ON active_ingredient_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_hidden_at ON active_ingredient_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_condition_catalog_items_type_name ON condition_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_condition_catalog_items_hidden_at ON condition_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_name ON product_catalog_items(type, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_normalized_name ON product_catalog_items(type, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_manufacturer_id ON product_catalog_items(manufacturer_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_catalog_items_hidden_at ON product_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_product_id ON product_active_ingredients(product_id, sort_order, id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_active_ingredient_id ON product_active_ingredients(active_ingredient_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_kind_name ON treatment_protocols(kind, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_kind_normalized_name ON treatment_protocols(kind, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocols_hidden_at ON treatment_protocols(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_items_protocol_id ON treatment_protocol_items(protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_items_catalog_item_id ON treatment_protocol_items(catalog_item_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_treatment_protocol_doses_protocol_id ON treatment_protocol_doses(protocol_id)');
}

