import type Database from '@tauri-apps/plugin-sql';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';

const defaultVaccinePresets = [
	{
		name: 'V 10',
		protocols: [
			{
				name: 'Padrão',
				doses: [
					{ label: '1ª dose', validityValue: 21, validityUnit: 'days' },
					{ label: '2ª dose', validityValue: 21, validityUnit: 'days' },
					{ label: '3ª dose', validityValue: 21, validityUnit: 'days' },
					{ label: '4ª dose', validityValue: 12, validityUnit: 'months' },
					{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }
				]
			}
		]
	},
	{ name: 'V 8', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Antirrábica', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Recombitek', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Quadrupla', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Quíntupla', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Giardia', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Gripe', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Nobivac', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] },
	{ name: 'Imunocan', protocols: [{ name: 'Padrão', doses: [{ label: 'Dose de reforço', validityValue: 12, validityUnit: 'months' }] }] }
] as const;

function optionalTextCheck(column: string, maxLength: number): string {
	return `${column} IS NULL OR length(${column}) <= ${maxLength}`;
}

function requiredTextCheck(column: string, maxLength: number): string {
	return `length(trim(${column})) BETWEEN 1 AND ${maxLength}`;
}

interface RunMigrationsOptions {
	seedDefaultData?: boolean;
}

async function createCurrentSchema(database: Database): Promise<void> {
	await database.execute(`
		CREATE TABLE IF NOT EXISTS owners (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerName)}),
			avatar_blob BLOB,
			street TEXT CHECK(${optionalTextCheck('street', FIELD_LIMITS.ownerStreet)}),
			street_number TEXT CHECK(${optionalTextCheck('street_number', FIELD_LIMITS.ownerStreetNumber)}),
			address_complement TEXT CHECK(${optionalTextCheck('address_complement', FIELD_LIMITS.ownerAddressComplement)}),
			neighborhood TEXT CHECK(${optionalTextCheck('neighborhood', FIELD_LIMITS.ownerNeighborhood)}),
			city TEXT CHECK(${optionalTextCheck('city', FIELD_LIMITS.ownerCity)}),
			state TEXT CHECK(${optionalTextCheck('state', FIELD_LIMITS.ownerState)}),
			country TEXT NOT NULL DEFAULT 'BRA' CHECK(length(country) = ${FIELD_LIMITS.ownerCountry}),
			postal_code TEXT CHECK(${optionalTextCheck('postal_code', FIELD_LIMITS.ownerPostalCode)}),
			additional_information TEXT CHECK(${optionalTextCheck('additional_information', FIELD_LIMITS.ownerAdditionalInformation)}),
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
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
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
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerAdditionalResponsibleName)}),
			avatar_blob BLOB,
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
			label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= ${FIELD_LIMITS.ownerContactLabel} AND (kind = 'other' OR label = '')),
			value TEXT NOT NULL CHECK(length(trim(value)) > 0 AND ((kind IN ('phone', 'mobile') AND length(value) <= ${FIELD_LIMITS.ownerContactPhoneValue}) OR (kind = 'email' AND length(value) <= ${FIELD_LIMITS.ownerContactEmailValue}) OR (kind = 'other' AND length(value) <= ${FIELD_LIMITS.ownerContactOtherValue}))),
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
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.petName)}),
			birth_date TEXT CHECK(${optionalTextCheck('birth_date', FIELD_LIMITS.petBirthDate)}),
			species TEXT CHECK(species IS NULL OR (species IN ('canine', 'feline') AND length(species) <= ${FIELD_LIMITS.petSpecies})),
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
			kind TEXT NOT NULL CHECK(kind IN ('manual_backup', 'export', 'import', 'pre_import_backup') AND length(kind) <= ${FIELD_LIMITS.backupKind}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_presets (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.vaccinePresetName)}),
			normalized_name TEXT NOT NULL UNIQUE CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
			default_protocol_id INTEGER,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			hidden_at TEXT,
			updated_at TEXT
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_protocols (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			vaccine_preset_id INTEGER NOT NULL,
			name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.vaccineProtocolName)}),
			normalized_name TEXT NOT NULL CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedProtocolName)}),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE CASCADE,
			UNIQUE(vaccine_preset_id, normalized_name)
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS vaccine_preset_doses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			vaccine_preset_id INTEGER NOT NULL,
			vaccine_protocol_id INTEGER NOT NULL,
			label TEXT NOT NULL CHECK(${requiredTextCheck('label', FIELD_LIMITS.vaccineDoseLabel)}),
			normalized_label TEXT NOT NULL CHECK(${requiredTextCheck('normalized_label', FIELD_LIMITS.vaccineNormalizedDoseLabel)}),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE CASCADE,
			FOREIGN KEY (vaccine_protocol_id) REFERENCES vaccine_protocols(id) ON DELETE CASCADE,
			UNIQUE(vaccine_protocol_id, normalized_label),
			CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.vaccineValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.vaccineValidityMonths}))
		)
	`);

	await database.execute(`
		CREATE TABLE IF NOT EXISTS pet_vaccinations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE CHECK(length(applied_at) <= ${FIELD_LIMITS.isoDate}),
			vaccine_preset_id INTEGER NOT NULL,
			vaccine_protocol_id INTEGER NOT NULL,
			vaccine_preset_dose_id INTEGER NOT NULL,
			vaccine_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_name', FIELD_LIMITS.vaccinePresetName)}),
			vaccine_protocol_name TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_protocol_name', FIELD_LIMITS.vaccineProtocolName)}),
			vaccine_dose_label TEXT NOT NULL CHECK(${requiredTextCheck('vaccine_dose_label', FIELD_LIMITS.vaccineDoseLabel)}),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets(id) ON DELETE RESTRICT,
			FOREIGN KEY (vaccine_protocol_id) REFERENCES vaccine_protocols(id) ON DELETE RESTRICT,
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
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_presets_hidden_at ON vaccine_presets(hidden_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_vaccine_preset_id ON vaccine_protocols(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_protocols_normalized_name ON vaccine_protocols(normalized_name)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_preset_doses_vaccine_preset_id ON vaccine_preset_doses(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_preset_doses_vaccine_protocol_id ON vaccine_preset_doses(vaccine_protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_vaccine_preset_doses_normalized_label ON vaccine_preset_doses(normalized_label)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_id ON pet_vaccinations(vaccine_preset_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_protocol_id ON pet_vaccinations(vaccine_protocol_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_dose_id ON pet_vaccinations(vaccine_preset_dose_id)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at)');
	await database.execute('CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at)');
}

async function seedDefaultVaccinePresets(database: Database): Promise<void> {
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

		for (const [protocolIndex, protocol] of preset.protocols.entries()) {
			await database.execute(
				`INSERT OR IGNORE INTO vaccine_protocols (vaccine_preset_id, name, normalized_name, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
				[presetId, protocol.name, normalizeVaccineName(protocol.name), protocolIndex]
			);

			const protocolRows = await database.select<{ id: number }[]>(
				`SELECT id
				 FROM vaccine_protocols
				 WHERE vaccine_preset_id = $1 AND normalized_name = $2
				 LIMIT 1`,
				[presetId, normalizeVaccineName(protocol.name)]
			);
			const protocolId = protocolRows[0]?.id;
			if (!protocolId) continue;

			if (protocolIndex === 0) {
				await database.execute('UPDATE vaccine_presets SET default_protocol_id = COALESCE(default_protocol_id, $2) WHERE id = $1', [presetId, protocolId]);
			}

			for (const [index, dose] of protocol.doses.entries()) {
				const sortOrder = dose.label === 'Dose de reforço' ? 99 : index;
				await database.execute(
					`INSERT OR IGNORE INTO vaccine_preset_doses (vaccine_preset_id, vaccine_protocol_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at)
					 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
					[presetId, protocolId, dose.label, normalizeVaccineName(dose.label), dose.validityValue, dose.validityUnit, sortOrder]
				);
			}
		}
	}
}

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	await database.execute('BEGIN IMMEDIATE');
	try {
		await createCurrentSchema(database);
		if (options.seedDefaultData) await seedDefaultVaccinePresets(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK');
		throw error;
	}
}