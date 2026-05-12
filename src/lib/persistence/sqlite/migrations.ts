import type Database from '@tauri-apps/plugin-sql';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';

const defaultVaccinePresets = [
	{ name: 'V 10', validityMonths: 12 },
	{ name: 'V 8', validityMonths: 12 },
	{ name: 'Antirrábica', validityMonths: 12 },
	{ name: 'Recombitek', validityMonths: 12 },
	{ name: 'Quadrupla', validityMonths: 12 },
	{ name: 'Quíntupla', validityMonths: 12 },
	{ name: 'Giardia', validityMonths: 12 },
	{ name: 'Gripe', validityMonths: 12 },
	{ name: 'Nobivac', validityMonths: 12 },
	{ name: 'Imunocan', validityMonths: 12 }
] as const;

async function createCurrentSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			avatar_blob BLOB,
			street TEXT,
			street_number TEXT,
			address_complement TEXT,
			neighborhood TEXT,
			city TEXT,
			state TEXT,
			country TEXT NOT NULL DEFAULT 'Brazil',
			postal_code TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email')),
			value TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(owner_id, kind, value)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			birth_date TEXT,
			species TEXT CHECK(species IN ('canine', 'feline')),
			breed TEXT,
			sex TEXT CHECK(sex IN ('M', 'F')),
			avatar_blob BLOB,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS medical_records (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			title TEXT,
			description TEXT,
			admitted_at TEXT DEFAULT CURRENT_DATE,
			discharged_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY,
			value TEXT,
			updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS backup_history (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			path TEXT NOT NULL,
			kind TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_presets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL UNIQUE,
			validity_months INTEGER NOT NULL DEFAULT 12 CHECK(validity_months > 0),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_vaccinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE,
			vaccine_preset_id INTEGER NOT NULL,
			vaccine_name TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE RESTRICT
		)
	`);

	await database.execute('CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON owner_contacts(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_value ON owner_contacts(value)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_presets_normalized_name ON vaccine_presets(normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_id ON pet_vaccinations(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at)');

	for (const preset of defaultVaccinePresets) {
		await database.execute(
			`INSERT OR IGNORE INTO vaccine_presets (name, normalized_name, validity_months, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
			[preset.name, normalizeVaccineName(preset.name), preset.validityMonths]
		);
	}
}

export async function runMigrations(database: Database): Promise<void> {
	await database.execute('BEGIN IMMEDIATE');
	try {
		await createCurrentSchema(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK');
		throw error;
	}
}