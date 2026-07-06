export interface CsvTableDefinition {
	name: string;
	columns: string[];
	binaryColumns?: string[];
	orderBy: string;
}

export const CSV_SCHEMA_METADATA_PATH = '_metadata/schema.json';

export interface CsvSchemaMetadata {
	format: 'veterinary-clinic-csv';
	schemaVersion: number;
	exportedAt: string;
}

export const CSV_TABLES: CsvTableDefinition[] = [
	{
		name: 'owners',
		columns: ['id', 'name', 'avatar_blob', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'id'
	},
	{
		name: 'addresses',
		columns: ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'],
		orderBy: 'owner_id, workplace_id, id'
	},
	{
		name: 'veterinarian_profiles',
		columns: ['id', 'name', 'professional_registration', 'avatar_blob', 'created_at', 'updated_at'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'id'
	},
	{
		name: 'workplaces',
		columns: ['id', 'name', 'services_description', 'created_at', 'updated_at'],
		orderBy: 'id'
	},
	{
		name: 'image_collections',
		columns: ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items', 'created_at', 'updated_at'],
		orderBy: 'entity_type, entity_id, id'
	},
	{
		name: 'image_collection_items',
		columns: ['id', 'collection_id', 'image_blob', 'original_image_blob', 'description', 'is_primary', 'sort_order', 'created_at', 'updated_at'],
		binaryColumns: ['image_blob', 'original_image_blob'],
		orderBy: 'collection_id, sort_order, id'
	},
	{
		name: 'owner_additional_responsibles',
		columns: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'owner_id, sort_order, id'
	},
	{
		name: 'contacts',
		columns: ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'owner_id, responsible_id, veterinarian_profile_id, workplace_id, sort_order, id'
	},
	{
		name: 'pets',
		columns: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'id'
	},
	{
		name: 'pet_owners',
		columns: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'pet_id, sort_order, id'
	},
	{
		name: 'medical_records',
		columns: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
		orderBy: 'pet_id, admitted_at, id'
	},
	{
		name: 'app_settings',
		columns: ['key', 'value', 'updated_at'],
		orderBy: 'key'
	},
	{
		name: 'backup_history',
		columns: ['id', 'path', 'kind', 'created_at'],
		orderBy: 'id'
	},
	{
		name: 'medication_catalog_items',
		columns: ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer', 'origin', 'regions', 'hidden_at', 'created_at', 'updated_at'],
		orderBy: 'kind, name, id'
	},
	{
		name: 'medication_protocols',
		columns: ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
		orderBy: 'kind, sort_order, name, id'
	},
	{
		name: 'medication_protocol_items',
		columns: ['id', 'protocol_id', 'catalog_item_id', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'protocol_id, sort_order, id'
	},
	{
		name: 'medication_protocol_doses',
		columns: ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'protocol_id, sort_order, id'
	},
	{
		name: 'pet_treatments',
		columns: ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after'],
		orderBy: 'kind, pet_id, applied_at, id'
	}
];
