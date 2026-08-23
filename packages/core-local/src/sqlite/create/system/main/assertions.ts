import { productCatalogHasCurrentTypes, tableHasExactColumns } from '../../shared/table-introspection.js';
import type { Database } from '../../shared/types.js';

export async function assertSystemSchema(database: Database): Promise<void> {
	const valid =
		(await tableHasExactColumns(database, 'image_collections', ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items'])) &&
		(await tableHasExactColumns(database, 'image_collection_items', ['id', 'collection_id', 'image_hash', 'original_image_hash', 'description', 'is_primary', 'sort_order'])) &&
		(await tableHasExactColumns(database, 'breed_reference_items', ['id', 'breed_id', 'species', 'label_key', 'origin_id', 'origin_label_key', 'origin_country_code', 'origin_latitude', 'origin_longitude', 'size_category', 'average_weight_kg', 'average_height_cm', 'extension'])) &&
		(await tableHasExactColumns(database, 'manufacturer_catalog_items', ['id', 'type', 'name', 'normalized_name', 'aliases', 'regions', 'extension', 'hidden_at'])) &&
		(await tableHasExactColumns(database, 'active_ingredient_catalog_items', ['id', 'type', 'name', 'normalized_name', 'aliases', 'regions', 'extension', 'hidden_at'])) &&
		(await tableHasExactColumns(database, 'condition_catalog_items', ['id', 'type', 'name', 'normalized_name', 'aliases', 'regions', 'extension', 'hidden_at'])) &&
		(await tableHasExactColumns(database, 'product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer_id', 'regions', 'extension', 'hidden_at'])) &&
		(await tableHasExactColumns(database, 'product_active_ingredients', ['id', 'product_id', 'active_ingredient_id', 'sort_order'])) &&
		(await productCatalogHasCurrentTypes(database)) &&
		(await tableHasExactColumns(database, 'treatment_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at'])) &&
		(await tableHasExactColumns(database, 'treatment_protocol_items', ['id', 'protocol_id', 'catalog_item_id', 'sort_order'])) &&
		(await tableHasExactColumns(database, 'treatment_protocol_doses', ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order']));

	if (!valid) throw new Error('system_database_schema_invalid');
}

