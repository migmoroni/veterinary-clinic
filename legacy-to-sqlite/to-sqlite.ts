import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import Database from 'better-sqlite3';

type CsvRow = Record<string, string | undefined>;
type OwnerContactKind = 'phone' | 'mobile' | 'email' | 'other';
type PetSex = 'M' | 'F' | null;
type PetSpecies = 'canine' | 'feline';
type VaccineValidityUnit = 'days' | 'months';

interface BreedAlias {
  id: string;
  aliases: string[];
}

interface PetTaxonomy {
  species: PetSpecies;
  breed: string;
}

interface VaccineMatcher {
  name: string;
  pattern: RegExp;
}

interface DatedRecordBlock {
  appliedAt: string;
  text: string;
}

interface ExtractedVaccination {
  appliedAt: string;
  vaccine: string;
  doseLabel: string;
}

interface VaccineMatch {
  name: string;
  index: number;
}

interface DoseSignal {
  label: string;
  sortOrder: number;
  index: number;
  kind: 'numbered' | 'booster';
}

interface VaccineIdRow {
  id: number;
  normalized_name: string;
}

interface ImportedVaccinationReference {
  id: number;
  appliedAt: string;
}

interface CountRow {
  total: number;
}

interface SkippedRow {
  code: string;
  petName: string;
  ownerName: string;
  reason: string;
}

interface DuplicatePetCandidate {
  ownerName: string;
  petName: string;
  codes: string[];
}

interface ParsedLegacyAddress {
  street: string | null;
  streetNumber: string | null;
  addressComplement: string | null;
  ownerContacts: LegacyOwnerContactInput[];
  additionalResponsibles: LegacyAdditionalResponsibleInput[];
}

interface LegacyOwnerContactInput {
  kind: OwnerContactKind;
  label?: string;
  value: string;
}

interface LegacyAdditionalResponsibleInput {
  name: string;
  avatarBytes?: Buffer | null;
  contacts: LegacyOwnerContactInput[];
}

interface ParsedLegacyOwnerName {
  ownerName: string | null;
  ownerContacts: LegacyOwnerContactInput[];
  additionalResponsibles: LegacyAdditionalResponsibleInput[];
}

interface ParsedLegacyAdditionalResponsibles {
  ownerContacts: LegacyOwnerContactInput[];
  additionalResponsibles: LegacyAdditionalResponsibleInput[];
}

interface ImportReport {
  sourceRows: number;
  sourceNumericCodes: number;
  sourceFirstCode: number | null;
  sourceLastCode: number | null;
  sourceCodeGapCount: number;
  sourceCodeGapSamples: number[];
  skippedRows: SkippedRow[];
  ownersCreated: number;
  ownersReused: number;
  ownerContactsCreated: number;
  ownerContactsReused: number;
  ownerAdditionalResponsiblesCreated: number;
  ownerAdditionalResponsiblesReused: number;
  ownerAdditionalResponsibleContactsCreated: number;
  ownerAdditionalResponsibleContactsReused: number;
  petsCreated: number;
  medicalRecordsCreated: number;
  medicalRecordPeriodsDerived: number;
  medicalRecordPeriodsWithDischarge: number;
  medicalRecordPeriodsMissing: number;
  rowsWithoutMedicalRecord: number;
  vaccinationsCreated: number;
  vaccinationsIgnoredForValidity: number;
  vaccinationDatesDiscarded: number;
  vaccinationDateDiscardSamples: string[];
  duplicatePetCandidates: Map<string, DuplicatePetCandidate>;
}

const projectDir = process.cwd();
const db = new Database(path.resolve(projectDir, 'build/veterinary_clinic.db'));

db.pragma('foreign_keys = ON');

const FIELD_LIMITS = {
  ownerName: 120,
  ownerStreet: 160,
  ownerStreetNumber: 32,
  ownerAddressComplement: 80,
  ownerNeighborhood: 120,
  ownerCity: 120,
  ownerState: 80,
  ownerCountry: 3,
  ownerPostalCode: 32,
  ownerAdditionalInformation: 2000,
  ownerContactLabel: 64,
  ownerContactPhoneValue: 32,
  ownerContactEmailValue: 254,
  ownerContactOtherValue: 120,
  ownerAdditionalResponsibleName: 120,
  petName: 80,
  petBirthDate: 10,
  petSpecies: 80,
  petBreed: 80,
  petSex: 1,
  medicalRecordTitle: 160,
  medicalRecordDescription: 36000,
  isoDate: 10,
  settingKey: 80,
  settingValue: 4096,
  backupPath: 2048,
  backupKind: 32,
  vaccineName: 80,
  vaccineNormalizedName: 80,
  vaccineDoseType: 80,
  vaccineDoseNumber: 999,
  vaccineValidityDays: 3650,
  vaccineValidityMonths: 120,
  vaccinationObservation: 2000,
  searchQuery: 160
} as const;

const optionalTextCheck = (column: string, maxLength: number): string => `${column} IS NULL OR length(${column}) <= ${maxLength}`;
const requiredTextCheck = (column: string, maxLength: number): string => `length(trim(${column})) BETWEEN 1 AND ${maxLength}`;
const backupPolicyIntervalSettingKey = 'backup.policyIntervalMinutes';
const defaultBackupPolicyIntervalMinutes = 7 * 24 * 60;

db.exec(`
  DROP TABLE IF EXISTS pet_vaccinations;
  DROP TABLE IF EXISTS vaccine_validity_options;
  DROP TABLE IF EXISTS vaccine_dose_types;
  DROP TABLE IF EXISTS vaccines;
  DROP TABLE IF EXISTS backup_history;
  DROP TABLE IF EXISTS app_settings;
  DROP TABLE IF EXISTS medical_records;
  DROP TABLE IF EXISTS pet_owners;
  DROP TABLE IF EXISTS pets;
  DROP TABLE IF EXISTS owner_additional_responsibles;
  DROP TABLE IF EXISTS owner_contacts;
  DROP TABLE IF EXISTS owners;

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
  );

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
    FOREIGN KEY (owner_id) REFERENCES owners (id) ON DELETE CASCADE,
    FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles (id) ON DELETE CASCADE,
    CHECK((owner_id IS NOT NULL AND responsible_id IS NULL) OR (owner_id IS NULL AND responsible_id IS NOT NULL)),
    UNIQUE(owner_id, kind, label, value),
    UNIQUE(responsible_id, kind, label, value)
  );

  CREATE TABLE IF NOT EXISTS owner_additional_responsibles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.ownerAdditionalResponsibleName)}),
    avatar_blob BLOB,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (owner_id) REFERENCES owners (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.petName)}),
    birth_date TEXT CHECK(${optionalTextCheck('birth_date', FIELD_LIMITS.petBirthDate)}),
    species TEXT CHECK(species IS NULL OR length(species) <= ${FIELD_LIMITS.petSpecies}),
    breed TEXT CHECK(${optionalTextCheck('breed', FIELD_LIMITS.petBreed)}),
    sex TEXT CHECK(sex IS NULL OR (sex IN ('M', 'F') AND length(sex) = ${FIELD_LIMITS.petSex})),
    avatar_blob BLOB,
    updated_at TEXT,
    deleted_at TEXT,
    purge_after TEXT
  );

  CREATE TABLE IF NOT EXISTS pet_owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES owners (id) ON DELETE CASCADE,
    UNIQUE(pet_id, owner_id)
  );

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
    FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
    CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY CHECK(${requiredTextCheck('key', FIELD_LIMITS.settingKey)}),
    value TEXT CHECK(${optionalTextCheck('value', FIELD_LIMITS.settingValue)}),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL CHECK(${requiredTextCheck('path', FIELD_LIMITS.backupPath)}),
    kind TEXT NOT NULL CHECK(kind IN ('manual_backup', 'automatic_backup', 'export', 'import', 'pre_import_backup') AND length(kind) <= ${FIELD_LIMITS.backupKind}),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vaccines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.vaccineName)}),
    normalized_name TEXT NOT NULL UNIQUE CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
    hidden_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS vaccine_dose_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL CHECK(${requiredTextCheck('name', FIELD_LIMITS.vaccineDoseType)}),
    normalized_name TEXT NOT NULL UNIQUE CHECK(${requiredTextCheck('normalized_name', FIELD_LIMITS.vaccineNormalizedName)}),
    requires_dose_number INTEGER NOT NULL DEFAULT 1 CHECK(requires_dose_number IN (0, 1)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    hidden_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

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
  );

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
    FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE RESTRICT,
    CHECK((validity_unit = 'days' AND validity_value <= ${FIELD_LIMITS.vaccineValidityDays}) OR (validity_unit = 'months' AND validity_value <= ${FIELD_LIMITS.vaccineValidityMonths}))
  );

  CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON owner_contacts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_responsible_id ON owner_contacts(responsible_id);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_label ON owner_contacts(label);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_value ON owner_contacts(value);
  CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id);
  CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_name ON owner_additional_responsibles(name);
  CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id);
  CREATE INDEX IF NOT EXISTS idx_pet_owners_owner_id ON pet_owners(owner_id);
  CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);
  CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
  CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);
  CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);
  CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_vaccines_normalized_name ON vaccines(normalized_name);
  CREATE INDEX IF NOT EXISTS idx_vaccines_hidden_at ON vaccines(hidden_at);
  CREATE INDEX IF NOT EXISTS idx_vaccine_dose_types_normalized_name ON vaccine_dose_types(normalized_name);
  CREATE INDEX IF NOT EXISTS idx_vaccine_dose_types_hidden_at ON vaccine_dose_types(hidden_at);
  CREATE INDEX IF NOT EXISTS idx_vaccine_validity_options_value_unit ON vaccine_validity_options(validity_value, validity_unit);
  CREATE INDEX IF NOT EXISTS idx_vaccine_validity_options_hidden_at ON vaccine_validity_options(hidden_at);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_normalized_name ON pet_vaccinations(vaccine_normalized_name);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at);
`);

const insertOwner = db.prepare(`
  INSERT INTO owners (name, street, street_number, address_complement, neighborhood, city, state, country, postal_code, additional_information)
  VALUES (@name, @street, @streetNumber, @addressComplement, @neighborhood, @city, @state, @country, @postalCode, @additionalInformation)
`);

const insertOwnerContact = db.prepare(`
  INSERT OR IGNORE INTO owner_contacts (owner_id, kind, label, value, sort_order, updated_at)
  VALUES (@ownerId, @kind, @label, @value, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertOwnerAdditionalResponsible = db.prepare(`
  INSERT INTO owner_additional_responsibles (owner_id, name, avatar_blob, sort_order, updated_at)
  VALUES (@ownerId, @name, @avatarBytes, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertOwnerAdditionalResponsibleContact = db.prepare(`
  INSERT OR IGNORE INTO owner_contacts (responsible_id, kind, label, value, sort_order, updated_at)
  VALUES (@responsibleId, @kind, @label, @value, @sortOrder, CURRENT_TIMESTAMP)
`);


const insertPet = db.prepare(`
  INSERT INTO pets (name, birth_date, species, breed, sex)
  VALUES (@name, @birthDate, @species, @breed, @sex)
`);

const insertPetOwner = db.prepare(`
  INSERT OR IGNORE INTO pet_owners (pet_id, owner_id, sort_order, updated_at)
  VALUES (@petId, @ownerId, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertMedicalRecord = db.prepare(`
  INSERT INTO medical_records (pet_id, description, admitted_at, discharged_at, updated_at)
  VALUES (@petId, @description, @admittedAt, @dischargedAt, CURRENT_TIMESTAMP)
`);

const insertVaccine = db.prepare(`
  INSERT OR IGNORE INTO vaccines (name, normalized_name, updated_at)
  VALUES (@name, @normalizedName, CURRENT_TIMESTAMP)
`);

const insertDoseType = db.prepare(`
  INSERT OR IGNORE INTO vaccine_dose_types (name, normalized_name, requires_dose_number, sort_order, updated_at)
  VALUES (@name, @normalizedName, @requiresDoseNumber, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertValidityOption = db.prepare(`
  INSERT OR IGNORE INTO vaccine_validity_options (validity_value, validity_unit, sort_order, updated_at)
  VALUES (@validityValue, @validityUnit, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertSetting = db.prepare(`
  INSERT INTO app_settings (key, value, updated_at)
  VALUES (@key, @value, CURRENT_TIMESTAMP)
`);

const insertPetVaccination = db.prepare(`
  INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_name, vaccine_normalized_name, dose_type, dose_number, validity_value, validity_unit, observation, updated_at)
  VALUES (@petId, @appliedAt, @vaccineName, @vaccineNormalizedName, @doseType, @doseNumber, @validityValue, @validityUnit, @observation, CURRENT_TIMESTAMP)
`);

const markVaccinationValidityIgnored = db.prepare(`
  UPDATE pet_vaccinations
  SET validity_ignored_at = COALESCE(validity_ignored_at, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
    AND deleted_at IS NULL
`);

const normalizeVaccineName = (value: string | undefined): string => {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
};
const initialDoseTypeLabel = 'Dose inicial';
const boosterDoseTypeLabel = 'Reforço';
const boosterDoseLabel = 'Dose de reforço';

const defaultVaccineNames = ['V 10', 'V 8', 'Antirrábica', 'Recombitek', 'Quadrupla', 'Quíntupla', 'Giardia', 'Gripe', 'Nobivac', 'Imunocan'];

const defaultDoseTypes = [
  { name: initialDoseTypeLabel, requiresDoseNumber: 1, sortOrder: 0 },
  { name: boosterDoseTypeLabel, requiresDoseNumber: 0, sortOrder: 1 }
];

const defaultValidityOptions = [
  { validityValue: 21, validityUnit: 'days', sortOrder: 0 },
  { validityValue: 12, validityUnit: 'months', sortOrder: 1 }
];

for (const name of defaultVaccineNames) {
  insertVaccine.run({ name, normalizedName: normalizeVaccineName(name) });
}

for (const doseType of defaultDoseTypes) {
  insertDoseType.run({ ...doseType, normalizedName: normalizeVaccineName(doseType.name) });
}

for (const option of defaultValidityOptions) {
  insertValidityOption.run(option);
}

insertSetting.run({ key: backupPolicyIntervalSettingKey, value: String(defaultBackupPolicyIntervalMinutes) });

const vaccineIds = new Map(
  (db.prepare('SELECT id, normalized_name FROM vaccines').all() as VaccineIdRow[]).map((vaccine) => [normalizeVaccineName(vaccine.normalized_name), vaccine.id])
);

const ensureVaccineName = (name: string): string => {
  const normalizedName = normalizeVaccineName(name);
  if (!vaccineIds.has(normalizedName)) {
    const result = insertVaccine.run({ name, normalizedName });
    vaccineIds.set(normalizedName, Number(result.lastInsertRowid));
  }
  return normalizedName;
};

const ownersCache = new Map<string, number | bigint>();
const ownerAdditionalResponsiblesCache = new Map<string, number | bigint>();
const ownerAdditionalResponsibleSortOrder = new Map<string, number>();

const canineBreedAliases: BreedAlias[] = [
  { id: 'mixed-breed', aliases: ['srd', 's r d', 'sem raca definida', 'vira lata', 'viralata'] },
  { id: 'shih-tzu', aliases: ['shih tzu', 'shihtzu', 'shih', 'shi tzu', 'shit tzu'] },
  { id: 'poodle', aliases: ['poodle'] },
  { id: 'pinscher', aliases: ['pinscher', 'pinsher'] },
  { id: 'pit-bull', aliases: ['pit bull', 'pitbull'] },
  { id: 'lhasa-apso', aliases: ['lhasa apso', 'lhasa', 'lhasa apaso'] },
  { id: 'dachshund', aliases: ['teckel', 'dachshund', 'techel'] },
  { id: 'rottweiler', aliases: ['rottweiler', 'rott weiler', 'rottwelier'] },
  { id: 'labrador-retriever', aliases: ['labrador'] },
  { id: 'yorkshire-terrier', aliases: ['yorkshire', 'york shire'] },
  { id: 'german-shepherd', aliases: ['pastor alemao'] },
  { id: 'chow-chow', aliases: ['chow chow'] },
  { id: 'pug', aliases: ['pug'] },
  { id: 'maltese', aliases: ['maltes'] },
  { id: 'border-collie', aliases: ['border collie', 'border colie'] },
  { id: 'golden-retriever', aliases: ['golden', 'golden retrivier'] },
  { id: 'australian-cattle-dog', aliases: ['blue heeler', 'boiadeiro australiano', 'blue hiller', 'australian cattle dog'] },
  { id: 'boxer', aliases: ['boxer'] },
  { id: 'brazilian-terrier', aliases: ['terrier brasileiro', 'fox paulistinha', 'terrier brasilieiro'] },
  { id: 'cocker-spaniel', aliases: ['cocker', 'cooker spaniel'] },
  { id: 'german-spitz', aliases: ['spitz', 'sptiz'] },
  { id: 'pekingese', aliases: ['pequines', 'pequenes'] },
  { id: 'fila-brasileiro', aliases: ['fila brasileiro', 'fila'] },
  { id: 'american-bully', aliases: ['american bully'] },
  { id: 'french-bulldog', aliases: ['bulldog frances', 'buldog frances'] },
  { id: 'american-foxhound', aliases: ['fox hound americano', 'foxhound americano'] },
  { id: 'siberian-husky', aliases: ['husky siberiano', 'husk siberiano', 'hask siberiano', 'huski', 'huski siberiano'] },
  { id: 'shar-pei', aliases: ['sharpei', 'shar pei'] },
  { id: 'beagle', aliases: ['beagle'] },
  { id: 'dalmatian', aliases: ['dalmata'] },
  { id: 'schnauzer', aliases: ['schnauzer'] },
  { id: 'belgian-shepherd', aliases: ['pastor belga'] },
  { id: 'english-bulldog', aliases: ['bulldog ingles'] },
  { id: 'akita', aliases: ['akita'] },
  { id: 'australian-shepherd', aliases: ['pastor australiano', 'australian shepherd', 'aussie'] },
  { id: 'basset-hound', aliases: ['basset', 'basset hound', 'basset round'] },
  { id: 'bernese-mountain-dog', aliases: ['boiadeiro de berna', 'bernese', 'bernese mountain dog'] },
  { id: 'boston-terrier', aliases: ['boston terrier', 'bonston terrier'] },
  { id: 'cane-corso', aliases: ['cane corso'] },
  { id: 'chihuahua', aliases: ['chihuahua'] },
  { id: 'doberman', aliases: ['doberman', 'dobermann'] },
  { id: 'great-dane', aliases: ['dogue alemao', 'great dane', 'dog alemao'] },
  { id: 'jack-russell-terrier', aliases: ['jack russell', 'jack russel', 'jack russel terrier'] },
  { id: 'samoyed', aliases: ['samoieda', 'samoiedo', 'samoyed'] },
  { id: 'weimaraner', aliases: ['weimaraner'] },
  { id: 'affenpinscher', aliases: ['affenpinscher'] },
  { id: 'afghan-hound', aliases: ['galgo afegao', 'afghan hound', 'afegao'] },
  { id: 'airedale-terrier', aliases: ['airedale terrier'] },
  { id: 'basenji', aliases: ['basenji'] },
  { id: 'bichon-frise', aliases: ['bichon frise', 'bichon'] },
  { id: 'bloodhound', aliases: ['bloodhound', 'cao de santo humberto'] },
  { id: 'borzoi', aliases: ['borzoi'] },
  { id: 'bull-terrier', aliases: ['bull terrier'] },
  { id: 'bullmastiff', aliases: ['bullmastiff', 'bull mastiff'] },
  { id: 'cavalier-king-charles-spaniel', aliases: ['cavalier king charles', 'cavalier'] },
  { id: 'collie', aliases: ['collie'] },
  { id: 'coton-de-tulear', aliases: ['coton de tulear', 'coton'] },
  { id: 'dogo-argentino', aliases: ['dogo argentino'] },
  { id: 'dogue-de-bordeaux', aliases: ['dogue de bordeaux'] },
  { id: 'english-setter', aliases: ['setter ingles', 'english setter'] },
  { id: 'fox-terrier', aliases: ['fox terrier'] },
  { id: 'greyhound', aliases: ['greyhound', 'galgo ingles'] },
  { id: 'havanese', aliases: ['havanese', 'bichon havanes', 'havanes'] },
  { id: 'irish-setter', aliases: ['setter irlandes', 'irish setter'] },
  { id: 'italian-greyhound', aliases: ['galgo italiano', 'italian greyhound'] },
  { id: 'japanese-spitz', aliases: ['spitz japones', 'japanese spitz'] },
  { id: 'mastiff', aliases: ['mastiff', 'mastim'] },
  { id: 'papillon', aliases: ['papillon'] },
  { id: 'pembroke-welsh-corgi', aliases: ['corgi', 'welsh corgi', 'pembroke'] },
  { id: 'pointer', aliases: ['pointer', 'pointer ingles'] },
  { id: 'portuguese-water-dog', aliases: ['cao de agua portugues', 'portuguese water dog'] },
  { id: 'saint-bernard', aliases: ['sao bernardo', 'saint bernard'] },
  { id: 'shetland-sheepdog', aliases: ['pastor de shetland', 'shetland sheepdog', 'sheltie'] },
  { id: 'shiba-inu', aliases: ['shiba inu', 'shiba'] },
  { id: 'whippet', aliases: ['whippet'] },
  { id: 'alaskan-malamute', aliases: ['malamute do alasca', 'alaskan malamute', 'malamute'] },
  { id: 'anatolian-shepherd-dog', aliases: ['pastor da anatolia', 'pastor de anatolia', 'anatolian shepherd'] },
  { id: 'barbet', aliases: ['barbet'] },
  { id: 'beauceron', aliases: ['beauceron'] },
  { id: 'belgian-malinois', aliases: ['malinois', 'pastor belga malinois'] },
  { id: 'biewer-terrier', aliases: ['biewer terrier'] },
  { id: 'black-russian-terrier', aliases: ['terrier preto russo', 'black russian terrier'] },
  { id: 'boerboel', aliases: ['boerboel'] },
  { id: 'briard', aliases: ['briard'] },
  { id: 'brussels-griffon', aliases: ['griffon de bruxelas', 'brussels griffon'] },
  { id: 'cardigan-welsh-corgi', aliases: ['welsh corgi cardigan', 'cardigan welsh corgi'] },
  { id: 'chesapeake-bay-retriever', aliases: ['chesapeake bay retriever', 'chesapeake'] },
  { id: 'chinese-crested', aliases: ['cao de crista chines', 'cristado chines', 'chinese crested'] },
  { id: 'clumber-spaniel', aliases: ['clumber spaniel'] },
  { id: 'curly-coated-retriever', aliases: ['curly coated retriever'] },
  { id: 'english-cocker-spaniel', aliases: ['cocker spaniel ingles', 'english cocker spaniel'] },
  { id: 'english-springer-spaniel', aliases: ['springer spaniel ingles', 'english springer spaniel'] },
  { id: 'flat-coated-retriever', aliases: ['flat coated retriever'] },
  { id: 'gordon-setter', aliases: ['setter gordon', 'gordon setter'] },
  { id: 'irish-wolfhound', aliases: ['wolfhound irlandes', 'irish wolfhound'] },
  { id: 'keeshond', aliases: ['keeshond'] },
  { id: 'komondor', aliases: ['komondor'] },
  { id: 'kuvasz', aliases: ['kuvasz'] },
  { id: 'leonberger', aliases: ['leonberger'] },
  { id: 'miniature-pinscher', aliases: ['pinscher miniatura', 'miniature pinscher'] },
  { id: 'newfoundland', aliases: ['terra nova', 'newfoundland'] },
  { id: 'norfolk-terrier', aliases: ['norfolk terrier'] },
  { id: 'norwich-terrier', aliases: ['norwich terrier'] },
  { id: 'old-english-sheepdog', aliases: ['old english sheepdog', 'antigo pastor ingles'] },
  { id: 'pomeranian', aliases: ['pomerania', 'pomeranian', 'lulu da pomerania'] },
  { id: 'rhodesian-ridgeback', aliases: ['rhodesian ridgeback'] },
  { id: 'saluki', aliases: ['saluki'] },
  { id: 'scottish-terrier', aliases: ['scottish terrier'] },
  { id: 'staffordshire-bull-terrier', aliases: ['staffordshire bull terrier', 'staffbull'] },
  { id: 'west-highland-white-terrier', aliases: ['west highland white terrier', 'westie'] }
];

const felineBreedAliases: BreedAlias[] = [
  { id: 'siamese', aliases: ['siames'] },
  { id: 'persian', aliases: ['persa'] },
  { id: 'abyssinian', aliases: ['abissinio', 'abyssinian'] },
  { id: 'angora', aliases: ['angora'] },
  { id: 'bengal', aliases: ['bengal', 'bengali'] },
  { id: 'brazilian-shorthair', aliases: ['pelo curto brasileiro', 'brasileiro pelo curto', 'brazilian shorthair'] },
  { id: 'british-shorthair', aliases: ['british shorthair', 'britanico de pelo curto'] },
  { id: 'burmese', aliases: ['burmes', 'burmese'] },
  { id: 'exotic-shorthair', aliases: ['exotico de pelo curto', 'exotic shorthair'] },
  { id: 'himalayan', aliases: ['himalaio', 'himalayan'] },
  { id: 'maine-coon', aliases: ['maine coon'] },
  { id: 'ragdoll', aliases: ['ragdoll'] },
  { id: 'russian-blue', aliases: ['azul russo', 'russian blue'] },
  { id: 'sacred-birman', aliases: ['sagrado da birmania', 'birman', 'birmana'] },
  { id: 'scottish-fold', aliases: ['scottish fold'] },
  { id: 'sphynx', aliases: ['sphynx', 'esfinge'] },
  { id: 'american-shorthair', aliases: ['american shorthair', 'americano de pelo curto'] },
  { id: 'balinese', aliases: ['balines'] },
  { id: 'cornish-rex', aliases: ['cornish rex'] },
  { id: 'devon-rex', aliases: ['devon rex'] },
  { id: 'egyptian-mau', aliases: ['mau egipcio', 'egyptian mau'] },
  { id: 'manx', aliases: ['manx'] },
  { id: 'norwegian-forest-cat', aliases: ['gato noruegues da floresta', 'norwegian forest'] },
  { id: 'oriental-shorthair', aliases: ['oriental shorthair', 'oriental de pelo curto'] },
  { id: 'savannah', aliases: ['savannah', 'savana'] },
  { id: 'somali', aliases: ['somali'] },
  { id: 'chartreux', aliases: ['chartreux'] },
  { id: 'european-shorthair', aliases: ['europeu de pelo curto', 'european shorthair'] },
  { id: 'japanese-bobtail', aliases: ['bobtail japones', 'japanese bobtail'] },
  { id: 'korat', aliases: ['korat'] },
  { id: 'laperm', aliases: ['laperm', 'la perm'] },
  { id: 'munchkin', aliases: ['munchkin'] },
  { id: 'nebelung', aliases: ['nebelung'] },
  { id: 'ocicat', aliases: ['ocicat'] },
  { id: 'peterbald', aliases: ['peterbald'] },
  { id: 'pixie-bob', aliases: ['pixie bob', 'pixiebob'] },
  { id: 'selkirk-rex', aliases: ['selkirk rex'] },
  { id: 'siberian-cat', aliases: ['siberiano', 'siberian cat'] },
  { id: 'singapura', aliases: ['singapura'] },
  { id: 'snowshoe', aliases: ['snowshoe'] },
  { id: 'tonkinese', aliases: ['tonquines', 'tonkinese'] },
  { id: 'feline-mixed-breed', aliases: ['srd', 's r d', 'sem raca definida', 'felina', 'felino', 'gato', 'gata'] }
];

const breedAliases: Record<PetSpecies, BreedAlias[]> = {
  canine: canineBreedAliases,
  feline: felineBreedAliases
};

const vaccineMatchers: VaccineMatcher[] = [
  { name: 'V 10', pattern: /\b(?:v\s*10|v10|v\s*1o|v1o|dhppi(?:\s*l)?|dhppil)\b/ },
  { name: 'V 8', pattern: /\b(?:v\s*8|v8)\b/ },
  { name: 'Antirrábica', pattern: /\banti\s*r*abic[ao]?\b|\braiva\b/ },
  { name: 'Recombitek', pattern: /\brecombite[ck]\b/ },
  { name: 'Quadrupla', pattern: /\bquadrupla\b/ },
  { name: 'Quíntupla', pattern: /\bquintupla\b/ },
  { name: 'Giardia', pattern: /\bgiardia\b/ },
  { name: 'Gripe', pattern: /\bgripe\b/ },
  { name: 'Nobivac', pattern: /\bnobivac\b/ },
  { name: 'Imunocan', pattern: /\bimunocan\b/ }
];

const numberedDoseMatchers = [
  { label: '1ª dose', sortOrder: 0, pattern: /\b(?:1\s*(?:a|o)?|primeir[ao])\s*dose\b/ },
  { label: '2ª dose', sortOrder: 1, pattern: /\b(?:2\s*(?:a|o)?|segund[ao])\s*dose\b/ },
  { label: '3ª dose', sortOrder: 2, pattern: /\b(?:3\s*(?:a|o)?|terceir[ao])\s*dose\b/ },
  { label: '4ª dose', sortOrder: 3, pattern: /\b(?:4\s*(?:a|o)?|quart[ao])\s*dose\b/ }
];

const boosterOnlyVaccines = new Set(['Antirrábica']);

const dateHeaderPattern = /(^|\n)\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*(?:\d{2}|\d{4}))\s*:/g;

const textLength = (value: string | null | undefined): number => Array.from(value ?? '').length;

const truncateText = (value: string, maxLength: number): string => {
  const characters = Array.from(value);
  return characters.length <= maxLength ? value : characters.slice(0, maxLength).join('');
};

const nullable = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const nullableWithLimit = (value: string | undefined | null, maxLength: number): string | null => {
  const trimmed = nullable(value);
  return trimmed ? truncateText(trimmed, maxLength) : null;
};

const limitedContactValue = (kind: OwnerContactKind, value: string): string | null => {
  const maxLength = kind === 'email' ? FIELD_LIMITS.ownerContactEmailValue : kind === 'other' ? FIELD_LIMITS.ownerContactOtherValue : FIELD_LIMITS.ownerContactPhoneValue;
  if ((kind === 'email' || kind === 'phone' || kind === 'mobile') && textLength(value) > maxLength) return null;
  return truncateText(value, maxLength);
};

const limitedPhoneValue = (value: string): string | null => limitedContactValue('phone', value);

const cityNameAliases: [string[], string][] = [
  [
    // All misspellings found in the CSV for Américo Brasiliense
    ['américo brasiliense', 'americo brasiliense',
      'amnérico brasiliense', 'amérioc brasiliense', 'américo brasailiense',
      'américo brasilinese', 'américo brasileinse', 'amério brasiliense',
      'américo brtasiliense', 'amárico brasiliense', 'américo brasliense',
      'américo braisiliense', 'amérioco brasiliense', 'amérrico brasiliense',
      'améroico brasiliense', 'amério brasileinse', 'américvo brasiliense',
      'américo rasiliense', 'américo brsiliense', 'américo breasiliense',
      'américo brasilinse', 'americo brasilinse', 'américo brasileliense',
      'améico brasailiense', 'américo brasiliesne', 'amérco brasiliense',
      'améico brasiliense', 'américa brasiliense', 'américo bbrasiliense',
      'américo brasileisne', 'américo brasiiense', 'américo brasisliense',
      'américo brailiense', 'américo nrasiliense', 'américo brasilienmse',
      'américo brasilie4nse', 'a,érico brasiliense', 'aqmérico brasiliense',
      'am´rico brasiliense', 'américo brasiliemse', 'amperuci brasiliemse',
      'améruico brasiliense', 'aco. brasiliense', 'aco brasiliense', 'centro'],
    'Américo Brasiliense'
  ],
  [
    ['santa lucia', 'sanra lucia', 'santa luicia', 'santa lúcia'],
    'Santa Lúcia'
  ],
  [
    ['araraqura', 'araraquara-sp', 'araraquara - américo brasiliense'],
    'Araraquara'
  ],
  [
    ['são carlos'],
    'São Carlos'
  ],
  [
    ['rincão'],
    'Rincão'
  ],
  [
    ['guatapará'],
    'Guatapará'
  ],
  [
    ['motuca'],
    'Motuca'
  ],
  [
    ['dobrada'],
    'Dobrada'
  ],
  [
    ['matão'],
    'Matão'
  ],
  [
    ['vinhedo'],
    'Vinhedo'
  ],
  [
    ['bocaina'],
    'Bocaina'
  ],
  [
    ['boa esperança do sul'],
    'Boa Esperança do Sul'
  ],
  [
    ['alcinópolis - ms', 'alcinópolis'],
    'Alcinópolis'
  ]
];

const cityStateByName = new Map([
  ['Alcinópolis', 'MS'],
  ['Américo Brasiliense', 'SP'],
  ['Araraquara', 'SP'],
  ['Boa Esperança do Sul', 'SP'],
  ['Bocaina', 'SP'],
  ['Dobrada', 'SP'],
  ['Guatapará', 'SP'],
  ['Matão', 'SP'],
  ['Motuca', 'SP'],
  ['Rincão', 'SP'],
  ['Santa Lúcia', 'SP'],
  ['São Carlos', 'SP'],
  ['Vinhedo', 'SP']
]);

const cityNameMap = new Map<string, string>();
const cityNamePrefixes: [string, string][] = [];
for (const [aliases, corrected] of cityNameAliases) {
  for (const alias of aliases) {
    const key = alias.toLowerCase().normalize('NFC');
    cityNameMap.set(key, corrected);
    cityNamePrefixes.push([key, corrected]);
  }
}
cityNamePrefixes.sort((a, b) => b[0].length - a[0].length);

const normalizeCityName = (value: string | undefined): string => {
  const raw = nullable(value);
  if (!raw) return 'Américo Brasiliense';
  // Collapse multiple whitespace into single space, then lowercase + NFC normalize
  const lower = raw.replace(/\s+/g, ' ').toLowerCase().normalize('NFC');
  // 1. Exact match
  const exact = cityNameMap.get(lower);
  if (exact) return exact;
  // 2. Prefix match — city name followed by extra content in the same field
  for (const [prefix, corrected] of cityNamePrefixes) {
    if (lower.startsWith(prefix) && /[\s,\-]/.test(lower[prefix.length] ?? '')) return corrected;
  }
  // Return whitespace-collapsed value even if not matched
  return truncateText(raw.replace(/\s+/g, ' '), FIELD_LIMITS.ownerCity);
};

const stateForCity = (city: string): string => cityStateByName.get(city) ?? 'SP';

const legacyDocumentFragmentPattern = /\b(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\d{2,3}\.?\d{3}\.?\d{3}(?:[-.]?\d{0,2})?)\b/g;
const legacyEmailPattern = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g;
const legacyPhonePattern = /\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[\s.-]*\d{4}\b/g;
const legacyLargeSpacePattern = /\s{6,}/g;
const legacyAddressComplementHintPattern =
  /\b(?:ap|apto|apartamento|casa|fundos|frente|sala|bloco|quadra|lote|box|loja|sobrado|terreo|t[eé]rreo|galp[aã]o|barrac[aã]o|ch[aá]cara|s[ií]tio|fazenda|condom[ií]nio|edif[ií]cio|distrito|industrial|rodovia|km|alambique|engenho)\b/i;

const formatLegacyBrazilPhone = (digits: string): string => {
  if (digits.length < 10 || digits.length > 11) return digits;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const formattedNumber = number.length <= 8 ? `${number.slice(0, 4)}-${number.slice(4)}` : `${number.slice(0, 5)}-${number.slice(5)}`;

  return `(${areaCode}) ${formattedNumber}`;
};

const formatLegacyBrazilPhoneWithCountryCode = (digits: string): string => {
  const formatted = formatLegacyBrazilPhone(digits);
  return formatted === digits ? `+55${digits}` : `+55 ${formatted}`;
};

const normalizeLegacyPhoneValue = (value: string | undefined, kind: Exclude<OwnerContactKind, 'email'>): string | null => {
  const raw = value ?? '';
  const hasInternationalPrefix = /^\s*(?:\+|00)/.test(raw);
  const digits = raw.replace(/\D/g, '').replace(/^00/, '');
  if (!digits) return null;

  if (!digits.startsWith('55') && (hasInternationalPrefix || digits.length > 11)) return limitedPhoneValue(`+${digits}`);

  if (digits.startsWith('55') && digits.length !== 12 && digits.length !== 13) return limitedPhoneValue(`+${digits}`);

  const nationalDigits = digits.startsWith('55') ? digits.slice(2) : digits;
  const digitsWithAreaCode = nationalDigits.length === 8 || nationalDigits.length === 9 ? `16${nationalDigits}` : nationalDigits;
  const normalizedDigits = kind === 'mobile' && digitsWithAreaCode.length === 10 ? `${digitsWithAreaCode.slice(0, 2)}9${digitsWithAreaCode.slice(2)}` : digitsWithAreaCode;

  return limitedPhoneValue(formatLegacyBrazilPhoneWithCountryCode(normalizedDigits));
};

const normalizeLegacyEmailValue = (value: string | undefined): string | null => {
  const email = (value ?? '').trim().replace(/\s+/g, '').toLowerCase();
  return email.includes('@') && textLength(email) <= FIELD_LIMITS.ownerContactEmailValue ? email : null;
};

const pushLegacyContact = (contacts: LegacyOwnerContactInput[], contact: LegacyOwnerContactInput) => {
  const key = `${contact.kind}:${contact.label ?? ''}:${contact.value}`;
  if (!contacts.some((existing) => `${existing.kind}:${existing.label ?? ''}:${existing.value}` === key)) contacts.push(contact);
};

const isIgnoredLegacyNameNote = (value: string | undefined): boolean => {
  const normalized = normalizeText(value);
  return [
    'mae',
    'pai',
    'marido',
    'esposa',
    'filha',
    'filho',
    'namorada',
    'namorado',
    'vizinha',
    'vizinho',
    'tim',
    'vivo',
    'claro',
    'oi',
    'celular',
    'telefone'
  ].includes(normalized);
};

const cleanLegacyPersonName = (value: string | undefined): string | null => {
  const cleaned = (value ?? '')
    .replace(legacyEmailPattern, ' ')
    .replace(/\b(?:CPF|CNPJ|RG)\b\s*:?\s*/gi, ' ')
    .replace(/\b(?:tel|telefone|cel|celular)\b\s*:?\s*/gi, ' ')
    .replace(/\(([^)]*)\)/g, (_match, note: string) => (isIgnoredLegacyNameNote(note) ? ' ' : ` ${note} `))
    .replace(/\s*[-–—]\s*(?:namorad[ao]|m[ãa]e|pai|marido|esposa|filh[ao]|vizinh[ao])\b.*$/i, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/^[\s/,-]+|[\s/,-]+$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 1 || !/[A-Za-zÀ-ÿ]/.test(cleaned) || isIgnoredLegacyNameNote(cleaned) || /^ddd\b/i.test(cleaned)) return null;
  return truncateText(cleaned, FIELD_LIMITS.ownerName);
};

const getLegacyPhones = (value: string): LegacyOwnerContactInput[] => {
  const withoutCpf = value.replace(legacyDocumentFragmentPattern, ' ').replace(legacyEmailPattern, ' ');
  return [...withoutCpf.matchAll(legacyPhonePattern)]
    .map((match) => normalizeLegacyPhoneValue(match[0], 'mobile'))
    .filter((phone): phone is string => phone !== null)
    .map((value) => ({ kind: 'mobile', value }));
};

const getLegacyEmails = (value: string): LegacyOwnerContactInput[] => {
  return [...value.matchAll(legacyEmailPattern)]
    .map((match) => normalizeLegacyEmailValue(match[0]))
    .filter((email): email is string => email !== null)
    .map((value) => ({ kind: 'email', value }));
};

const pushLegacyAdditionalResponsible = (
  responsibles: LegacyAdditionalResponsibleInput[],
  ownerName: string,
  name: string,
  contacts: LegacyOwnerContactInput[]
) => {
  if (normalizeText(name) === normalizeText(ownerName)) return;

  const existing = responsibles.find((responsible) => normalizeText(responsible.name) === normalizeText(name));
  if (existing) {
    const existingContacts = new Set(existing.contacts.map((contact) => `${contact.kind}:${contact.value}`));
    for (const contact of contacts) {
      const key = `${contact.kind}:${contact.value}`;
      if (!existingContacts.has(key)) existing.contacts.push(contact);
    }
    return;
  }

  responsibles.push({ name, contacts });
};

const parseLegacyAdditionalResponsibleSegment = (segment: string): LegacyAdditionalResponsibleInput | null => {
  const contacts = [...getLegacyPhones(segment), ...getLegacyEmails(segment)];
  const name = cleanLegacyPersonName(segment.replace(legacyPhonePattern, ' ').replace(legacyEmailPattern, ' '));
  if (!name) return contacts.length > 0 ? { name: '', contacts } : null;

  return { name, contacts };
};

const parseLegacyAdditionalResponsibles = (value: string, ownerName: string): ParsedLegacyAdditionalResponsibles => {
  const ownerContacts: LegacyOwnerContactInput[] = [];
  const responsibles: LegacyAdditionalResponsibleInput[] = [];
  const cleanedValue = value.replace(legacyDocumentFragmentPattern, ' ').replace(/\b(?:CPF|CNPJ|RG)\b\s*:?\s*/gi, ' ');
  const parts = cleanedValue
    .split(/\s*\/\s*|\n+/g)
    .flatMap((part) => part.split(legacyLargeSpacePattern))
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const parsed = parseLegacyAdditionalResponsibleSegment(part);
    if (!parsed) continue;

    if (!parsed.name) {
      const previous = responsibles[responsibles.length - 1];
      if (previous) {
        const existingContacts = new Set(previous.contacts.map((contact) => `${contact.kind}:${contact.label ?? ''}:${contact.value}`));
        for (const contact of parsed.contacts) {
          const key = `${contact.kind}:${contact.label ?? ''}:${contact.value}`;
          if (!existingContacts.has(key)) previous.contacts.push(contact);
        }
      } else {
        for (const contact of parsed.contacts.filter((candidate) => candidate.kind === 'email')) {
          pushLegacyContact(ownerContacts, contact);
        }
      }
      continue;
    }

    pushLegacyAdditionalResponsible(responsibles, ownerName, parsed.name, parsed.contacts);
  }

  return { ownerContacts, additionalResponsibles: responsibles };
};

const parseLegacyOwnerName = (value: string | undefined): ParsedLegacyOwnerName => {
  const raw = (value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return { ownerName: null, ownerContacts: [], additionalResponsibles: [] };

  const parts = raw
    .split(new RegExp(`${legacyLargeSpacePattern.source}|\\n+`, 'g'))
    .map((part) => part.trim())
    .filter(Boolean);
  const ownerSegment = parts[0] ?? '';
  const ownerName = cleanLegacyPersonName(ownerSegment.replace(legacyPhonePattern, ' ').replace(legacyEmailPattern, ' '));
  if (!ownerName) return { ownerName: null, ownerContacts: [], additionalResponsibles: [] };

  const ownerContacts = getLegacyEmails(ownerSegment);
  const parsedAdditional = parseLegacyAdditionalResponsibles(parts.slice(1).join('\n'), ownerName);
  for (const contact of parsedAdditional.ownerContacts) pushLegacyContact(ownerContacts, contact);

  return {
    ownerName,
    ownerContacts,
    additionalResponsibles: parsedAdditional.additionalResponsibles
  };
};

const isLikelyLegacyAddressComplement = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (legacyAddressComplementHintPattern.test(trimmed)) return true;
  if (/^[A-ZÀ-Ÿ0-9 .-]{2,12}$/.test(trimmed) && !new RegExp(legacyPhonePattern.source, 'i').test(trimmed) && !new RegExp(legacyDocumentFragmentPattern.source, 'i').test(trimmed)) return true;

  return false;
};

const splitLegacyAddressOwnerText = (value: string | undefined): { addressText: string; ownerText: string } => {
  const raw = (value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return { addressText: '', ownerText: '' };

  const parts = raw
    .split(legacyLargeSpacePattern)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return { addressText: raw, ownerText: '' };

  const addressParts = [parts[0]];
  const ownerParts: string[] = [];
  for (const part of parts.slice(1)) {
    if (isLikelyLegacyAddressComplement(part)) addressParts.push(part);
    else ownerParts.push(part);
  }

  return {
    addressText: addressParts.join(' '),
    ownerText: ownerParts.join('\n')
  };
};

const parseLegacyAddress = (value: string | undefined, ownerName: string): ParsedLegacyAddress => {
  const splitAddress = splitLegacyAddressOwnerText(value);
  const parsedOwnerText = parseLegacyAdditionalResponsibles(splitAddress.ownerText, ownerName);
  const raw = splitAddress.addressText.replace(/\s+/g, ' ').trim();
  const ownerFields = {
    ownerContacts: parsedOwnerText.ownerContacts,
    additionalResponsibles: parsedOwnerText.additionalResponsibles
  };

  if (!raw) {
    return { street: null, streetNumber: null, addressComplement: null, ...ownerFields };
  }

  const splitByComma = raw.split(',');
  const streetPart = splitByComma[0]?.trim() ?? '';
  const remainderPart = splitByComma.slice(1).join(',').trim();

  const parseRemainder = (remainder: string): Pick<ParsedLegacyAddress, 'streetNumber' | 'addressComplement'> => {
    const cleaned = remainder.replace(/^[-\s,]+/, '').trim();
    if (!cleaned) return { streetNumber: null, addressComplement: null };

    const numberMatch = cleaned.match(/^((?:\d+[A-Za-z]?|\d+[A-Za-z]?\/\d+|s\/?n))\b\s*(.*)$/i);
    if (!numberMatch) {
      return { streetNumber: null, addressComplement: nullable(cleaned) };
    }

    const number = numberMatch[1].toUpperCase();
    const complement = numberMatch[2].replace(/^[-\s,]+/, '').trim();
    return {
      streetNumber: nullable(number),
      addressComplement: nullable(complement)
    };
  };

  if (streetPart) {
    const parsed = parseRemainder(remainderPart);
    return {
      street: nullable(streetPart),
      streetNumber: parsed.streetNumber,
      addressComplement: parsed.addressComplement,
      ...ownerFields
    };
  }

  const fallback = raw.match(/^(.*?)(?:\s+(\d+[A-Za-z]?|\d+[A-Za-z]?\/\d+|s\/?n))?(?:\s*[-,/]\s*(.*))?$/i);
  if (!fallback) {
    return { street: nullable(raw), streetNumber: null, addressComplement: null, ...ownerFields };
  }

  return {
    street: nullable(fallback[1]),
    streetNumber: nullable(fallback[2]?.toUpperCase()),
    addressComplement: nullable(fallback[3]),
    ...ownerFields
  };
};

const insertOwnerContactValue = (report: ImportReport, ownerId: number | bigint, kind: OwnerContactKind, value: string, sortOrder: number) => {
  const limitedValue = limitedContactValue(kind, value);
  if (!limitedValue) return;

  const result = insertOwnerContact.run({ ownerId, kind, label: '', value: limitedValue, sortOrder });
  if (result.changes > 0) report.ownerContactsCreated += 1;
  else report.ownerContactsReused += 1;
};

const insertContactFromSource = (report: ImportReport, ownerId: number | bigint, kind: OwnerContactKind, rawValue: string | undefined, sortOrder: number) => {
  const value = kind === 'email' ? normalizeLegacyEmailValue(rawValue) : normalizeLegacyPhoneValue(rawValue, kind);
  if (!value) return;

  insertOwnerContactValue(report, ownerId, kind, value, sortOrder);
};

const getAdditionalResponsibleSortOrder = (ownerId: number | bigint): number => {
  const key = String(ownerId);
  const sortOrder = ownerAdditionalResponsibleSortOrder.get(key) ?? 0;
  ownerAdditionalResponsibleSortOrder.set(key, sortOrder + 1);
  return sortOrder;
};

const insertAdditionalResponsiblesFromSource = (report: ImportReport, ownerId: number | bigint, responsibles: LegacyAdditionalResponsibleInput[]) => {
  for (const responsible of responsibles) {
    const cacheKey = `${ownerId}:${normalizeText(responsible.name)}`;
    let responsibleId = ownerAdditionalResponsiblesCache.get(cacheKey);

    if (!responsibleId) {
      const result = insertOwnerAdditionalResponsible.run({ ownerId, name: truncateText(responsible.name, FIELD_LIMITS.ownerAdditionalResponsibleName), avatarBytes: responsible.avatarBytes ?? null, sortOrder: getAdditionalResponsibleSortOrder(ownerId) });
      responsibleId = result.lastInsertRowid;
      ownerAdditionalResponsiblesCache.set(cacheKey, responsibleId);
      report.ownerAdditionalResponsiblesCreated += 1;
    } else {
      report.ownerAdditionalResponsiblesReused += 1;
    }

    for (const [contactIndex, contact] of responsible.contacts.entries()) {
      const limitedValue = limitedContactValue(contact.kind, contact.value);
      if (!limitedValue) continue;

      const label = contact.kind === 'other' ? truncateText(contact.label ?? '', FIELD_LIMITS.ownerContactLabel) : '';
      const result = insertOwnerAdditionalResponsibleContact.run({ responsibleId, kind: contact.kind, label, value: limitedValue, sortOrder: contactIndex });
      if (result.changes > 0) report.ownerAdditionalResponsibleContactsCreated += 1;
      else report.ownerAdditionalResponsibleContactsReused += 1;
    }
  }
};

const normalizeText = (value: string | undefined): string => {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
};

const includesAlias = (normalized: string, alias: string): boolean => {
  return normalized === alias || normalized.includes(` ${alias} `) || normalized.startsWith(`${alias} `) || normalized.endsWith(` ${alias}`);
};

const sourceCode = (row: CsvRow): string => row['Código']?.trim() ?? '';

const createImportReport = (rows: CsvRow[]): ImportReport => {
  const numericCodes = rows
    .map((row) => Number(sourceCode(row)))
    .filter((code) => Number.isInteger(code) && code > 0)
    .sort((first, second) => first - second);
  const codeSet = new Set(numericCodes);
  const firstCode = numericCodes[0] ?? null;
  const lastCode = numericCodes[numericCodes.length - 1] ?? null;
  const missingCodes: number[] = [];

  if (firstCode !== null && lastCode !== null) {
    for (let code = firstCode; code <= lastCode; code += 1) {
      if (!codeSet.has(code)) missingCodes.push(code);
    }
  }

  return {
    sourceRows: rows.length,
    sourceNumericCodes: numericCodes.length,
    sourceFirstCode: firstCode,
    sourceLastCode: lastCode,
    sourceCodeGapCount: missingCodes.length,
    sourceCodeGapSamples: missingCodes.slice(0, 20),
    skippedRows: [],
    ownersCreated: 0,
    ownersReused: 0,
    ownerContactsCreated: 0,
    ownerContactsReused: 0,
    ownerAdditionalResponsiblesCreated: 0,
    ownerAdditionalResponsiblesReused: 0,
    ownerAdditionalResponsibleContactsCreated: 0,
    ownerAdditionalResponsibleContactsReused: 0,
    petsCreated: 0,
    medicalRecordsCreated: 0,
    medicalRecordPeriodsDerived: 0,
    medicalRecordPeriodsWithDischarge: 0,
    medicalRecordPeriodsMissing: 0,
    rowsWithoutMedicalRecord: 0,
    vaccinationsCreated: 0,
    vaccinationsIgnoredForValidity: 0,
    vaccinationDatesDiscarded: 0,
    vaccinationDateDiscardSamples: [],
    duplicatePetCandidates: new Map()
  };
};

const skippedReason = (ownerName: string | null | undefined, petName: string | null): string => {
  if (!ownerName && !petName) return 'sem tutor e sem nome do animal';
  if (!ownerName) return 'sem tutor';
  return 'sem nome do animal';
};

const trackPetDuplicateCandidate = (report: ImportReport, row: CsvRow, ownerName: string, petName: string) => {
  const key = `${normalizeText(ownerName)}|${normalizeText(petName)}`;
  const candidate = report.duplicatePetCandidates.get(key) ?? { ownerName, petName, codes: [] };
  candidate.codes.push(sourceCode(row) || '?');
  report.duplicatePetCandidates.set(key, candidate);
};

const printImportReport = (report: ImportReport) => {
  const skippedByReason = report.skippedRows.reduce<Record<string, number>>((totals, row) => {
    totals[row.reason] = (totals[row.reason] ?? 0) + 1;
    return totals;
  }, {});
  const duplicateCandidates = [...report.duplicatePetCandidates.values()].filter((candidate) => candidate.codes.length > 1);
  const duplicateRows = duplicateCandidates.reduce((total, candidate) => total + candidate.codes.length, 0);

  console.log('\nResumo da importação:');
  console.log(`- Linhas de dados lidas do CSV: ${report.sourceRows}`);
  console.log(`- Códigos numéricos lidos: ${report.sourceNumericCodes}`);
  if (report.sourceFirstCode !== null && report.sourceLastCode !== null) {
    console.log(`- Faixa de códigos: ${report.sourceFirstCode} a ${report.sourceLastCode}`);
    console.log(`- Buracos na sequência de códigos: ${report.sourceCodeGapCount}${report.sourceCodeGapSamples.length > 0 ? ` (exemplos: ${report.sourceCodeGapSamples.join(', ')})` : ''}`);
  }
  console.log(`- Linhas importadas como pets: ${report.petsCreated}`);
  console.log(`- Linhas puladas: ${report.skippedRows.length}`);
  for (const [reason, total] of Object.entries(skippedByReason)) {
    console.log(`  - ${reason}: ${total}`);
  }
  for (const row of report.skippedRows.slice(0, 10)) {
    console.log(`  - pulada código ${row.code || '?'}: ${row.reason}`);
  }
  if (report.skippedRows.length > 10) console.log(`  - ... mais ${report.skippedRows.length - 10} linhas puladas`);
  console.log(`- Tutores criados: ${report.ownersCreated}`);
  console.log(`- Linhas que reaproveitaram tutor pelo mesmo nome: ${report.ownersReused}`);
  console.log(`- Contatos convertidos para owner_contacts: ${report.ownerContactsCreated}`);
  console.log(`- Contatos duplicados ignorados: ${report.ownerContactsReused}`);
  console.log(`- Responsáveis adicionais convertidos: ${report.ownerAdditionalResponsiblesCreated}`);
  console.log(`- Responsáveis adicionais duplicados ignorados: ${report.ownerAdditionalResponsiblesReused}`);
  console.log(`- Contatos de responsáveis adicionais convertidos: ${report.ownerAdditionalResponsibleContactsCreated}`);
  console.log(`- Contatos de responsáveis adicionais duplicados ignorados: ${report.ownerAdditionalResponsibleContactsReused}`);
  console.log('- Pets deduplicados/mesclados: 0 (o conversor cria um pet por linha válida)');
  console.log(`- Possíveis pets duplicados detectados por tutor + nome: ${duplicateCandidates.length} grupos, ${duplicateRows} linhas`);
  for (const candidate of duplicateCandidates.slice(0, 10)) {
    console.log(`  - ${candidate.petName} / ${candidate.ownerName}: códigos ${candidate.codes.join(', ')}`);
  }
  if (duplicateCandidates.length > 10) console.log(`  - ... mais ${duplicateCandidates.length - 10} grupos possíveis`);
  console.log(`- Prontuários importados: ${report.medicalRecordsCreated}`);
  console.log(`- Prontuários com entrada derivada do texto: ${report.medicalRecordPeriodsDerived}`);
  console.log(`- Prontuários com alta derivada do texto: ${report.medicalRecordPeriodsWithDischarge}`);
  console.log(`- Prontuários sem data identificada no texto: ${report.medicalRecordPeriodsMissing}`);
  console.log(`- Pets sem texto de prontuário: ${report.rowsWithoutMedicalRecord}`);
  console.log(`- Aplicações de vacina importadas: ${report.vaccinationsCreated}`);
  console.log(`- Aplicações anteriores iguais desmarcadas para vencimento: ${report.vaccinationsIgnoredForValidity}`);
  console.log(`- Datas de vacinação futuras descartadas: ${report.vaccinationDatesDiscarded}${report.vaccinationDateDiscardSamples.length > 0 ? ` (exemplos: ${report.vaccinationDateDiscardSamples.join(', ')})` : ''}`);
};

const countRows = (table: string): number => {
  return (db.prepare(`SELECT COUNT(*) AS total FROM ${table}`).get() as CountRow).total;
};

const printDatabaseReport = () => {
  const vaccinationsWithoutNormalizedName = (db.prepare("SELECT COUNT(*) AS total FROM pet_vaccinations WHERE vaccine_normalized_name IS NULL OR length(trim(vaccine_normalized_name)) = 0").get() as CountRow).total;
  const vaccinationsWithInvalidDose = (db.prepare(`SELECT COUNT(*) AS total FROM pet_vaccinations WHERE dose_type IS NULL OR length(trim(dose_type)) = 0 OR (dose_number IS NOT NULL AND (dose_number < 1 OR dose_number > ${FIELD_LIMITS.vaccineDoseNumber}))`).get() as CountRow).total;
  const vaccinationsWithInvalidValidity = (db.prepare("SELECT COUNT(*) AS total FROM pet_vaccinations WHERE validity_value <= 0 OR validity_unit NOT IN ('days', 'months')").get() as CountRow).total;
  const additionalResponsibleContacts = (db.prepare('SELECT COUNT(*) AS total FROM owner_contacts WHERE responsible_id IS NOT NULL').get() as CountRow).total;

  console.log('\nConferência do SQLite gerado:');
  console.log(`- owners: ${countRows('owners')}`);
  console.log(`- owner_contacts: ${countRows('owner_contacts')}`);
  console.log(`- owner_additional_responsibles: ${countRows('owner_additional_responsibles')}`);
  console.log(`- owner_contacts de responsáveis adicionais: ${additionalResponsibleContacts}`);
  console.log(`- pets: ${countRows('pets')}`);
  console.log(`- pet_owners: ${countRows('pet_owners')}`);
  console.log(`- medical_records: ${countRows('medical_records')}`);
  console.log(`- vaccines: ${countRows('vaccines')}`);
  console.log(`- vaccine_dose_types: ${countRows('vaccine_dose_types')}`);
  console.log(`- vaccine_validity_options: ${countRows('vaccine_validity_options')}`);
  console.log(`- pet_vaccinations: ${countRows('pet_vaccinations')}`);
  console.log(`- pet_vaccinations sem nome normalizado: ${vaccinationsWithoutNormalizedName}`);
  console.log(`- pet_vaccinations com dose inválida: ${vaccinationsWithInvalidDose}`);
  console.log(`- pet_vaccinations com validade inválida: ${vaccinationsWithInvalidValidity}`);
};

const isTruthy = (value: string | undefined) => {
  return ['1', 'true', 'verdadeiro', 'sim', 'x'].includes(value?.trim().toLowerCase() ?? '');
};

const getSex = (row: CsvRow): PetSex => {
  if (isTruthy(row['MACHO'])) return 'M';
  if (isTruthy(row['FEMEA'])) return 'F';
  return null;
};

const normalizeDate = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  const match = trimmed.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) return nullableWithLimit(value, FIELD_LIMITS.isoDate);

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 40 ? 1900 : 2000;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Legacy birth dates use American format MM/DD/YY (often with a trailing time component)
// or, occasionally, an ISO 8601 date. Returns null if the value cannot be parsed.
const normalizeLegacyBirthDate = (value: string | undefined): string | null => {
  const raw = value?.trim() ?? '';
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT].*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?$/);
  if (!slashMatch) return null;

  const month = Number(slashMatch[1]);
  const day = Number(slashMatch[2]);
  let year = Number(slashMatch[3]);
  if (year < 100) year += year >= 40 ? 1900 : 2000;

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  // Reject implausible future birth dates (likely misparsed entries).
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > currentDay.getTime()) return null;

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const isFutureDate = (value: string): boolean => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return true;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date.getTime() > currentDay.getTime();
};

const trackDiscardedVaccinationDate = (report: ImportReport, rawDate: string, appliedAt: string) => {
  report.vaccinationDatesDiscarded += 1;
  if (report.vaccinationDateDiscardSamples.length < 10) report.vaccinationDateDiscardSamples.push(`${rawDate.trim()} -> ${appliedAt}`);
};

const hasPositiveVaccinationSignal = (normalizedLine: string): boolean => {
  return /\b(?:vac|vacinad[ao]s?|revacinad[ao]s?|aplicad[ao]s?|imunizad[ao]s?)\b/.test(normalizedLine);
};

const hasNegativeVaccinationSignal = (normalizedLine: string): boolean => {
  return /\b(?:nao|sem)\s+(?:esta\s+|estava\s+|foi\s+)?vacinad[ao]?\b/.test(normalizedLine) || /\bsem\s+as\s+vacinas\b/.test(normalizedLine) || /\bvacina(?:cao)?\s+atrasad[ao]\b/.test(normalizedLine);
};

const getDatedRecordBlocks = (description: string, report: ImportReport): DatedRecordBlock[] => {
  const matches = [...description.matchAll(dateHeaderPattern)];
  const blocks: DatedRecordBlock[] = [];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const appliedAt = normalizeDate(match[2]);
    if (!appliedAt || match.index === undefined) continue;
    if (isFutureDate(appliedAt)) {
      trackDiscardedVaccinationDate(report, match[2], appliedAt);
      continue;
    }

    const nextMatch = matches[index + 1];
    const blockStart = match.index + match[0].length;
    const blockEnd = nextMatch?.index ?? description.length;
    blocks.push({ appliedAt, text: description.slice(blockStart, blockEnd) });
  }

  return blocks;
};

const getMedicalRecordPeriod = (description: string): { admittedAt: string | null; dischargedAt: string | null } => {
  const dates = [...description.matchAll(dateHeaderPattern)]
    .map((match) => normalizeDate(match[2]))
    .filter((date): date is string => date !== null && !isFutureDate(date))
    .sort((first, second) => first.localeCompare(second));

  return {
    admittedAt: dates[0] ?? null,
    dischargedAt: dates.length > 1 ? dates[dates.length - 1] : null
  };
};

const findVaccineMatches = (normalizedLine: string): VaccineMatch[] => {
  const matches: VaccineMatch[] = [];
  for (const matcher of vaccineMatchers) {
    const match = normalizedLine.match(matcher.pattern);
    if (match?.index !== undefined) matches.push({ name: matcher.name, index: match.index });
  }
  return matches.sort((first, second) => first.index - second.index);
};

const findDoseSignals = (normalizedLine: string): DoseSignal[] => {
  const signals: DoseSignal[] = [];
  for (const matcher of numberedDoseMatchers) {
    const match = normalizedLine.match(matcher.pattern);
    if (match?.index !== undefined) signals.push({ label: matcher.label, sortOrder: matcher.sortOrder, index: match.index, kind: 'numbered' });
  }
  const boosterMatch = normalizedLine.match(/\b(?:reforco|revacinad[ao]?)\b/);
  if (boosterMatch?.index !== undefined) signals.push({ label: boosterDoseLabel, sortOrder: 99, index: boosterMatch.index, kind: 'booster' });
  return signals.sort((first, second) => first.index - second.index);
};

const doseLabelForVaccine = (normalizedLine: string, vaccineMatch: VaccineMatch, vaccineMatches: VaccineMatch[]): string => {
  if (boosterOnlyVaccines.has(vaccineMatch.name)) return boosterDoseLabel;

  const signals = findDoseSignals(normalizedLine);
  if (signals.length === 0) return boosterDoseLabel;

  const vaccineIndex = vaccineMatches.findIndex((match) => match.name === vaccineMatch.name && match.index === vaccineMatch.index);
  const previousVaccine = vaccineMatches[vaccineIndex - 1];
  const nextVaccine = vaccineMatches[vaccineIndex + 1];
  const segmentStart = previousVaccine ? Math.floor((previousVaccine.index + vaccineMatch.index) / 2) : 0;
  const segmentEnd = nextVaccine ? Math.floor((vaccineMatch.index + nextVaccine.index) / 2) : normalizedLine.length;
  const segmentSignals = signals.filter((signal) => signal.index >= segmentStart && signal.index < segmentEnd);

  const numberedDose = segmentSignals.find((signal) => signal.kind === 'numbered');
  if (numberedDose) return numberedDose.label;

  const boosterDose = segmentSignals.find((signal) => signal.kind === 'booster');
  return boosterDose?.label ?? boosterDoseLabel;
};

const doseModel = (doseLabel: string): { doseType: string; doseNumber: number | null } => {
  const numberedDose = numberedDoseMatchers.find((matcher) => matcher.label === doseLabel);
  if (!numberedDose) return { doseType: boosterDoseTypeLabel, doseNumber: null };
  return { doseType: initialDoseTypeLabel, doseNumber: numberedDose.sortOrder + 1 };
};

const doseValidity = (doseLabel: string, options: { v10ThreeDoseFinal?: boolean } = {}): { validityValue: number; validityUnit: VaccineValidityUnit } => {
  const dose = doseModel(doseLabel);
  if (dose.doseNumber === null) return { validityValue: 12, validityUnit: 'months' };
  if (dose.doseNumber === 1 || dose.doseNumber === 2) return { validityValue: 21, validityUnit: 'days' };
  if (dose.doseNumber === 3 && !options.v10ThreeDoseFinal) return { validityValue: 21, validityUnit: 'days' };
  return { validityValue: 12, validityUnit: 'months' };
};

const extractVaccinationsFromLine = (line: string): Omit<ExtractedVaccination, 'appliedAt'>[] => {
  const normalizedLine = normalizeText(line);
  if (!hasPositiveVaccinationSignal(normalizedLine) || hasNegativeVaccinationSignal(normalizedLine)) return [];

  const vaccineMatches = findVaccineMatches(normalizedLine);
  return vaccineMatches.map((match) => ({ vaccine: match.name, doseLabel: doseLabelForVaccine(normalizedLine, match, vaccineMatches) }));
};

const extractVaccinationsFromRecord = (description: string, report: ImportReport): ExtractedVaccination[] => {
  const extracted: ExtractedVaccination[] = [];

  for (const block of getDatedRecordBlocks(description, report)) {
    const seen = new Set<string>();

    for (const line of block.text.split(/\r?\n/)) {
      for (const vaccination of extractVaccinationsFromLine(line)) {
        const key = `${vaccination.vaccine}:${vaccination.doseLabel}`;
        if (seen.has(key)) continue;
        extracted.push({ appliedAt: block.appliedAt, vaccine: vaccination.vaccine, doseLabel: vaccination.doseLabel });
        seen.add(key);
      }
    }
  }

  return extracted;
};

const detectSpecies = (rawBreed: string | undefined): PetSpecies => {
  const normalized = normalizeText(rawBreed);
  const padded = ` ${normalized} `;
  const hasFelineMarker = ['felina', 'felino', 'felin', 'gato', 'gata'].some((alias) => includesAlias(padded, alias));
  const hasFelineBreed = felineBreedAliases.filter((breedAlias) => breedAlias.id !== 'feline-mixed-breed').some((breedAlias) => breedAlias.aliases.some((alias) => includesAlias(padded, alias)));
  if (hasFelineMarker || hasFelineBreed)
    return 'feline';

  return 'canine';
};

const cleanBreedText = (rawBreed: string | undefined): string => {
  return (rawBreed ?? '')
    .replace(/\bFELIN[AO]?\b/gi, ' ')
    .replace(/\bGAT[AO]\b/gi, ' ')
    .replace(/[().]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const resolveBreed = (species: PetSpecies, rawBreed: string | undefined): string => {
  const normalized = normalizeText(cleanBreedText(rawBreed));
  const matched = breedAliases[species].find((breedAlias) => breedAlias.aliases.some((alias) => includesAlias(` ${normalized} `, alias)));
  return matched?.id ?? (species === 'feline' ? 'feline-mixed-breed' : 'mixed-breed');
};

const getTaxonomy = (row: CsvRow): PetTaxonomy => {
  const rawBreed = row['RAÇA'];
  const species = detectSpecies(rawBreed);
  return { species, breed: resolveBreed(species, rawBreed) };
};

const isAtLeastAsRecentVaccination = (candidate: ImportedVaccinationReference, current: ImportedVaccinationReference): boolean => {
  if (candidate.appliedAt !== current.appliedAt) return candidate.appliedAt > current.appliedAt;
  return candidate.id > current.id;
};

const ignoreVaccinationValidity = (report: ImportReport, id: number) => {
  const result = markVaccinationValidityIgnored.run({ id });
  report.vaccinationsIgnoredForValidity += result.changes;
};

const processarMigracao = () => {
  const csvFilePath = path.resolve(projectDir, 'dist/clinica-veterinaria-last.csv');

  const rows = parse(fs.readFileSync(csvFilePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRow[];
  const report = createImportReport(rows);

  const migrateRows = db.transaction((records: CsvRow[]) => {
    console.log('Iniciando processamento...');
    const latestVaccinationByPetAndVaccine = new Map<string, ImportedVaccinationReference>();

    for (const row of records) {
      const parsedOwnerName = parseLegacyOwnerName(row['NOME PROPRIETÁRIO']);
      const ownerName = parsedOwnerName.ownerName;
      const petName = nullableWithLimit(row['NOME DO ANIMAL'], FIELD_LIMITS.petName);

      if (!ownerName || !petName) {
        report.skippedRows.push({
          code: sourceCode(row),
          petName: row['NOME DO ANIMAL']?.trim() ?? '',
          ownerName: ownerName ?? '',
          reason: skippedReason(ownerName, petName)
        });
        continue;
      }

      trackPetDuplicateCandidate(report, row, ownerName, petName);

      const parsedAddress = parseLegacyAddress(row['ENDEREÇO'], ownerName);
      let ownerId: number | bigint;

      if (ownersCache.has(ownerName)) {
        ownerId = ownersCache.get(ownerName)!;
        report.ownersReused += 1;
      } else {
        const city = normalizeCityName(row['CIDADE']);
        const res = insertOwner.run({
          name: ownerName,
          street: nullableWithLimit(parsedAddress.street, FIELD_LIMITS.ownerStreet),
          streetNumber: nullableWithLimit(parsedAddress.streetNumber, FIELD_LIMITS.ownerStreetNumber),
          addressComplement: nullableWithLimit(parsedAddress.addressComplement, FIELD_LIMITS.ownerAddressComplement),
          neighborhood: nullableWithLimit(row['BAIRRO'], FIELD_LIMITS.ownerNeighborhood),
          city,
          state: nullableWithLimit(stateForCity(city), FIELD_LIMITS.ownerState),
          country: 'BRA',
          postalCode: nullableWithLimit(row['CEP'], FIELD_LIMITS.ownerPostalCode),
          additionalInformation: null
        });
        ownerId = res.lastInsertRowid;
        ownersCache.set(ownerName, ownerId);
        report.ownersCreated += 1;
      }

      insertContactFromSource(report, ownerId, 'phone', row['TELEFONE'], 0);
      insertContactFromSource(report, ownerId, 'mobile', row['CELULAR'], 1);
      for (const [contactIndex, contact] of parsedOwnerName.ownerContacts.entries()) {
        insertOwnerContactValue(report, ownerId, contact.kind, contact.value, contactIndex + 2);
      }
      for (const [contactIndex, contact] of parsedAddress.ownerContacts.entries()) {
        insertOwnerContactValue(report, ownerId, contact.kind, contact.value, contactIndex + parsedOwnerName.ownerContacts.length + 2);
      }
      insertAdditionalResponsiblesFromSource(report, ownerId, parsedOwnerName.additionalResponsibles);
      insertAdditionalResponsiblesFromSource(report, ownerId, parsedAddress.additionalResponsibles);

      const sex = getSex(row);
      const taxonomy = getTaxonomy(row);

      const petRes = insertPet.run({
        name: petName,
        birthDate: normalizeLegacyBirthDate(row['DATA NASCIMENTO']),
        species: taxonomy.species,
        breed: taxonomy.breed,
        sex
      });
      insertPetOwner.run({ petId: petRes.lastInsertRowid, ownerId, sortOrder: 0 });
      report.petsCreated += 1;

      const fullDescription = nullable(row['PRONTUÁRIO']);
      if (fullDescription) {
        const description = nullableWithLimit(fullDescription, FIELD_LIMITS.medicalRecordDescription);
        const period = getMedicalRecordPeriod(fullDescription);
        insertMedicalRecord.run({
          petId: petRes.lastInsertRowid,
          description,
          admittedAt: period.admittedAt,
          dischargedAt: period.dischargedAt
        });
        report.medicalRecordsCreated += 1;
        if (period.admittedAt) report.medicalRecordPeriodsDerived += 1;
        else report.medicalRecordPeriodsMissing += 1;
        if (period.dischargedAt) report.medicalRecordPeriodsWithDischarge += 1;

        const extractedVaccinations = extractVaccinationsFromRecord(fullDescription, report);
        const v10HasFourthDose = extractedVaccinations.some((v) => v.vaccine === 'V 10' && v.doseLabel === '4ª dose');
        const v10HasThirdDose = extractedVaccinations.some((v) => v.vaccine === 'V 10' && v.doseLabel === '3ª dose');
        const v10ThreeDoseFinal = !v10HasFourthDose && v10HasThirdDose;

        for (const vaccination of extractedVaccinations) {
          const vaccineNormalizedName = ensureVaccineName(vaccination.vaccine);
          const dose = doseModel(vaccination.doseLabel);
          const validity = doseValidity(vaccination.doseLabel, { v10ThreeDoseFinal: vaccination.vaccine === 'V 10' && v10ThreeDoseFinal });

          const vaccinationRes = insertPetVaccination.run({
            petId: petRes.lastInsertRowid,
            appliedAt: vaccination.appliedAt,
            vaccineName: vaccination.vaccine,
            vaccineNormalizedName,
            doseType: dose.doseType,
            doseNumber: dose.doseNumber,
            validityValue: validity.validityValue,
            validityUnit: validity.validityUnit,
            observation: null
          });
          report.vaccinationsCreated += 1;
          const vaccinationReference = { id: Number(vaccinationRes.lastInsertRowid), appliedAt: vaccination.appliedAt };
          const vaccineKey = `${petRes.lastInsertRowid}:${vaccineNormalizedName}`;
          const currentLatest = latestVaccinationByPetAndVaccine.get(vaccineKey);

          if (!currentLatest || isAtLeastAsRecentVaccination(vaccinationReference, currentLatest)) {
            if (currentLatest) ignoreVaccinationValidity(report, currentLatest.id);
            latestVaccinationByPetAndVaccine.set(vaccineKey, vaccinationReference);
          } else {
            ignoreVaccinationValidity(report, vaccinationReference.id);
          }
        }
      } else {
        report.rowsWithoutMedicalRecord += 1;
      }
    }
  });

  try {
    migrateRows(rows);
    printImportReport(report);
    printDatabaseReport();
    console.log('Migração concluída com sucesso!');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Erro durante a migração:', message);
    process.exitCode = 1;
  }
};

processarMigracao();