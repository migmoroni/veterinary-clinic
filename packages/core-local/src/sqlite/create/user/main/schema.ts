import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';
import { PRODUCT_TYPE_SQL_VALUES } from '../../shared/catalog-sql.js';
import { optionalTextCheck, requiredTextCheck, uuidTextCheck, uuidV4TextCheck } from '../../shared/sql-utils.js';
import { tableExists, tableHasColumns } from '../../shared/table-introspection.js';
import type { Database } from '../../shared/types.js';

async function migrateUserProductsFromLegacyCatalogTable(database: Database): Promise<void> {
	if (!(await tableExists(database, 'product_catalog_items'))) return;

	const hasOrigin = await tableHasColumns(database, 'product_catalog_items', ['origin']);
	const hasManufacturerName = await tableHasColumns(database, 'product_catalog_items', ['manufacturer_name']);
	const hasManufacturerCatalog = await tableExists(database, 'manufacturer_catalog_items');
	const manufacturerNameExpression = hasManufacturerName
		? 'legacy.manufacturer_name'
		: hasManufacturerCatalog
			? `(SELECT name FROM manufacturer_catalog_items WHERE manufacturer_catalog_items.id = legacy.manufacturer_id LIMIT 1)`
			: 'NULL';
	const where = hasOrigin ? "WHERE legacy.origin = 'user'" : '';

	await database.execute(`
		INSERT OR IGNORE INTO user_product_catalog_items (
			id,
			type,
			name,
			normalized_name,
			species,
			aliases,
			manufacturer_id,
			manufacturer_name,
			regions,
			extension,
			hidden_at,
			created_at,
			updated_at
		)
		SELECT
			legacy.id,
			legacy.type,
			legacy.name,
			legacy.normalized_name,
			legacy.species,
			legacy.aliases,
			legacy.manufacturer_id,
			${manufacturerNameExpression},
			legacy.regions,
			legacy.extension,
			legacy.hidden_at,
			legacy.created_at,
			legacy.updated_at
		FROM product_catalog_items legacy
		${where}
	`);
}

export async function createCurrentSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS owners (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerName)}),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			additional_information TEXT CHECK(${optionalTextCheck('additional_information', FIELD_LIMITS.ownerAdditionalInformation)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS veterinarian_profiles (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.veterinarianName)}),
			professional_registration TEXT CHECK(${optionalTextCheck('professional_registration', FIELD_LIMITS.veterinarianProfessionalRegistration)}),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS workplaces (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.workplaceName)}),
			services_description TEXT CHECK(${optionalTextCheck('services_description', FIELD_LIMITS.workplaceServicesDescription)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS addresses (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			owner_id TEXT CHECK(owner_id IS NULL OR ${uuidTextCheck('owner_id')}),
			workplace_id TEXT CHECK(workplace_id IS NULL OR ${uuidTextCheck('workplace_id')}),
			street TEXT CHECK(${optionalTextCheck('street', FIELD_LIMITS.ownerStreet)}),
			street_number TEXT CHECK(${optionalTextCheck('street_number', FIELD_LIMITS.ownerStreetNumber)}),
			address_complement TEXT CHECK(${optionalTextCheck('address_complement', FIELD_LIMITS.ownerAddressComplement)}),
			neighborhood TEXT CHECK(${optionalTextCheck('neighborhood', FIELD_LIMITS.ownerNeighborhood)}),
			city TEXT CHECK(${optionalTextCheck('city', FIELD_LIMITS.ownerCity)}),
			state TEXT CHECK(${optionalTextCheck('state', FIELD_LIMITS.ownerState)}),
			country TEXT NOT NULL DEFAULT 'BRA' CHECK(length(country) = ${FIELD_LIMITS.ownerCountry}),
			postal_code TEXT CHECK(${optionalTextCheck('postal_code', FIELD_LIMITS.ownerPostalCode)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK((owner_id IS NOT NULL) + (workplace_id IS NOT NULL) = 1),
			UNIQUE(owner_id),
			UNIQUE(workplace_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collections (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			entity_type TEXT NOT NULL CHECK(${requiredTextCheck('entity_type', FIELD_LIMITS.imageCollectionEntityType)}),
			entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
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
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS contacts (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			owner_id TEXT CHECK(owner_id IS NULL OR ${uuidTextCheck('owner_id')}),
			responsible_id TEXT CHECK(responsible_id IS NULL OR ${uuidTextCheck('responsible_id')}),
			veterinarian_profile_id TEXT CHECK(veterinarian_profile_id IS NULL OR ${uuidTextCheck('veterinarian_profile_id')}),
			workplace_id TEXT CHECK(workplace_id IS NULL OR ${uuidTextCheck('workplace_id')}),
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			FOREIGN KEY (veterinarian_profile_id) REFERENCES veterinarian_profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK(
				(owner_id IS NOT NULL) +
				(responsible_id IS NOT NULL) +
				(veterinarian_profile_id IS NOT NULL) +
				(workplace_id IS NOT NULL) = 1
			)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_additional_responsibles (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			owner_id TEXT NOT NULL CHECK(${uuidTextCheck('owner_id')}),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerAdditionalResponsibleName)}),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pets (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.petName)}),
			birth_date TEXT CHECK(${optionalTextCheck('birth_date', FIELD_LIMITS.petBirthDate)}),
			species TEXT CHECK(${optionalTextCheck('species', FIELD_LIMITS.petSpecies)}),
			breed TEXT CHECK(${optionalTextCheck('breed', FIELD_LIMITS.petBreed)}),
			sex TEXT CHECK(sex IS NULL OR (sex IN ('M', 'F') AND length(sex) = ${FIELD_LIMITS.petSex})),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_owners (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			pet_id TEXT NOT NULL CHECK(${uuidTextCheck('pet_id')}),
			owner_id TEXT NOT NULL CHECK(${uuidTextCheck('owner_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(pet_id, owner_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS medical_records (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			pet_id TEXT NOT NULL CHECK(${uuidTextCheck('pet_id')}),
			title TEXT CHECK(${optionalTextCheck('title', FIELD_LIMITS.medicalRecordTitle)}),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.medicalRecordDescription)}),
			admitted_at TEXT DEFAULT CURRENT_DATE CHECK(${optionalTextCheck('admitted_at', FIELD_LIMITS.isoDate)}),
			discharged_at TEXT CHECK(${optionalTextCheck('discharged_at', FIELD_LIMITS.isoDate)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS app_settings (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			key TEXT NOT NULL CHECK(${requiredTextCheck('key', FIELD_LIMITS.settingKey)}),
			value TEXT CHECK(${optionalTextCheck('value', FIELD_LIMITS.settingValue)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			UNIQUE(key)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS backup_history (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			path TEXT NOT NULL CHECK(${requiredTextCheck('path', FIELD_LIMITS.backupPath)}),
			kind TEXT NOT NULL CHECK(kind IN ('manual_backup', 'export', 'import', 'pre_import_backup') AND length(kind) <= ${FIELD_LIMITS.backupKind}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS user_product_catalog_items (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			type TEXT NOT NULL CHECK(type IN (${PRODUCT_TYPE_SQL_VALUES})),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.productSpeciesJson)}),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.catalogAliasesJson)}),
			manufacturer_id TEXT CHECK(manufacturer_id IS NULL OR ${uuidV4TextCheck('manufacturer_id')}),
			manufacturer_name TEXT CHECK(${optionalTextCheck('manufacturer_name', FIELD_LIMITS.productManufacturer)}),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.productRegionsJson)}),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(${requiredTextCheck('extension', FIELD_LIMITS.productExtensionJson)}),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			UNIQUE(normalized_name),
			CHECK(${requiredTextCheck('name', FIELD_LIMITS.productName)}),
			CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.productNormalizedName)})
		)
	`);

	await migrateUserProductsFromLegacyCatalogTable(database);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocols (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin = 'user'),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.treatmentProtocolName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.treatmentProtocolNormalizedName)}),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.productSpeciesJson)}),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.treatmentObservation)}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocol_items (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			protocol_id TEXT NOT NULL CHECK(${uuidTextCheck('protocol_id')}),
			catalog_item_id TEXT NOT NULL CHECK(${uuidTextCheck('catalog_item_id')}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS treatment_protocol_doses (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			protocol_id TEXT NOT NULL CHECK(${uuidTextCheck('protocol_id')}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.treatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.treatmentValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.treatmentValidityMonths}) OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.treatmentValidityYears}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_treatments (
			id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
			pet_id TEXT NOT NULL CHECK(${uuidTextCheck('pet_id')}),
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.treatmentName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.treatmentNormalizedName)}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.treatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.treatmentObservation)}),
			created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			validity_ignored_at TEXT,
			updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK(
				(validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.treatmentValidityDays})
				OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.treatmentValidityMonths})
				OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.treatmentValidityYears})
			)
		)
	`);

}

