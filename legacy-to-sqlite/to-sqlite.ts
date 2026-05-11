import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import Database from 'better-sqlite3';

type CsvRow = Record<string, string | undefined>;
type OwnerContactKind = 'phone' | 'mobile';
type PetSex = 'M' | 'F' | null;
type PetSpecies = 'canine' | 'feline';

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
}

interface VaccinePresetIdRow {
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

db.exec(`
  DROP TABLE IF EXISTS pet_vaccinations;
  DROP TABLE IF EXISTS vaccine_presets;
  DROP TABLE IF EXISTS backup_history;
  DROP TABLE IF EXISTS app_settings;
  DROP TABLE IF EXISTS medical_records;
  DROP TABLE IF EXISTS pets;
  DROP TABLE IF EXISTS owner_contacts;
  DROP TABLE IF EXISTS owners;

  CREATE TABLE IF NOT EXISTS owners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
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
  );

  CREATE TABLE IF NOT EXISTS owner_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile')),
    value TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,
    FOREIGN KEY (owner_id) REFERENCES owners (id) ON DELETE CASCADE,
    UNIQUE(owner_id, kind, value)
  );

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
    FOREIGN KEY (owner_id) REFERENCES owners (id) ON DELETE CASCADE
  );

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
    FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
    CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS backup_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vaccine_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    validity_months INTEGER NOT NULL DEFAULT 12 CHECK(validity_months > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS pet_vaccinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pet_id INTEGER NOT NULL,
    applied_at TEXT NOT NULL,
    vaccine_preset_id INTEGER NOT NULL,
    vaccine_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validity_ignored_at TEXT,
    updated_at TEXT,
    deleted_at TEXT,
    purge_after TEXT,
    FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
    FOREIGN KEY (vaccine_preset_id) REFERENCES vaccine_presets (id) ON DELETE RESTRICT
  );

  CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_owner_id ON owner_contacts(owner_id);
  CREATE INDEX IF NOT EXISTS idx_owner_contacts_value ON owner_contacts(value);
  CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);
  CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);
  CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
  CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);
  CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);
  CREATE INDEX IF NOT EXISTS idx_medical_records_deleted_at ON medical_records(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_vaccine_presets_normalized_name ON vaccine_presets(normalized_name);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_pet_id ON pet_vaccinations(pet_id);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_vaccine_preset_id ON pet_vaccinations(vaccine_preset_id);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_applied_at ON pet_vaccinations(applied_at);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_validity_ignored_at ON pet_vaccinations(validity_ignored_at);
  CREATE INDEX IF NOT EXISTS idx_pet_vaccinations_deleted_at ON pet_vaccinations(deleted_at);
`);

const insertOwner = db.prepare(`
  INSERT INTO owners (name, street, street_number, address_complement, neighborhood, city, country, postal_code)
  VALUES (@name, @street, @streetNumber, @addressComplement, @neighborhood, @city, @country, @postalCode)
`);

const insertOwnerContact = db.prepare(`
  INSERT OR IGNORE INTO owner_contacts (owner_id, kind, value, sort_order, updated_at)
  VALUES (@ownerId, @kind, @value, @sortOrder, CURRENT_TIMESTAMP)
`);

const insertPet = db.prepare(`
  INSERT INTO pets (owner_id, name, birth_date, species, breed, sex)
  VALUES (@ownerId, @name, @birthDate, @species, @breed, @sex)
`);

const insertMedicalRecord = db.prepare(`
  INSERT INTO medical_records (pet_id, description, admitted_at, discharged_at, updated_at)
  VALUES (@petId, @description, @admittedAt, @dischargedAt, CURRENT_TIMESTAMP)
`);

const insertVaccinePreset = db.prepare(`
  INSERT OR IGNORE INTO vaccine_presets (name, normalized_name, validity_months, updated_at)
  VALUES (@name, @normalizedName, @validityMonths, CURRENT_TIMESTAMP)
`);

const insertPetVaccination = db.prepare(`
  INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_preset_id, vaccine_name, updated_at)
  VALUES (@petId, @appliedAt, @vaccinePresetId, @vaccineName, CURRENT_TIMESTAMP)
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
].map((preset) => ({ ...preset, normalizedName: normalizeVaccineName(preset.name) }));

for (const preset of defaultVaccinePresets) {
  insertVaccinePreset.run(preset);
}

const vaccinePresetIds = new Map(
  (db.prepare('SELECT id, normalized_name FROM vaccine_presets').all() as VaccinePresetIdRow[]).map((preset) => [normalizeVaccineName(preset.normalized_name), preset.id])
);

const ownersCache = new Map<string, number | bigint>();

const canineBreedAliases: BreedAlias[] = [
  { id: 'mixed-breed', aliases: ['srd', 's r d', 'sem raca definida', 'vira lata', 'viralata'] },
  { id: 'shih-tzu', aliases: ['shih tzu', 'shihtzu', 'shih'] },
  { id: 'poodle', aliases: ['poodle'] },
  { id: 'pinscher', aliases: ['pinscher', 'pinsher'] },
  { id: 'pit-bull', aliases: ['pit bull', 'pitbull'] },
  { id: 'lhasa-apso', aliases: ['lhasa apso', 'lhasa'] },
  { id: 'dachshund', aliases: ['teckel', 'dachshund'] },
  { id: 'rottweiler', aliases: ['rottweiler', 'rott weiler'] },
  { id: 'labrador-retriever', aliases: ['labrador'] },
  { id: 'yorkshire-terrier', aliases: ['yorkshire', 'york shire'] },
  { id: 'german-shepherd', aliases: ['pastor alemao'] },
  { id: 'chow-chow', aliases: ['chow chow'] },
  { id: 'pug', aliases: ['pug'] },
  { id: 'maltese', aliases: ['maltes'] },
  { id: 'border-collie', aliases: ['border collie'] },
  { id: 'golden-retriever', aliases: ['golden'] },
  { id: 'australian-cattle-dog', aliases: ['blue heeler', 'boiadeiro australiano'] },
  { id: 'boxer', aliases: ['boxer'] },
  { id: 'brazilian-terrier', aliases: ['terrier brasileiro', 'fox paulistinha'] },
  { id: 'cocker-spaniel', aliases: ['cocker'] },
  { id: 'german-spitz', aliases: ['spitz', 'sptiz'] },
  { id: 'pekingese', aliases: ['pequines', 'pequenes'] },
  { id: 'fila-brasileiro', aliases: ['fila brasileiro', 'fila'] },
  { id: 'american-bully', aliases: ['american bully'] },
  { id: 'french-bulldog', aliases: ['bulldog frances'] },
  { id: 'american-foxhound', aliases: ['fox hound americano', 'foxhound americano'] },
  { id: 'siberian-husky', aliases: ['husky siberiano', 'husk siberiano'] },
  { id: 'shar-pei', aliases: ['sharpei', 'shar pei'] },
  { id: 'beagle', aliases: ['beagle'] },
  { id: 'dalmatian', aliases: ['dalmata'] },
  { id: 'schnauzer', aliases: ['schnauzer'] },
  { id: 'belgian-shepherd', aliases: ['pastor belga'] },
  { id: 'english-bulldog', aliases: ['bulldog ingles'] }
];

const felineBreedAliases: BreedAlias[] = [
  { id: 'siamese', aliases: ['siames'] },
  { id: 'persian', aliases: ['persa'] },
  { id: 'feline-mixed-breed', aliases: ['srd', 's r d', 'sem raca definida', 'felina', 'felino', 'gato', 'gata'] }
];

const breedAliases: Record<PetSpecies, BreedAlias[]> = {
  canine: canineBreedAliases,
  feline: felineBreedAliases
};

const vaccineMatchers: VaccineMatcher[] = [
  { name: 'V 10', pattern: /\b(?:v\s*10|v10)\b/ },
  { name: 'V 8', pattern: /\b(?:v\s*8|v8)\b/ },
  { name: 'Antirrábica', pattern: /\banti\s*r*abic[ao]?\b|\braiva\b/ },
  { name: 'Recombitek', pattern: /\brecombitek\b/ },
  { name: 'Quadrupla', pattern: /\bquadrupla\b/ },
  { name: 'Quíntupla', pattern: /\bquintupla\b/ },
  { name: 'Giardia', pattern: /\bgiardia\b/ },
  { name: 'Gripe', pattern: /\bgripe\b/ },
  { name: 'Nobivac', pattern: /\bnobivac\b/ },
  { name: 'Imunocan', pattern: /\bimunocan\b/ }
];

const dateHeaderPattern = /(^|\n)\s*(\d{1,2}\s*\/\s*\d{1,2}\s*\/\s*(?:\d{2}|\d{4}))\s*:/g;

const nullable = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const parseLegacyAddress = (value: string | undefined): ParsedLegacyAddress => {
  const raw = (value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return { street: null, streetNumber: null, addressComplement: null };
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
      addressComplement: parsed.addressComplement
    };
  }

  const fallback = raw.match(/^(.*?)(?:\s+(\d+[A-Za-z]?|\d+[A-Za-z]?\/\d+|s\/?n))?(?:\s*[-,/]\s*(.*))?$/i);
  if (!fallback) {
    return { street: nullable(raw), streetNumber: null, addressComplement: null };
  }

  return {
    street: nullable(fallback[1]),
    streetNumber: nullable(fallback[2]?.toUpperCase()),
    addressComplement: nullable(fallback[3])
  };
};

const insertContactFromSource = (report: ImportReport, ownerId: number | bigint, kind: OwnerContactKind, rawValue: string | undefined, sortOrder: number) => {
  const value = nullable(rawValue);
  if (!value) return;

  const result = insertOwnerContact.run({ ownerId, kind, value, sortOrder });
  if (result.changes > 0) report.ownerContactsCreated += 1;
  else report.ownerContactsReused += 1;
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

const skippedReason = (ownerName: string | undefined, petName: string | null): string => {
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
  console.log(`- Telefones convertidos para owner_contacts: ${report.ownerContactsCreated}`);
  console.log(`- Telefones duplicados ignorados: ${report.ownerContactsReused}`);
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
  const vaccinationsWithoutPreset = (db.prepare('SELECT COUNT(*) AS total FROM pet_vaccinations WHERE vaccine_preset_id IS NULL').get() as CountRow).total;

  console.log('\nConferência do SQLite gerado:');
  console.log(`- owners: ${countRows('owners')}`);
  console.log(`- owner_contacts: ${countRows('owner_contacts')}`);
  console.log(`- pets: ${countRows('pets')}`);
  console.log(`- medical_records: ${countRows('medical_records')}`);
  console.log(`- vaccine_presets: ${countRows('vaccine_presets')}`);
  console.log(`- pet_vaccinations: ${countRows('pet_vaccinations')}`);
  console.log(`- pet_vaccinations sem preset: ${vaccinationsWithoutPreset}`);
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
  if (!match) return nullable(value);

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += year >= 40 ? 1900 : 2000;

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

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

const extractVaccinesFromLine = (line: string): string[] => {
  const normalizedLine = normalizeText(line);
  if (!hasPositiveVaccinationSignal(normalizedLine) || hasNegativeVaccinationSignal(normalizedLine)) return [];

  const vaccines: string[] = [];
  for (const matcher of vaccineMatchers) {
    if (matcher.pattern.test(normalizedLine)) vaccines.push(matcher.name);
  }

  return vaccines;
};

const extractVaccinationsFromRecord = (description: string, report: ImportReport): ExtractedVaccination[] => {
  const extracted: ExtractedVaccination[] = [];

  for (const block of getDatedRecordBlocks(description, report)) {
    const seen = new Set<string>();

    for (const line of block.text.split(/\r?\n/)) {
      for (const vaccine of extractVaccinesFromLine(line)) {
        if (seen.has(vaccine)) continue;
        extracted.push({ appliedAt: block.appliedAt, vaccine });
        seen.add(vaccine);
      }
    }
  }

  return extracted;
};

const detectSpecies = (rawBreed: string | undefined): PetSpecies => {
  const normalized = normalizeText(rawBreed);
  if (['felina', 'felino', 'felin', 'gato', 'gata', 'siames', 'persa'].some((alias) => normalized.includes(alias))) return 'feline';

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
  const csvFilePath = path.resolve(projectDir, 'dist/old-clinic.csv');

  const rows = parse(fs.readFileSync(csvFilePath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CsvRow[];
  const report = createImportReport(rows);

  const migrateRows = db.transaction((records: CsvRow[]) => {
    console.log('Iniciando processamento...');
    const latestVaccinationByPetAndPreset = new Map<string, ImportedVaccinationReference>();

    for (const row of records) {
      const ownerName = row['NOME PROPRIETÁRIO']?.trim();
      const petName = nullable(row['NOME DO ANIMAL']);

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

      let ownerId: number | bigint;

      if (ownersCache.has(ownerName)) {
        ownerId = ownersCache.get(ownerName)!;
        report.ownersReused += 1;
      } else {
        const parsedAddress = parseLegacyAddress(row['ENDEREÇO']);
        const res = insertOwner.run({
          name: ownerName,
          street: parsedAddress.street,
          streetNumber: parsedAddress.streetNumber,
          addressComplement: parsedAddress.addressComplement,
          neighborhood: nullable(row['BAIRRO']),
          city: nullable(row['CIDADE']),
          country: 'Brazil',
          postalCode: nullable(row['CEP'])
        });
        ownerId = res.lastInsertRowid;
        ownersCache.set(ownerName, ownerId);
        report.ownersCreated += 1;
      }

      insertContactFromSource(report, ownerId, 'phone', row['TELEFONE'], 0);
      insertContactFromSource(report, ownerId, 'mobile', row['CELULAR'], 1);

      const sex = getSex(row);
      const taxonomy = getTaxonomy(row);

      const petRes = insertPet.run({
        ownerId,
        name: petName,
        birthDate: normalizeDate(row['DATA NASCIMENTO']),
        species: taxonomy.species,
        breed: taxonomy.breed,
        sex
      });
      report.petsCreated += 1;

      const description = nullable(row['PRONTUÁRIO']);
      if (description) {
        const period = getMedicalRecordPeriod(description);
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

        for (const vaccination of extractVaccinationsFromRecord(description, report)) {
          const vaccinePresetId = vaccinePresetIds.get(normalizeVaccineName(vaccination.vaccine));
          if (!vaccinePresetId) throw new Error(`Preset de vacina não encontrado: ${vaccination.vaccine}`);

          const vaccinationRes = insertPetVaccination.run({
            petId: petRes.lastInsertRowid,
            appliedAt: vaccination.appliedAt,
            vaccinePresetId,
            vaccineName: vaccination.vaccine
          });
          report.vaccinationsCreated += 1;

          const vaccinationReference = { id: Number(vaccinationRes.lastInsertRowid), appliedAt: vaccination.appliedAt };
          const vaccineKey = `${petRes.lastInsertRowid}:${vaccinePresetId}`;
          const currentLatest = latestVaccinationByPetAndPreset.get(vaccineKey);

          if (!currentLatest || isAtLeastAsRecentVaccination(vaccinationReference, currentLatest)) {
            if (currentLatest) ignoreVaccinationValidity(report, currentLatest.id);
            latestVaccinationByPetAndPreset.set(vaccineKey, vaccinationReference);
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