import { systemMediaFeature } from './system/media/profile.js';
import { userLogsFeature } from './user/logs/profile.js';
import { userMediaFeature } from './user/media/profile.js';

export interface SqliteSchemaFeature {
	id: string;
	tables: readonly string[];
}

export interface SqliteDatabaseProfile {
	id: string;
	user: {
		main: readonly SqliteSchemaFeature[];
		media: readonly SqliteSchemaFeature[];
		logs: readonly SqliteSchemaFeature[];
	};
	system: {
		main: readonly SqliteSchemaFeature[];
		media: readonly SqliteSchemaFeature[];
	};
}

export const vetAppDatabaseProfile = {
	id: 'vet-app',
	user: {
		main: [
			{ id: 'registry', tables: ['owners', 'owner_additional_responsibles', 'contacts', 'pets', 'pet_owners'] },
			{ id: 'practice', tables: ['veterinarian_profiles', 'workplaces', 'addresses'] },
			{ id: 'media-collections', tables: ['image_collections', 'image_collection_items'] },
			{ id: 'medical-records', tables: ['medical_records'] },
			{ id: 'catalog-overrides', tables: ['user_product_catalog_items'] },
			{ id: 'treatments', tables: ['treatment_protocols', 'treatment_protocol_items', 'treatment_protocol_doses', 'pet_treatments'] },
			{ id: 'settings', tables: ['app_settings', 'schema_migrations'] },
			{ id: 'backup', tables: ['backup_history'] }
		],
		media: [userMediaFeature],
		logs: [userLogsFeature]
	},
	system: {
		main: [
			{ id: 'media-collections', tables: ['image_collections', 'image_collection_items'] },
			{ id: 'knowledge', tables: ['breed_reference_items', 'manufacturer_catalog_items', 'active_ingredient_catalog_items', 'condition_catalog_items', 'product_catalog_items', 'product_active_ingredients'] },
			{ id: 'treatment-protocols', tables: ['treatment_protocols', 'treatment_protocol_items', 'treatment_protocol_doses'] }
		],
		media: [systemMediaFeature]
	}
} satisfies SqliteDatabaseProfile;
