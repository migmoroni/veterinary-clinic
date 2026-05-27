import type Database from '@tauri-apps/plugin-sql';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';

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

const DEFAULT_VACCINE_DOSE_TYPES = [
	{ name: 'Dose inicial', requiresDoseNumber: true },
	{ name: 'Reforço', requiresDoseNumber: false }
] as const;

const DEFAULT_VACCINE_VALIDITY_OPTIONS = [
	{ validityValue: 21, validityUnit: 'days' },
	{ validityValue: 12, validityUnit: 'months' }
] as const;

function normalizeCatalogName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

async function seedDefaultVaccineDoseCatalogs(database: Database): Promise<void> {
	const rows = await database.select<{ value: string | null }[]>(`SELECT value FROM app_settings WHERE key = 'vaccine_dose_catalog_seeded' LIMIT 1`);
	if (rows[0]?.value === '1') return;

	for (const [index, doseType] of DEFAULT_VACCINE_DOSE_TYPES.entries()) {
		await database.execute(
			`INSERT INTO vaccine_dose_types (name, normalized_name, requires_dose_number, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			 ON CONFLICT(normalized_name) DO NOTHING`,
			[doseType.name, normalizeCatalogName(doseType.name), doseType.requiresDoseNumber ? 1 : 0, index]
		);
	}

	await database.execute(
		`INSERT INTO app_settings (key, value, updated_at)
		 VALUES ('vaccine_dose_catalog_seeded', '1', CURRENT_TIMESTAMP)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
	);
}

async function seedDefaultVaccineValidityCatalog(database: Database): Promise<void> {
	const rows = await database.select<{ value: string | null }[]>(`SELECT value FROM app_settings WHERE key = 'vaccine_validity_catalog_seeded' LIMIT 1`);
	if (rows[0]?.value === '1') return;

	for (const [index, option] of DEFAULT_VACCINE_VALIDITY_OPTIONS.entries()) {
		await database.execute(
			`INSERT INTO vaccine_validity_options (validity_value, validity_unit, sort_order, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
			 ON CONFLICT(validity_value, validity_unit) DO NOTHING`,
			[option.validityValue, option.validityUnit, index]
		);
	}

	await database.execute(
		`INSERT INTO app_settings (key, value, updated_at)
		 VALUES ('vaccine_validity_catalog_seeded', '1', CURRENT_TIMESTAMP)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
	);
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
		CREATE TABLE IF NOT EXISTS owner_addresses (
			owner_id INTEGER PRIMARY KEY,
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
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER,
			responsible_id INTEGER,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			CHECK((owner_id IS NOT NULL AND responsible_id IS NULL) OR (owner_id IS NULL AND responsible_id IS NOT NULL)),
			UNIQUE(owner_id, kind, label, value),
			UNIQUE(responsible_id, kind, label, value)
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
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'dewormer')),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(kind, normalized_name),
			CHECK((kind = 'vaccine' AND ${requiredTextCheck('name', FIELD_LIMITS.vaccineName)}) OR (kind = 'dewormer' AND ${requiredTextCheck('name', FIELD_LIMITS.dewormerName)})),
			CHECK((kind = 'vaccine' AND ${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}) OR (kind = 'dewormer' AND ${requiredTextCheck('normalized_name', FIELD_LIMITS.dewormerNormalizedName)}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_dose_types (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.vaccineDoseType)}),
			normalized_name TEXT NOT NULL UNIQUE CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
			requires_dose_number INTEGER NOT NULL DEFAULT 1 CHECK(requires_dose_number IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_validity_options (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(validity_value, validity_unit),
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.vaccineValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.vaccineValidityMonths}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_vaccinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			vaccine_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_name', FIELD_LIMITS.vaccineName)}),
			vaccine_normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
			dose_type TEXT NOT NULL CHECK(${requiredTextCheck('dose_type', FIELD_LIMITS.vaccineDoseType)}),
			dose_number INTEGER CHECK(dose_number IS NULL OR (dose_number BETWEEN 1 AND ${FIELD_LIMITS.vaccineDoseNumber})),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.vaccinationObservation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.vaccineValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.vaccineValidityMonths}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_dewormings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			dewormer_name TEXT NOT NULL CHECK(${requiredTextCheck('dewormer_name', FIELD_LIMITS.dewormerName)}),
			dewormer_normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('dewormer_normalized_name', FIELD_LIMITS.dewormerNormalizedName)}),
			dose TEXT NOT NULL CHECK(${requiredTextCheck('dose', FIELD_LIMITS.dewormingDose)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months')),
			observation TEXT CHECK(${optionalTextCheck('observation', FIELD_LIMITS.dewormingObservation)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT,
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.dewormingValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.dewormingValidityMonths}))
		)
	`);

}

export async function createCurrentIndexes(database: Database): Promise<void> {
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_addresses_city ON owner_addresses(city)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_addresses_state ON owner_addresses(state)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON owner_contacts(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_responsible_id ON owner_contacts(responsible_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_label ON owner_contacts(label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_value ON owner_contacts(value)');
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
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_dose_types_normalized_name ON vaccine_dose_types(normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_dose_types_hidden_at ON vaccine_dose_types(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_validity_options_value_unit ON vaccine_validity_options(validity_value, validity_unit)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_validity_options_hidden_at ON vaccine_validity_options(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_normalized_name ON pet_vaccinations(vaccine_normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_latest_active ON pet_vaccinations(pet_id, vaccine_normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_pet_id ON pet_dewormings(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_applied_at ON pet_dewormings(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_dewormer_normalized_name ON pet_dewormings(dewormer_normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_latest_active ON pet_dewormings(pet_id, dewormer_normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_validity_ignored_at ON pet_dewormings(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_dewormings_deleted_at ON pet_dewormings(deleted_at)');
}

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	const { seedDefaultData = true, createIndexes = true } = options;

	await database.execute('BEGIN IMMEDIATE');
	try {
		await createCurrentSchema(database);
		if (createIndexes) await createCurrentIndexes(database);
		if (seedDefaultData) {
			await seedDefaultVaccineDoseCatalogs(database);
			await seedDefaultVaccineValidityCatalog(database);
		}
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK');
		throw error;
	}
}