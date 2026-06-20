import type Database from '@tauri-apps/plugin-sql';
import { defaultPreventiveCatalogItems } from '$lib/domain/preventive/default-catalog.js';
import { defaultPreventiveProtocols } from '$lib/domain/preventive/default-protocol.js';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { incrementalSchemaMigrations } from './schema-migrations/registry.js';
import type { SchemaMigration } from './schema-migrations/types.js';

export const CURRENT_SCHEMA_VERSION = 1;
export const BASELINE_APP_VERSION = '0.2.0';

type BaselineDetection = 'empty' | 'current-unversioned' | 'unknown-unversioned' | 'versioned';

interface TableColumnRow {
	name: string;
}

interface TableNameRow {
	name: string;
}

interface UserVersionRow {
	user_version: number;
}

interface IntegrityCheckRow {
	integrity_check: string;
}

interface ForeignKeyCheckRow {
	table: string;
	rowid: number;
	parent: string;
	fkid: number;
}

interface MigrationRecordRow {
	version: number;
}

export interface SchemaStatus {
	currentVersion: number;
	targetVersion: number;
	migrationRequired: boolean;
	detection: BaselineDetection;
	isSupported: boolean;
	reason?: 'future-version' | 'unknown-schema';
}

function optionalTextCheck(column: string, maxLength: number): string {
	return `${column} IS NULL OR length(${column}) <= ${maxLength}`;
}

function requiredTextCheck(column: string, maxLength: number): string {
	return `length(trim(${column})) BETWEEN 1 AND ${maxLength}`;
}

interface RunMigrationsOptions {
	seedDefaultData?: boolean;
	createIndexes?: boolean;
}

function normalizePreventiveCatalogName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

async function tableHasColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${quoteIdentifier(table)})`);
	const names = new Set(rows.map((row) => row.name));
	return columns.every((column) => names.has(column));
}

async function tableExists(database: Database, table: string): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = $1 LIMIT 1", [table]);
	return rows.length > 0;
}

async function getUserVersion(database: Database): Promise<number> {
	const rows = await database.select<UserVersionRow[]>('PRAGMA user_version');
	return Number(rows[0]?.user_version ?? 0);
}

async function setUserVersion(database: Database, version: number): Promise<void> {
	if (!Number.isInteger(version) || version < 0) throw new Error(`database_schema_invalid_version:${version}`);
	await database.execute(`PRAGMA user_version = ${version}`);
}

async function isEmptyDatabase(database: Database): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>(
		"SELECT name FROM sqlite_master WHERE type IN ('table', 'view', 'trigger', 'index') AND name NOT LIKE 'sqlite_%' LIMIT 1"
	);
	return rows.length === 0;
}

async function seedDefaultPreventiveCatalog(database: Database): Promise<void> {
	for (const item of defaultPreventiveCatalogItems) {
		await database.execute(
			`INSERT OR IGNORE INTO preventive_catalog_items (kind, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[item.kind, item.name, normalizePreventiveCatalogName(item.name), JSON.stringify(item.species), JSON.stringify(item.aliases), item.manufacturer, item.origin, JSON.stringify(item.regions)]
		);
	}
}

async function seedDefaultPreventiveProtocols(database: Database): Promise<void> {
	for (const protocol of defaultPreventiveProtocols) {
		const normalizedName = normalizePreventiveCatalogName(protocol.name);
		await database.execute(
			`INSERT OR IGNORE INTO preventive_protocols (kind, origin, name, normalized_name, species, observation, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, COALESCE((SELECT MAX(sort_order) + 1 FROM preventive_protocols WHERE kind = $1), 0), CURRENT_TIMESTAMP)`,
			[protocol.kind, protocol.origin, protocol.name, normalizedName, JSON.stringify(protocol.species), protocol.observation]
		);

		const protocolRows = await database.select<{ id: number }[]>(
			'SELECT id FROM preventive_protocols WHERE kind = $1 AND normalized_name = $2 LIMIT 1',
			[protocol.kind, normalizedName]
		);
		const protocolId = protocolRows[0]?.id;
		if (!protocolId) throw new Error(`default_protocol_not_found:${protocol.name}`);

		for (const [sortOrder, catalogItemName] of protocol.catalogItemNames.entries()) {
			const catalogRows = await database.select<{ id: number }[]>(
				'SELECT id FROM preventive_catalog_items WHERE kind = $1 AND normalized_name = $2 LIMIT 1',
				[protocol.kind, normalizePreventiveCatalogName(catalogItemName)]
			);
			const catalogItemId = catalogRows[0]?.id;
			if (!catalogItemId) throw new Error(`default_protocol_catalog_item_not_found:${catalogItemName}`);

			await database.execute(
				`INSERT OR IGNORE INTO preventive_protocol_items (protocol_id, catalog_item_id, sort_order, updated_at)
				 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
				[protocolId, catalogItemId, sortOrder]
			);
		}

		for (const [sortOrder, dose] of protocol.doses.entries()) {
			await database.execute(
				`INSERT INTO preventive_protocol_doses (protocol_id, dose, validity_value, validity_unit, sort_order, updated_at)
				 SELECT $1, $2, $3, $4, $5, CURRENT_TIMESTAMP
				 WHERE NOT EXISTS (
					SELECT 1 FROM preventive_protocol_doses WHERE protocol_id = $1 AND sort_order = $5
				 )`,
				[protocolId, dose.dose, dose.validityValue, dose.validityUnit, sortOrder]
			);
		}
	}
}

async function createCurrentSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerName)}),
			avatar_blob BLOB,
			additional_information TEXT CHECK(${optionalTextCheck('additional_information', FIELD_LIMITS.ownerAdditionalInformation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS veterinarian_profiles (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.veterinarianName)}),
			professional_registration TEXT CHECK(${optionalTextCheck('professional_registration', FIELD_LIMITS.veterinarianProfessionalRegistration)}),
			avatar_blob BLOB,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS workplaces (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			name TEXT CHECK(${optionalTextCheck('name', FIELD_LIMITS.workplaceName)}),
			services_description TEXT CHECK(${optionalTextCheck('services_description', FIELD_LIMITS.workplaceServicesDescription)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS addresses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER,
			workplace_id INTEGER,
			street TEXT CHECK(${optionalTextCheck('street', FIELD_LIMITS.ownerStreet)}),
			street_number TEXT CHECK(${optionalTextCheck('street_number', FIELD_LIMITS.ownerStreetNumber)}),
			address_complement TEXT CHECK(${optionalTextCheck('address_complement', FIELD_LIMITS.ownerAddressComplement)}),
			neighborhood TEXT CHECK(${optionalTextCheck('neighborhood', FIELD_LIMITS.ownerNeighborhood)}),
			city TEXT CHECK(${optionalTextCheck('city', FIELD_LIMITS.ownerCity)}),
			state TEXT CHECK(${optionalTextCheck('state', FIELD_LIMITS.ownerState)}),
			country TEXT NOT NULL DEFAULT 'BRA' CHECK(length(country) = ${FIELD_LIMITS.ownerCountry}),
			postal_code TEXT CHECK(${optionalTextCheck('postal_code', FIELD_LIMITS.ownerPostalCode)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK((owner_id IS NOT NULL) + (workplace_id IS NOT NULL) = 1),
			UNIQUE(owner_id),
			UNIQUE(workplace_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL CHECK(${requiredTextCheck('entity_type', FIELD_LIMITS.imageCollectionEntityType)}),
			entity_id INTEGER NOT NULL,
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(entity_type, entity_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS image_collection_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			collection_id INTEGER NOT NULL,
			image_blob BLOB NOT NULL CHECK(length(image_blob) > 0),
			original_image_blob BLOB NOT NULL CHECK(length(original_image_blob) > 0),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.imageDescription)}),
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER,
			responsible_id INTEGER,
			veterinarian_profile_id INTEGER,
			workplace_id INTEGER,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			FOREIGN KEY (veterinarian_profile_id) REFERENCES veterinarian_profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK(
				(owner_id IS NOT NULL) +
				(responsible_id IS NOT NULL) +
				(veterinarian_profile_id IS NOT NULL) +
				(workplace_id IS NOT NULL) = 1
			),
			UNIQUE(owner_id, kind, label, value),
			UNIQUE(responsible_id, kind, label, value),
			UNIQUE(veterinarian_profile_id, kind, label, value),
			UNIQUE(workplace_id, kind, label, value)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_additional_responsibles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerAdditionalResponsibleName)}),
			avatar_blob BLOB,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.petName)}),
			birth_date TEXT CHECK(${optionalTextCheck('birth_date', FIELD_LIMITS.petBirthDate)}),
			species TEXT CHECK(${optionalTextCheck('species', FIELD_LIMITS.petSpecies)}),
			breed TEXT CHECK(${optionalTextCheck('breed', FIELD_LIMITS.petBreed)}),
			sex TEXT CHECK(sex IS NULL OR (sex IN ('M', 'F') AND length(sex) = ${FIELD_LIMITS.petSex})),
			avatar_blob BLOB,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			owner_id INTEGER NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(pet_id, owner_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS medical_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			title TEXT CHECK(${optionalTextCheck('title', FIELD_LIMITS.medicalRecordTitle)}),
			description TEXT CHECK(${optionalTextCheck('description', FIELD_LIMITS.medicalRecordDescription)}),
			admitted_at TEXT DEFAULT CURRENT_DATE CHECK(${optionalTextCheck('admitted_at', FIELD_LIMITS.isoDate)}),
			discharged_at TEXT CHECK(${optionalTextCheck('discharged_at', FIELD_LIMITS.isoDate)}),
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY CHECK(${requiredTextCheck('key', FIELD_LIMITS.settingKey)}),
			value TEXT CHECK(${optionalTextCheck('value', FIELD_LIMITS.settingValue)}),
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			path TEXT NOT NULL CHECK(${requiredTextCheck('path', FIELD_LIMITS.backupPath)}),
			kind TEXT NOT NULL CHECK(kind IN ('manual_backup', 'automatic_backup', 'export', 'import', 'pre_import_backup') AND length(kind) <= ${FIELD_LIMITS.backupKind}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS preventive_catalog_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.preventiveSpeciesJson)}),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('aliases', FIELD_LIMITS.preventiveAliasesJson)}),
			manufacturer TEXT CHECK(${optionalTextCheck('manufacturer', FIELD_LIMITS.preventiveManufacturer)}),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(${requiredTextCheck('regions', FIELD_LIMITS.preventiveRegionsJson)}),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(kind, normalized_name),
			CHECK((kind = 'vaccine' AND ${requiredTextCheck('name', FIELD_LIMITS.vaccineName)}) OR (kind = 'antiparasitic' AND ${requiredTextCheck('name', FIELD_LIMITS.antiparasiticName)})),
			CHECK((kind = 'vaccine' AND ${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}) OR (kind = 'antiparasitic' AND ${requiredTextCheck('normalized_name', FIELD_LIMITS.antiparasiticNormalizedName)}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS preventive_protocols (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.preventiveProtocolName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.preventiveProtocolNormalizedName)}),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(${requiredTextCheck('species', FIELD_LIMITS.preventiveSpeciesJson)}),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.preventiveProtocolObservation)}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			UNIQUE(kind, normalized_name)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS preventive_protocol_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			protocol_id INTEGER NOT NULL,
			catalog_item_id INTEGER NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES preventive_protocols(id) ON DELETE CASCADE,
			FOREIGN KEY (catalog_item_id) REFERENCES preventive_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS preventive_protocol_doses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			protocol_id INTEGER NOT NULL,
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.preventiveProtocolDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES preventive_protocols(id) ON DELETE CASCADE,
			CHECK((validity_unit = 'days' AND validity_value <= ${Math.max(FIELD_LIMITS.vaccineValidityDays, FIELD_LIMITS.antiparasiticTreatmentValidityDays)}) OR (validity_unit = 'months' AND validity_value <= ${Math.max(FIELD_LIMITS.vaccineValidityMonths, FIELD_LIMITS.antiparasiticTreatmentValidityMonths)}) OR (validity_unit = 'years' AND validity_value <= ${Math.max(FIELD_LIMITS.vaccineValidityYears, FIELD_LIMITS.antiparasiticTreatmentValidityYears)}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_vaccinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			vaccine_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_name', FIELD_LIMITS.vaccineName)}),
			vaccine_normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.vaccineDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.vaccinationObservation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.vaccineValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.vaccineValidityMonths}) OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.vaccineValidityYears}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_antiparasitic_treatments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			antiparasitic_name TEXT NOT NULL CHECK(${requiredTextCheck('antiparasitic_name', FIELD_LIMITS.antiparasiticName)}),
			antiparasitic_normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('antiparasitic_normalized_name', FIELD_LIMITS.antiparasiticNormalizedName)}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.antiparasiticTreatmentDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.antiparasiticTreatmentObservation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.antiparasiticTreatmentValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.antiparasiticTreatmentValidityMonths}) OR (validity_unit = 'years' AND validity_value <= ${FIELD_LIMITS.antiparasiticTreatmentValidityYears}))
		)
	`);

}

export async function createCurrentIndexes(database: Database): Promise<void> {
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_owner_id ON addresses(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_workplace_id ON addresses(workplace_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_addresses_state ON addresses(state)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_responsible_id ON contacts(responsible_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_veterinarian_profile_id ON contacts(veterinarian_profile_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_workplace_id ON contacts(workplace_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_label ON contacts(label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_contacts_value ON contacts(value)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_image_collection_items_collection_id ON image_collection_items(collection_id, sort_order, id)');
	await database.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_name ON owner_additional_responsibles(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_owner_id ON pet_owners(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_catalog_items_kind_name ON preventive_catalog_items(kind, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_catalog_items_kind_normalized_name ON preventive_catalog_items(kind, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_catalog_items_hidden_at ON preventive_catalog_items(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocols_kind_name ON preventive_protocols(kind, name COLLATE NOCASE)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocols_kind_normalized_name ON preventive_protocols(kind, normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocols_hidden_at ON preventive_protocols(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocols_deleted_at ON preventive_protocols(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocol_items_protocol_id ON preventive_protocol_items(protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocol_items_catalog_item_id ON preventive_protocol_items(catalog_item_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_preventive_protocol_doses_protocol_id ON preventive_protocol_doses(protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_normalized_name ON pet_vaccinations(vaccine_normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_latest_active ON pet_vaccinations(pet_id, vaccine_normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_pet_id ON pet_antiparasitic_treatments(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_applied_at ON pet_antiparasitic_treatments(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_antiparasitic_normalized_name ON pet_antiparasitic_treatments(antiparasitic_normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_latest_active ON pet_antiparasitic_treatments(pet_id, antiparasitic_normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_validity_ignored_at ON pet_antiparasitic_treatments(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_antiparasitic_treatments_deleted_at ON pet_antiparasitic_treatments(deleted_at)');
}

async function assertCurrentSchema(database: Database): Promise<void> {
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code'])) &&
		(await tableHasColumns(database, 'veterinarian_profiles', ['id', 'name', 'professional_registration', 'avatar_blob'])) &&
		(await tableHasColumns(database, 'workplaces', ['id', 'name', 'services_description'])) &&
		(await tableHasColumns(database, 'image_collections', ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items'])) &&
		(await tableHasColumns(database, 'image_collection_items', ['id', 'collection_id', 'image_blob', 'original_image_blob', 'description', 'is_primary', 'sort_order'])) &&
		(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value'])) &&
		(await tableHasColumns(database, 'owner_additional_responsibles', ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order'])) &&
		(await tableHasColumns(database, 'pets', ['id', 'name', 'species', 'breed', 'updated_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'pet_owners', ['id', 'pet_id', 'owner_id', 'sort_order'])) &&
		(await tableHasColumns(database, 'medical_records', ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'app_settings', ['key', 'value', 'updated_at'])) &&
		(await tableHasColumns(database, 'schema_migrations', ['version', 'name', 'app_version', 'applied_at'])) &&
		(await tableHasColumns(database, 'backup_history', ['id', 'path', 'kind', 'created_at'])) &&
		(await tableHasColumns(database, 'preventive_catalog_items', ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer', 'origin', 'regions', 'hidden_at'])) &&
		(await tableHasColumns(database, 'preventive_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'deleted_at', 'purge_after'])) &&
		(await tableHasColumns(database, 'preventive_protocol_items', ['id', 'protocol_id', 'catalog_item_id', 'sort_order'])) &&
		(await tableHasColumns(database, 'preventive_protocol_doses', ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order'])) &&
		(await tableHasColumns(database, 'pet_vaccinations', ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'validity_ignored_at'])) &&
		(await tableHasColumns(database, 'pet_antiparasitic_treatments', ['id', 'pet_id', 'applied_at', 'antiparasitic_name', 'antiparasitic_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'validity_ignored_at']));

	if (!valid) throw new Error('database_schema_current_invalid');
}

async function hasCurrentUnversionedSchema(database: Database): Promise<boolean> {
	const valid =
		(await tableHasColumns(database, 'owners', ['id', 'name', 'additional_information'])) &&
		(await tableHasColumns(database, 'addresses', ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code'])) &&
		(await tableHasColumns(database, 'contacts', ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value'])) &&
		(await tableHasColumns(database, 'preventive_protocols', ['id', 'kind', 'origin', 'name', 'normalized_name'])) &&
		(await tableHasColumns(database, 'pet_vaccinations', ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit'])) &&
		(await tableHasColumns(database, 'pet_antiparasitic_treatments', ['id', 'pet_id', 'applied_at', 'antiparasitic_name', 'antiparasitic_normalized_name', 'dose', 'validity_value', 'validity_unit']));

	return valid;
}

async function hasSchemaMigrationRecord(database: Database, version: number): Promise<boolean> {
	if (!(await tableExists(database, 'schema_migrations'))) return false;
	const rows = await database.select<MigrationRecordRow[]>('SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1', [version]);
	return rows.length > 0;
}

export async function getSchemaStatus(database: Database): Promise<SchemaStatus> {
	const currentVersion = await getUserVersion(database);

	if (currentVersion > CURRENT_SCHEMA_VERSION) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: false,
			detection: 'versioned',
			isSupported: false,
			reason: 'future-version'
		};
	}

	if (currentVersion > 0) {
		if (currentVersion === CURRENT_SCHEMA_VERSION && !(await hasCurrentUnversionedSchema(database))) {
			return {
				currentVersion,
				targetVersion: CURRENT_SCHEMA_VERSION,
				migrationRequired: false,
				detection: 'versioned',
				isSupported: false,
				reason: 'unknown-schema'
			};
		}

		const missingMetadata = !(await hasSchemaMigrationRecord(database, currentVersion));
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: currentVersion < CURRENT_SCHEMA_VERSION || missingMetadata,
			detection: 'versioned',
			isSupported: true
		};
	}

	if (await isEmptyDatabase(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'empty',
			isSupported: true
		};
	}

	if (await hasCurrentUnversionedSchema(database)) {
		return {
			currentVersion,
			targetVersion: CURRENT_SCHEMA_VERSION,
			migrationRequired: true,
			detection: 'current-unversioned',
			isSupported: true
		};
	}

	return {
		currentVersion,
		targetVersion: CURRENT_SCHEMA_VERSION,
		migrationRequired: false,
		detection: 'unknown-unversioned',
		isSupported: false,
		reason: 'unknown-schema'
	};
}

export async function assertDatabaseCanMigrate(database: Database): Promise<SchemaStatus> {
	const status = await getSchemaStatus(database);
	if (status.isSupported) return status;

	if (status.reason === 'future-version') throw new Error(`database_schema_from_future:${status.currentVersion}`);
	throw new Error('database_schema_unsupported');
}

async function ensureMigrationMetadataTable(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);
}

async function recordMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await database.execute(
		`INSERT OR IGNORE INTO schema_migrations (version, name, app_version, applied_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
		[migration.version, migration.name, migration.introducedInAppVersion]
	);
	await setUserVersion(database, migration.version);
}

async function backfillMigrationMetadata(database: Database, version: number): Promise<void> {
	for (const migration of SCHEMA_MIGRATIONS.filter((item) => item.version <= version)) {
		await recordMigration(database, migration);
	}
}

async function validateDatabaseIntegrity(database: Database): Promise<void> {
	const integrityRows = await database.select<IntegrityCheckRow[]>('PRAGMA integrity_check');
	const integrityResult = integrityRows[0]?.integrity_check;
	if (integrityResult !== 'ok') throw new Error(`database_integrity_check_failed:${integrityResult ?? 'unknown'}`);

	const foreignKeyRows = await database.select<ForeignKeyCheckRow[]>('PRAGMA foreign_key_check');
	if (foreignKeyRows.length > 0) {
		const violation = foreignKeyRows[0];
		throw new Error(`database_foreign_key_check_failed:${violation.table}.${violation.rowid}->${violation.parent}`);
	}
}

const BASELINE_SCHEMA_MIGRATION = {
	version: 1,
	name: '0001_baseline_current_schema',
	introducedInAppVersion: BASELINE_APP_VERSION,
	up: createCurrentSchema,
	verify: assertCurrentSchema
} satisfies SchemaMigration;

function buildSchemaMigrationRegistry(): SchemaMigration[] {
	const migrations = [BASELINE_SCHEMA_MIGRATION, ...incrementalSchemaMigrations].sort((first, second) => first.version - second.version);
	const seenVersions = new Set<number>();

	for (const migration of migrations) {
		if (seenVersions.has(migration.version)) throw new Error(`database_schema_migration_duplicate:${migration.version}`);
		seenVersions.add(migration.version);
		if (migration.version > CURRENT_SCHEMA_VERSION) throw new Error(`database_schema_migration_above_current:${migration.version}`);
	}

	for (let expectedVersion = 1; expectedVersion <= CURRENT_SCHEMA_VERSION; expectedVersion += 1) {
		if (!seenVersions.has(expectedVersion)) throw new Error(`database_schema_migration_registry_gap:${expectedVersion}`);
	}

	return migrations;
}

const SCHEMA_MIGRATIONS = buildSchemaMigrationRegistry();

async function applyMigration(database: Database, migration: SchemaMigration): Promise<void> {
	await migration.up(database);
	if (migration.verify) await migration.verify(database);
	await recordMigration(database, migration);
}

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	const { createIndexes = true, seedDefaultData = false } = options;
	const status = await assertDatabaseCanMigrate(database);

	await database.execute('BEGIN IMMEDIATE');
	try {
		await ensureMigrationMetadataTable(database);

		if (status.detection === 'current-unversioned') {
			await createCurrentSchema(database);
			await assertCurrentSchema(database);
			await backfillMigrationMetadata(database, CURRENT_SCHEMA_VERSION);
		} else {
			const unappliedMigrations = SCHEMA_MIGRATIONS.filter((migration) => migration.version > status.currentVersion && migration.version <= CURRENT_SCHEMA_VERSION);
			for (const migration of unappliedMigrations) {
				await applyMigration(database, migration);
			}

			if (status.detection === 'versioned' && status.migrationRequired && unappliedMigrations.length === 0) {
				await backfillMigrationMetadata(database, status.currentVersion);
			}
		}

		await assertCurrentSchema(database);

		if (seedDefaultData) {
			await seedDefaultPreventiveCatalog(database);
			await seedDefaultPreventiveProtocols(database);
		}
		if (createIndexes) await createCurrentIndexes(database);
		await validateDatabaseIntegrity(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}
