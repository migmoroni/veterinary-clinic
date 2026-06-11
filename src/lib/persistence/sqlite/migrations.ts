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

type DefaultPreventiveKind = 'vaccine' | 'antiparasitic';

interface DefaultPreventiveCatalogItem {
	kind: DefaultPreventiveKind;
	name: string;
	species: string[];
	aliases: string[];
}

const defaultPreventiveCatalogItems: DefaultPreventiveCatalogItem[] = [
	{ kind: 'vaccine', name: 'DHPPI+L', species: ['canine'], aliases: ['V 10', 'V10', 'V 8', 'V8', 'polivalente canina', 'multipla canina', 'dhppi l', 'dhppil'] },
	{ kind: 'vaccine', name: 'DHPPI', species: ['canine'], aliases: ['quintupla canina', 'multipla sem lepto', 'dhppi'] },
	{ kind: 'vaccine', name: 'Puppy DP', species: ['canine'], aliases: ['puppy', 'filhote', 'cinomose parvovirose'] },
	{ kind: 'vaccine', name: 'Giardia inativada', species: ['canine'], aliases: ['giardia', 'giardiase', 'giardiavax'] },
	{ kind: 'vaccine', name: 'Traqueobronquite infecciosa canina', species: ['canine'], aliases: ['gripe canina', 'tosse dos canis', 'kennel cough', 'kc', 'bronchiguard'] },
	{ kind: 'vaccine', name: 'Leishmaniose canina', species: ['canine'], aliases: ['leishtec', 'leishmaniose', 'calazar'] },
	{ kind: 'vaccine', name: 'Antirrábica inativada', species: ['canine', 'feline'], aliases: ['antirrabica', 'raiva', 'rabies', 'rabisin', 'defensor', 'nobivac rabies'] },
	{ kind: 'vaccine', name: 'Tríplice felina FVRCP', species: ['feline'], aliases: ['tríplice felina', 'triplice felina', 'v3', 'fvrcp', 'rinotraqueite calicivirose panleucopenia'] },
	{ kind: 'vaccine', name: 'Quádrupla felina FVRCP+Ch', species: ['feline'], aliases: ['quádrupla felina', 'quadrupla felina', 'v4', 'clamidiose'] },
	{ kind: 'vaccine', name: 'Quíntupla felina FVRCP+Ch+FeLV', species: ['feline'], aliases: ['quíntupla felina', 'quintupla felina', 'v5', 'felv', 'leucemia felina'] },
	{ kind: 'vaccine', name: 'FeLV recombinante', species: ['feline'], aliases: ['leucemia felina', 'felv', 'leucogen', 'purevax felv'] },
	{ kind: 'vaccine', name: 'Nobivac DHPPi', species: ['canine'], aliases: ['nobivac', 'nobivac dhppi', 'dhppi'] },
	{ kind: 'vaccine', name: 'Nobivac L4', species: ['canine'], aliases: ['nobivac lepto', 'l4', 'leptospirose'] },
	{ kind: 'vaccine', name: 'Recombitek C6', species: ['canine'], aliases: ['recombitek', 'recombitek c6', 'v10'] },
	{ kind: 'vaccine', name: 'Vanguard Plus', species: ['canine'], aliases: ['vanguard', 'vanguard plus', 'polivalente canina'] },
	{ kind: 'vaccine', name: 'Nobivac Tricat Trio', species: ['feline'], aliases: ['tricat', 'tricat trio', 'tríplice felina', 'triplice felina'] },
	{ kind: 'vaccine', name: 'Felocell CVR', species: ['feline'], aliases: ['felocell', 'felocell cvr', 'tríplice felina', 'triplice felina'] },
	{ kind: 'vaccine', name: 'Versifel FeLV', species: ['feline'], aliases: ['versifel', 'versifel felv', 'leucemia felina'] },
	{ kind: 'antiparasitic', name: 'Praziquantel + Pamoato de pirantel + Febantel', species: ['canine'], aliases: ['drontal plus', 'endogard', 'canex premium', 'antiparasitario amplo espectro', 'tenicida'] },
	{ kind: 'antiparasitic', name: 'Praziquantel + Pamoato de pirantel', species: ['feline'], aliases: ['drontal gatos', 'drontal cats', 'antiparasitario gatos', 'tenicida'] },
	{ kind: 'antiparasitic', name: 'Milbemicina oxima + Praziquantel', species: ['canine', 'feline'], aliases: ['milbemax', 'milpro', 'milbemicina', 'praziquantel'] },
	{ kind: 'antiparasitic', name: 'Febantel + Pamoato de pirantel + Praziquantel', species: ['canine'], aliases: ['drontal', 'drontal plus sabor', 'endoparasitas'] },
	{ kind: 'antiparasitic', name: 'Fenbendazol', species: ['canine', 'feline'], aliases: ['panacur', 'fembendazol', 'giardia', 'nematódeos', 'nematodeos'] },
	{ kind: 'antiparasitic', name: 'Febantel', species: ['canine'], aliases: ['giardicid', 'giardia', 'verme redondo'] },
	{ kind: 'antiparasitic', name: 'Selamectina', species: ['canine', 'feline'], aliases: ['revolution', 'stronghold', 'endectocida'] },
	{ kind: 'antiparasitic', name: 'Moxidectina + Imidacloprida', species: ['canine', 'feline'], aliases: ['advocate', 'advantage multi', 'endectocida'] },
	{ kind: 'antiparasitic', name: 'Emodepsida + Praziquantel', species: ['feline'], aliases: ['profender', 'antiparasitario topico gatos'] },
	{ kind: 'antiparasitic', name: 'Afoxolaner + Milbemicina oxima', species: ['canine'], aliases: ['nexgard spectra', 'endectocida', 'milbemicina'] },
	{ kind: 'antiparasitic', name: 'Sarolaner + Moxidectina + Pirantel', species: ['canine'], aliases: ['simparic trio', 'endectocida', 'pirantel'] },
	{ kind: 'antiparasitic', name: 'Ivermectina', species: ['canine'], aliases: ['ivermectina oral', 'endectocida'] }
];

function normalizePreventiveCatalogName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

async function seedDefaultPreventiveCatalog(database: Database): Promise<void> {
	for (const item of defaultPreventiveCatalogItems) {
		await database.execute(
			`INSERT OR IGNORE INTO preventive_catalog_items (kind, name, normalized_name, species, aliases, updated_at)
			 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
			[item.kind, item.name, normalizePreventiveCatalogName(item.name), JSON.stringify(item.species), JSON.stringify(item.aliases)]
		);
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

export async function runMigrations(database: Database, options: RunMigrationsOptions = {}): Promise<void> {
	const { createIndexes = true, seedDefaultData = false } = options;

	await database.execute('BEGIN IMMEDIATE');
	try {
		await createCurrentSchema(database);
		if (seedDefaultData) await seedDefaultPreventiveCatalog(database);
		if (createIndexes) await createCurrentIndexes(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK');
		throw error;
	}
}
