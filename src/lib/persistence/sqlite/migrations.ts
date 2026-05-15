import type Database from '@tauri-apps/plugin-sql';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';

const defaultVaccinePresets = [
	{
		name: 'V 10',
		doses: [
			{ label: '1ª dose', validityValue: 21, validityUnit: 'days' },
			{ label: '2ª dose', validityValue: 21, validityUnit: 'days' },
			{ label: '3ª dose', validityValue: 21, validityUnit: 'days' },
			{ label: '4ª dose', validityValue: 12, validityUnit: 'months' },
			{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }
		]
	},
	{ name: 'V 8', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Antirrábica', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Recombitek', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Quadrupla', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Quíntupla', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Giardia', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Gripe', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Nobivac', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] },
	{ name: 'Imunocan', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }
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
			additional_information TEXT,
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
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '',
			value TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(owner_id, kind, label, value)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_additional_responsibles (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS owner_additional_responsible_contacts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			responsible_id INTEGER NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '',
			value TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			UNIQUE(responsible_id, kind, label, value)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			birth_date TEXT,
			species TEXT CHECK(species IN ('canine', 'feline')),
			breed TEXT,
			sex TEXT CHECK(sex IN ('M', 'F')),
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
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_preset_doses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			vaccine_preset_id INTEGER NOT NULL,
			label TEXT NOT NULL,
			normalized_label TEXT NOT NULL,
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE CASCADE,
			UNIQUE(vaccine_preset_id, normalized_label)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_vaccinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE,
			vaccine_preset_id INTEGER NOT NULL,
			vaccine_preset_dose_id INTEGER NOT NULL,
			vaccine_name TEXT NOT NULL,
			vaccine_dose_label TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE RESTRICT,
			FOREIGN KEY (vaccine_preset_dose_id) REFERENCES vaccine_preset_doses(id) ON DELETE RESTRICT
		)
	`);

	await database.execute('CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON owner_contacts(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_label ON owner_contacts(label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_contacts_value ON owner_contacts(value)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_name ON owner_additional_responsibles(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsible_contacts_responsible_id ON owner_additional_responsible_contacts(responsible_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsible_contacts_label ON owner_additional_responsible_contacts(label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_owner_additional_responsible_contacts_value ON owner_additional_responsible_contacts(value)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_owners_owner_id ON pet_owners(owner_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_presets_normalized_name ON vaccine_presets(normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_preset_doses_vaccine_preset_id ON vaccine_preset_doses(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_preset_doses_normalized_label ON vaccine_preset_doses(normalized_label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_id ON pet_vaccinations(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_dose_id ON pet_vaccinations(vaccine_preset_dose_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at)');

	for (const preset of defaultVaccinePresets) {
		await database.execute(
			`INSERT OR IGNORE INTO vaccine_presets (name, normalized_name, updated_at)
			 VALUES ($1, $2, CURRENT_TIMESTAMP)`,
			[preset.name, normalizeVaccineName(preset.name)]
		);

		const rows = await database.select<{ id: number }[]>(
			`SELECT id
			 FROM vaccine_presets
			 WHERE normalized_name = $1
			 LIMIT 1`,
			[normalizeVaccineName(preset.name)]
		);
		const presetId = rows[0]?.id;
		if (!presetId) continue;

		for (const [index, dose] of preset.doses.entries()) {
			const sortOrder = dose.label === 'Dose de reforço' ? 99 : index;
			await database.execute(
				`INSERT OR IGNORE INTO vaccine_preset_doses (vaccine_preset_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
				[presetId, dose.label, normalizeVaccineName(dose.label), dose.validityValue, dose.validityUnit, sortOrder]
			);
		}
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