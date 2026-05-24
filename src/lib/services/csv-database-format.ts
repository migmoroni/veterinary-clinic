export interface CsvTableDefinition {
	name: string;
	columns: string[];
	binaryColumns?: string[];
	orderBy: string;
}

export const CSV_TABLES: CsvTableDefinition[] = [
	{
		name: 'owners',
		columns: ['id', 'name', 'avatar_blob', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'id'
	},
	{
		name: 'owner_contacts',
		columns: ['id', 'owner_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'owner_id, sort_order, id'
	},
	{
		name: 'owner_additional_responsibles',
		columns: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
		binaryColumns: ['avatar_blob'],
		orderBy: 'owner_id, sort_order, id'
	},
	{
		name: 'owner_additional_responsible_contacts',
		columns: ['id', 'responsible_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
		orderBy: 'responsible_id, sort_order, id'
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
		name: 'vaccines',
		columns: ['id', 'name', 'normalized_name', 'hidden_at', 'created_at', 'updated_at'],
		orderBy: 'name, id'
	},
	{
		name: 'vaccine_dose_types',
		columns: ['id', 'name', 'normalized_name', 'requires_dose_number', 'sort_order', 'hidden_at', 'created_at', 'updated_at'],
		orderBy: 'sort_order, name, id'
	},
	{
		name: 'vaccine_validity_options',
		columns: ['id', 'validity_value', 'validity_unit', 'sort_order', 'hidden_at', 'created_at', 'updated_at'],
		orderBy: 'sort_order, validity_unit, validity_value, id'
	},
	{
		name: 'pet_vaccinations',
		columns: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose_type', 'dose_number', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after'],
		orderBy: 'pet_id, applied_at, id'
	}
];