import { productCatalogHasCurrentTypes, tableHasColumns, tableHasExactColumns } from '../../shared/table-introspection.js';
import type { Database } from '../../shared/types.js';

export async function assertCurrentSchema(database: Database): Promise<void> {
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'avatar_hash', 'additional_information', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'veterinarian_profiles', ['id', 'name', 'professional_registration', 'avatar_hash', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'workplaces', ['id', 'name', 'services_description', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'image_collections', ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'image_collection_items', ['id', 'collection_id', 'image_hash', 'original_image_hash', 'description', 'is_primary', 'sort_order', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'owner_additional_responsibles', ['id', 'owner_id', 'name', 'avatar_hash', 'sort_order', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'pets', ['id', 'name', 'species', 'breed', 'avatar_hash', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'pet_owners', ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'medical_records', ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
			(await tableHasColumns(database, 'app_settings', ['id', 'key', 'value', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
			(await tableHasColumns(database, 'schema_migrations', ['version', 'name', 'app_version', 'applied_at'])) &&
			(await tableHasColumns(database, 'backup_history', ['id', 'path', 'kind', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
			(await tableHasExactColumns(database, 'user_product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer_id', 'manufacturer_name', 'regions', 'extension', 'hidden_at', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
			(await productCatalogHasCurrentTypes(database, 'user_product_catalog_items')) &&
		(await tableHasColumns(database, 'treatment_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'treatment_protocol_items', ['id', 'protocol_id', 'catalog_item_id', 'sort_order', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'treatment_protocol_doses', ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at', 'updated_by', 'removed_at'])) &&
		(await tableHasColumns(database, 'pet_treatments', ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'validity_ignored_at', 'created_at', 'updated_at', 'updated_by', 'removed_at']));

	if (!valid) throw new Error('database_schema_current_invalid');
}

export async function hasCurrentUnversionedSchema(database: Database): Promise<boolean> {
	const hasCurrentUserProductTable = await tableHasColumns(database, 'user_product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'manufacturer_id']);
	const hasLegacyProductTable = await tableHasColumns(database, 'product_catalog_items', ['id', 'type', 'name', 'normalized_name', 'manufacturer_id']);
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information'])) &&
			(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code'])) &&
			(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value'])) &&
			(hasCurrentUserProductTable || hasLegacyProductTable) &&
			(await tableHasColumns(database, 'treatment_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name'])) &&
		(await tableHasColumns(database, 'pet_treatments', ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit']));

	return valid;
}

