import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

interface CliOptions {
  source?: string;
  base?: string;
  output?: string;
  changedSince?: string;
  help: boolean;
}

interface TableInfoRow {
  name: string;
}

interface CountRow {
  total: number;
}

interface MaxIdRow {
  max_id: number | null;
}

interface TimestampRow {
  timestamp: string | null;
}

interface IntegrityCheckRow {
  integrity_check: string;
}

interface ForeignKeyCheckRow {
  table: string;
  rowid: number;
  parent: string;
}

interface LegacyOwnerRow {
  id: number;
  name: string;
  avatar_blob: Buffer | null;
  street: string | null;
  street_number: string | null;
  address_complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code: string | null;
  additional_information: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  purge_after: string | null;
}

interface LegacyContactRow {
  id: number;
  owner_id: number;
  kind: string;
  label: string;
  value: string;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

interface LegacyResponsibleRow {
  id: number;
  owner_id: number;
  name: string;
  avatar_blob: Buffer | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

interface LegacyResponsibleContactRow {
  id: number;
  responsible_id: number;
  kind: string;
  label: string;
  value: string;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

interface LegacyPetRow {
  id: number;
  name: string;
  birth_date: string | null;
  species: string | null;
  breed: string | null;
  sex: string | null;
  avatar_blob: Buffer | null;
  updated_at: string | null;
  deleted_at: string | null;
  purge_after: string | null;
}

interface CurrentPetRow {
  birth_date: string | null;
}

interface LegacyPetOwnerRow {
  id: number;
  pet_id: number;
  owner_id: number;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
}

interface LegacyMedicalRecordRow {
  id: number;
  pet_id: number;
  title: string | null;
  description: string | null;
  admitted_at: string | null;
  discharged_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  purge_after: string | null;
}

interface LegacyVaccinationRow {
  id: number;
  pet_id: number;
  applied_at: string;
  vaccine_name: string;
  vaccine_dose_label: string;
  created_at: string;
  validity_ignored_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  purge_after: string | null;
  validity_value: number;
  validity_unit: string;
  species: string | null;
}

interface IdRow {
  id: number;
}

interface ExistingVaccinationRow {
  id: number;
}

interface ConsolidationReport {
  ownersInserted: number;
  ownersUpdated: number;
  ownerContactsInserted: number;
  responsiblesInserted: number;
  responsibleContactsInserted: number;
  petsInserted: number;
  petsUpdated: number;
  petOwnerSetsReplaced: number;
  medicalRecordsInserted: number;
  medicalRecordsUpdated: number;
  vaccinationsInserted: number;
  vaccinationsReused: number;
  vaccinationStatesUpdated: number;
  warnings: string[];
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, 'dist');
const buildDir = path.resolve(scriptDir, 'build');
const defaultBasePath = path.resolve(buildDir, 'veterinary_clinic.db');
const defaultOutputPath = path.resolve(buildDir, 'veterinary_clinic.consolidated.db');

const legacySchema = {
  owners: ['id', 'name', 'avatar_blob', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
  owner_contacts: ['id', 'owner_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsibles: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsible_contacts: ['id', 'responsible_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  pets: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
  pet_owners: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
  medical_records: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
  vaccine_preset_doses: ['id', 'validity_value', 'validity_unit'],
  pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_preset_dose_id', 'vaccine_name', 'vaccine_dose_label', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
} as const;

const currentSchema = {
  owners: ['id', 'name', 'avatar_blob', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
  addresses: ['id', 'owner_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'],
  contacts: ['id', 'owner_id', 'responsible_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsibles: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
  pets: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
  pet_owners: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
  medical_records: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
  preventive_catalog_items: ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'origin', 'regions', 'created_at', 'updated_at'],
  pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
} as const;

type SchemaDefinition = Record<string, readonly string[]>;

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(scriptDir, value);
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = { help: false };
  const positionals: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    const nextValue = (): string => {
      const value = args[index + 1];
      if (!value) throw new Error(`Informe um caminho ou valor após ${arg}.`);
      index += 1;
      return value;
    };

    if (arg === '--source' || arg === '--input' || arg === '-s') options.source = nextValue();
    else if (arg === '--base' || arg === '-b') options.base = nextValue();
    else if (arg === '--output' || arg === '-o') options.output = nextValue();
    else if (arg === '--changed-since') options.changedSince = nextValue();
    else if (arg.startsWith('--source=') || arg.startsWith('--input=')) options.source = arg.slice(arg.indexOf('=') + 1);
    else if (arg.startsWith('--base=')) options.base = arg.slice(arg.indexOf('=') + 1);
    else if (arg.startsWith('--output=')) options.output = arg.slice(arg.indexOf('=') + 1);
    else if (arg.startsWith('--changed-since=')) options.changedSince = arg.slice(arg.indexOf('=') + 1);
    else if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`);
    else positionals.push(arg);
  }

  if (!options.source && positionals[0]) options.source = positionals[0];
  if (!options.base && positionals[1]) options.base = positionals[1];
  if (!options.output && positionals[2]) options.output = positionals[2];
  if (positionals.length > 3) throw new Error(`Argumentos posicionais demais: ${positionals.slice(3).join(', ')}`);
  return options;
}

function printUsage(): void {
  console.log(`Uso:
  npm run exported-db -- --source dist/export.db
  npm run exported-db -- --source dist/export.db --base build/veterinary_clinic.db --output build/veterinary_clinic.consolidated.db

Argumentos posicionais:
  exported-db-to-sqlite.js [source-db] [base-db] [output-db]

Opções:
  --source, -s         Banco exportado pela versão antiga
  --base, -b           Banco já criado no formato atual
  --output, -o         Novo banco consolidado
  --changed-since      Watermark manual; normalmente é detectado automaticamente

O banco-base nunca é alterado. O arquivo de saída é recriado a partir dele.`);
}

function findDistDatabase(): string {
  if (!fs.existsSync(distDir)) throw new Error(`Pasta dist não encontrada: ${distDir}`);
  const candidates = fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(db|sqlite|sqlite3)$/i.test(entry.name))
    .map((entry) => path.resolve(distDir, entry.name))
    .sort((first, second) => first.localeCompare(second));

  if (candidates.length === 0) throw new Error(`Nenhum banco encontrado em ${distDir}.`);
  if (candidates.length > 1) {
    throw new Error(`Mais de um banco encontrado em dist; informe --source: ${candidates.map((candidate) => path.basename(candidate)).join(', ')}`);
  }
  return candidates[0];
}

function resolveSourcePath(value: string | undefined): string {
  if (!value) return findDistDatabase();
  const direct = resolvePath(value);
  if (fs.existsSync(direct)) return direct;
  const fromDist = path.resolve(distDir, value);
  return fs.existsSync(fromDist) ? fromDist : direct;
}

function removeDatabaseFiles(databasePath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${databasePath}${suffix}`;
    if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
  }
}

function tableColumns(database: Database.Database, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as TableInfoRow[];
  return new Set(rows.map((row) => row.name));
}

function assertSchema(database: Database.Database, schema: SchemaDefinition, label: string): void {
  const existingTables = new Set(
    (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as TableInfoRow[]).map((row) => row.name)
  );
  const missingTables = Object.keys(schema).filter((table) => !existingTables.has(table));
  if (missingTables.length > 0) throw new Error(`${label} não tem as tabelas esperadas: ${missingTables.join(', ')}`);

  const missingColumns: string[] = [];
  for (const [table, requiredColumns] of Object.entries(schema)) {
    const columns = tableColumns(database, table);
    for (const column of requiredColumns) {
      if (!columns.has(column)) missingColumns.push(`${table}.${column}`);
    }
  }
  if (missingColumns.length > 0) throw new Error(`${label} não tem as colunas esperadas: ${missingColumns.join(', ')}`);
}

function assertIntegrity(database: Database.Database, label: string): void {
  const integrityProblems = (database.prepare('PRAGMA integrity_check').all() as IntegrityCheckRow[])
    .map((row) => row.integrity_check)
    .filter((value) => value !== 'ok');
  if (integrityProblems.length > 0) throw new Error(`${label}: integrity_check falhou: ${integrityProblems.join('; ')}`);

  const foreignKeyProblems = database.prepare('PRAGMA foreign_key_check').all() as ForeignKeyCheckRow[];
  if (foreignKeyProblems.length > 0) {
    const sample = foreignKeyProblems.slice(0, 5).map((row) => `${row.table}[rowid=${row.rowid}] -> ${row.parent}`).join('; ');
    throw new Error(`${label}: foreign_key_check encontrou ${foreignKeyProblems.length} problema(s): ${sample}`);
  }
}

function countRows(database: Database.Database, table: string): number {
  return (database.prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`).get() as CountRow).total;
}

function maxId(database: Database.Database, table: string): number {
  return (database.prepare(`SELECT MAX(id) AS max_id FROM ${quoteIdentifier(table)}`).get() as MaxIdRow).max_id ?? 0;
}

function normalizePreventiveName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isValidDate(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeLegacyBirthDate(value: string | null): string | null {
  const raw = value?.trim() ?? '';
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[\sT].*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidDate(year, month, day)) return null;
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2}|\d{4})(?:\s+.*)?$/);
  if (!slashMatch) return null;

  const month = Number(slashMatch[1]);
  const day = Number(slashMatch[2]);
  let year = Number(slashMatch[3]);
  if (year < 100) year += year >= 40 ? 1900 : 2000;
  if (!isValidDate(year, month, day)) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function currentVaccineName(legacyName: string, species: string | null): string {
  const mappings: Record<string, string> = {
    'V 10': 'Vanguard Plus',
    'V 8': 'Nobivac DHPPI+L',
    'Antirrábica': 'Nobivac Raiva',
    Recombitek: 'Recombitek C6',
    Quadrupla: 'Nobivac Feline 1-HCPCh',
    Quíntupla: 'Nobivac Feline 1-HCPCh + FeLV',
    Giardia: 'GiardiaVax',
    Gripe: 'BronchiGuard',
    Imunocan: 'Imunocan V8'
  };
  if (legacyName === 'Nobivac') return species === 'feline' ? 'Nobivac Tricat Trio' : 'Nobivac DHPPi';
  return mappings[legacyName] ?? legacyName.trim();
}

function createReport(): ConsolidationReport {
  return {
    ownersInserted: 0,
    ownersUpdated: 0,
    ownerContactsInserted: 0,
    responsiblesInserted: 0,
    responsibleContactsInserted: 0,
    petsInserted: 0,
    petsUpdated: 0,
    petOwnerSetsReplaced: 0,
    medicalRecordsInserted: 0,
    medicalRecordsUpdated: 0,
    vaccinationsInserted: 0,
    vaccinationsReused: 0,
    vaccinationStatesUpdated: 0,
    warnings: []
  };
}

function assertSameLineage(source: Database.Database, base: Database.Database): void {
  for (const table of ['owners', 'pets', 'medical_records']) {
    const baseIds = base.prepare(`SELECT id FROM ${quoteIdentifier(table)} ORDER BY id`).all() as IdRow[];
    const sourceHasId = source.prepare(`SELECT 1 AS id FROM ${quoteIdentifier(table)} WHERE id = ?`);
    const missingIds = baseIds.filter((row) => !sourceHasId.get(row.id)).map((row) => row.id);
    if (missingIds.length > 0) {
      throw new Error(`Os bancos não parecem ter a mesma origem: ${table} ausente(s) no legado: ${missingIds.slice(0, 10).join(', ')}`);
    }
  }
}

function detectWatermark(source: Database.Database, baseOwnerMaxId: number): string {
  const row = source.prepare(
    `SELECT MAX(created_at) AS timestamp
     FROM owners
     WHERE id <= ?`
  ).get(baseOwnerMaxId) as TimestampRow;
  if (!row.timestamp) throw new Error('Não foi possível detectar o fim da importação original.');
  return row.timestamp;
}

function vaccinationRows(source: Database.Database, where: string): LegacyVaccinationRow[] {
  return source.prepare(
    `SELECT pv.id,
        pv.pet_id,
        pv.applied_at,
        pv.vaccine_name,
        pv.vaccine_dose_label,
        pv.created_at,
        pv.validity_ignored_at,
        pv.updated_at,
        pv.deleted_at,
        pv.purge_after,
        dose.validity_value,
        dose.validity_unit,
        pets.species
     FROM pet_vaccinations AS pv
     JOIN vaccine_preset_doses AS dose ON dose.id = pv.vaccine_preset_dose_id
     JOIN pets ON pets.id = pv.pet_id
     WHERE ${where}
     ORDER BY pv.id`
  ).all() as LegacyVaccinationRow[];
}

function synchronizeOwners(
  source: Database.Database,
  output: Database.Database,
  owners: LegacyOwnerRow[],
  baseOwnerMaxId: number,
  report: ConsolidationReport
): void {
  const upsertOwner = output.prepare(`
    INSERT INTO owners (id, name, avatar_blob, additional_information, created_at, updated_at, deleted_at, purge_after)
    VALUES (@id, @name, @avatar_blob, @additional_information, @created_at, @updated_at, @deleted_at, @purge_after)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      avatar_blob = excluded.avatar_blob,
      additional_information = excluded.additional_information,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      purge_after = excluded.purge_after
  `);
  const upsertAddress = output.prepare(`
    INSERT INTO addresses (
      owner_id, street, street_number, address_complement, neighborhood, city, state, country, postal_code, created_at, updated_at
    ) VALUES (
      @id, @street, @street_number, @address_complement, @neighborhood, @city, @state, @country, @postal_code, @created_at, @updated_at
    )
    ON CONFLICT(owner_id) DO UPDATE SET
      street = excluded.street,
      street_number = excluded.street_number,
      address_complement = excluded.address_complement,
      neighborhood = excluded.neighborhood,
      city = excluded.city,
      state = excluded.state,
      country = excluded.country,
      postal_code = excluded.postal_code,
      updated_at = excluded.updated_at
  `);
  const deleteOwnerContacts = output.prepare(`
    DELETE FROM contacts
    WHERE owner_id = ?
       OR responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = ?)
  `);
  const deleteResponsibles = output.prepare('DELETE FROM owner_additional_responsibles WHERE owner_id = ?');
  const insertOwnerContact = output.prepare(`
    INSERT INTO contacts (owner_id, kind, label, value, sort_order, created_at, updated_at)
    VALUES (@owner_id, @kind, @label, @value, @sort_order, @created_at, @updated_at)
  `);
  const insertResponsible = output.prepare(`
    INSERT INTO owner_additional_responsibles (id, owner_id, name, avatar_blob, sort_order, created_at, updated_at)
    VALUES (@id, @owner_id, @name, @avatar_blob, @sort_order, @created_at, @updated_at)
  `);
  const insertResponsibleContact = output.prepare(`
    INSERT INTO contacts (responsible_id, kind, label, value, sort_order, created_at, updated_at)
    VALUES (@responsible_id, @kind, @label, @value, @sort_order, @created_at, @updated_at)
  `);

  const ownerContacts = source.prepare('SELECT * FROM owner_contacts WHERE owner_id = ? ORDER BY sort_order, id');
  const responsibles = source.prepare('SELECT * FROM owner_additional_responsibles WHERE owner_id = ? ORDER BY sort_order, id');
  const responsibleContacts = source.prepare(
    'SELECT * FROM owner_additional_responsible_contacts WHERE responsible_id = ? ORDER BY sort_order, id'
  );

  for (const owner of owners) {
    upsertOwner.run(owner);
    upsertAddress.run(owner);
    deleteOwnerContacts.run(owner.id, owner.id);
    deleteResponsibles.run(owner.id);

    const contacts = ownerContacts.all(owner.id) as LegacyContactRow[];
    for (const contact of contacts) insertOwnerContact.run(contact);

    const ownerResponsibles = responsibles.all(owner.id) as LegacyResponsibleRow[];
    for (const responsible of ownerResponsibles) {
      insertResponsible.run(responsible);
      const contactsForResponsible = responsibleContacts.all(responsible.id) as LegacyResponsibleContactRow[];
      for (const contact of contactsForResponsible) insertResponsibleContact.run(contact);
      report.responsibleContactsInserted += contactsForResponsible.length;
    }

    if (owner.id > baseOwnerMaxId) report.ownersInserted += 1;
    else report.ownersUpdated += 1;
    report.ownerContactsInserted += contacts.length;
    report.responsiblesInserted += ownerResponsibles.length;
  }
}

function synchronizePets(
  source: Database.Database,
  output: Database.Database,
  pets: LegacyPetRow[],
  impactedPetIds: Set<number>,
  basePetMaxId: number,
  report: ConsolidationReport
): void {
  const existingPet = output.prepare('SELECT birth_date FROM pets WHERE id = ?');
  const upsertPet = output.prepare(`
    INSERT INTO pets (id, name, birth_date, species, breed, sex, avatar_blob, updated_at, deleted_at, purge_after)
    VALUES (@id, @name, @birth_date, @species, @breed, @sex, @avatar_blob, @updated_at, @deleted_at, @purge_after)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      birth_date = excluded.birth_date,
      species = excluded.species,
      breed = excluded.breed,
      sex = excluded.sex,
      avatar_blob = excluded.avatar_blob,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      purge_after = excluded.purge_after
  `);

  for (const pet of pets) {
    const previous = existingPet.get(pet.id) as CurrentPetRow | undefined;
    const normalizedBirthDate = normalizeLegacyBirthDate(pet.birth_date);
    const birthDate = normalizedBirthDate ?? previous?.birth_date ?? null;
    if (pet.birth_date && !normalizedBirthDate) {
      report.warnings.push(`Data de nascimento não reconhecida no pet ${pet.id}; mantido o valor atual.`);
    }
    upsertPet.run({ ...pet, birth_date: birthDate });
    if (pet.id > basePetMaxId) report.petsInserted += 1;
    else report.petsUpdated += 1;
  }

  const deletePetOwners = output.prepare('DELETE FROM pet_owners WHERE pet_id = ?');
  const sourcePetOwners = source.prepare('SELECT * FROM pet_owners WHERE pet_id = ? ORDER BY sort_order, id');
  const insertPetOwner = output.prepare(`
    INSERT INTO pet_owners (id, pet_id, owner_id, sort_order, created_at, updated_at)
    VALUES (@id, @pet_id, @owner_id, @sort_order, @created_at, @updated_at)
  `);

  for (const petId of [...impactedPetIds].sort((first, second) => first - second)) {
    deletePetOwners.run(petId);
    const relationships = sourcePetOwners.all(petId) as LegacyPetOwnerRow[];
    for (const relationship of relationships) insertPetOwner.run(relationship);
    report.petOwnerSetsReplaced += 1;
  }
}

function synchronizeMedicalRecords(
  output: Database.Database,
  records: LegacyMedicalRecordRow[],
  baseRecordMaxId: number,
  report: ConsolidationReport
): void {
  const upsertRecord = output.prepare(`
    INSERT INTO medical_records (id, pet_id, title, description, admitted_at, discharged_at, updated_at, deleted_at, purge_after)
    VALUES (@id, @pet_id, @title, @description, @admitted_at, @discharged_at, @updated_at, @deleted_at, @purge_after)
    ON CONFLICT(id) DO UPDATE SET
      pet_id = excluded.pet_id,
      title = excluded.title,
      description = excluded.description,
      admitted_at = excluded.admitted_at,
      discharged_at = excluded.discharged_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      purge_after = excluded.purge_after
  `);

  for (const record of records) {
    upsertRecord.run(record);
    if (record.id > baseRecordMaxId) report.medicalRecordsInserted += 1;
    else report.medicalRecordsUpdated += 1;
  }
}

function ensureVaccineCatalogItem(output: Database.Database, vaccineName: string, species: string | null): string {
  const normalizedName = normalizePreventiveName(vaccineName);
  const existing = output.prepare(
    `SELECT id FROM preventive_catalog_items WHERE kind = 'vaccine' AND normalized_name = ? LIMIT 1`
  ).get(normalizedName) as IdRow | undefined;
  if (existing) return normalizedName;

  const supportedSpecies = species === 'feline' ? ['feline'] : species === 'canine' ? ['canine'] : ['canine', 'feline'];
  output.prepare(`
    INSERT INTO preventive_catalog_items (
      kind, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at
    ) VALUES ('vaccine', ?, ?, ?, '[]', NULL, 'user', '[]', CURRENT_TIMESTAMP)
  `).run(vaccineName, normalizedName, JSON.stringify(supportedSpecies));
  return normalizedName;
}

function synchronizeVaccinations(
  output: Database.Database,
  changedExisting: LegacyVaccinationRow[],
  newVaccinations: LegacyVaccinationRow[],
  report: ConsolidationReport
): void {
  const findExisting = output.prepare(`
    SELECT id
    FROM pet_vaccinations
    WHERE pet_id = ?
      AND applied_at = ?
      AND vaccine_name = ?
      AND dose = ?
    ORDER BY id
  `);
  const updateState = output.prepare(`
    UPDATE pet_vaccinations
    SET validity_ignored_at = @validity_ignored_at,
        updated_at = @updated_at,
        deleted_at = @deleted_at,
        purge_after = @purge_after
    WHERE id = @target_id
  `);

  for (const vaccination of changedExisting) {
    const vaccineName = currentVaccineName(vaccination.vaccine_name, vaccination.species);
    const matches = findExisting.all(
      vaccination.pet_id,
      vaccination.applied_at,
      vaccineName,
      vaccination.vaccine_dose_label
    ) as ExistingVaccinationRow[];
    if (matches.length !== 1) {
      throw new Error(
        `Não foi possível relacionar a vacina legada ${vaccination.id} (${vaccineName}, pet ${vaccination.pet_id}, ${vaccination.applied_at}); correspondências no banco-base: ${matches.length}.`
      );
    }
    updateState.run({ ...vaccination, target_id: matches[0].id });
    report.vaccinationStatesUpdated += 1;
  }

  const findImported = output.prepare(`
    SELECT id
    FROM pet_vaccinations
    WHERE pet_id = @pet_id
      AND applied_at = @applied_at
      AND vaccine_normalized_name = @vaccine_normalized_name
      AND dose = @dose
      AND validity_value = @validity_value
      AND validity_unit = @validity_unit
      AND created_at = @created_at
    ORDER BY id
    LIMIT 1
  `);
  const insertVaccination = output.prepare(`
    INSERT INTO pet_vaccinations (
      pet_id, applied_at, vaccine_name, vaccine_normalized_name, dose, validity_value, validity_unit,
      observation, created_at, validity_ignored_at, updated_at, deleted_at, purge_after
    ) VALUES (
      @pet_id, @applied_at, @vaccine_name, @vaccine_normalized_name, @dose, @validity_value, @validity_unit,
      NULL, @created_at, @validity_ignored_at, @updated_at, @deleted_at, @purge_after
    )
  `);

  for (const vaccination of newVaccinations) {
    const vaccineName = currentVaccineName(vaccination.vaccine_name, vaccination.species);
    const values = {
      ...vaccination,
      vaccine_name: vaccineName,
      vaccine_normalized_name: ensureVaccineCatalogItem(output, vaccineName, vaccination.species),
      dose: vaccination.vaccine_dose_label
    };
    const existing = findImported.get(values) as ExistingVaccinationRow | undefined;
    if (existing) {
      updateState.run({ ...vaccination, target_id: existing.id });
      report.vaccinationsReused += 1;
      continue;
    }
    insertVaccination.run(values);
    report.vaccinationsInserted += 1;
  }
}

function printReport(
  sourcePath: string,
  basePath: string,
  outputPath: string,
  watermark: string,
  output: Database.Database,
  report: ConsolidationReport
): void {
  console.log('\nConsolidação concluída:');
  console.log(`- Banco legado: ${sourcePath}`);
  console.log(`- Banco-base preservado: ${basePath}`);
  console.log(`- Novo banco: ${outputPath}`);
  console.log(`- Alterações consideradas após: ${watermark}`);
  console.log(`- Owners: ${report.ownersInserted} novo(s), ${report.ownersUpdated} atualizado(s)`);
  console.log(`- Contatos de owners recriados: ${report.ownerContactsInserted}`);
  console.log(`- Responsáveis adicionais recriados: ${report.responsiblesInserted}`);
  console.log(`- Contatos de responsáveis recriados: ${report.responsibleContactsInserted}`);
  console.log(`- Pets: ${report.petsInserted} novo(s), ${report.petsUpdated} atualizado(s)`);
  console.log(`- Conjuntos de vínculos pet-owner sincronizados: ${report.petOwnerSetsReplaced}`);
  console.log(`- Prontuários: ${report.medicalRecordsInserted} novo(s), ${report.medicalRecordsUpdated} atualizado(s)`);
  console.log(`- Vacinas: ${report.vaccinationsInserted} nova(s), ${report.vaccinationsReused} já existente(s)`);
  console.log(`- Estados de vacinas anteriores atualizados: ${report.vaccinationStatesUpdated}`);
  console.log('- Totais no banco consolidado:');
  for (const table of ['owners', 'pets', 'medical_records', 'pet_vaccinations', 'pet_antiparasitic_treatments']) {
    console.log(`  - ${table}: ${countRows(output, table)}`);
  }
  if (report.warnings.length > 0) {
    console.log('- Avisos:');
    for (const warning of report.warnings) console.log(`  - ${warning}`);
  }
}

function consolidate(): void {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const sourcePath = resolveSourcePath(options.source ?? process.env.SOURCE_DB);
  const basePath = resolvePath(options.base ?? process.env.BASE_DB ?? defaultBasePath);
  const outputPath = resolvePath(options.output ?? process.env.OUTPUT_DB ?? defaultOutputPath);

  for (const [label, databasePath] of [['Banco legado', sourcePath], ['Banco-base', basePath]] as const) {
    if (!fs.existsSync(databasePath)) throw new Error(`${label} não encontrado: ${databasePath}`);
  }
  if ([sourcePath, basePath].some((candidate) => path.resolve(candidate) === path.resolve(outputPath))) {
    throw new Error('O arquivo de saída deve ser diferente dos bancos de origem e base.');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  removeDatabaseFiles(outputPath);

  const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
  const base = new Database(basePath, { readonly: true, fileMustExist: true });
  source.pragma('foreign_keys = ON');
  base.pragma('foreign_keys = ON');

  try {
    assertSchema(source, legacySchema, 'Banco legado');
    assertSchema(base, currentSchema, 'Banco-base');
    assertIntegrity(source, 'Banco legado');
    assertIntegrity(base, 'Banco-base');
    assertSameLineage(source, base);

    const baseOwnerMaxId = maxId(base, 'owners');
    const basePetMaxId = maxId(base, 'pets');
    const baseRecordMaxId = maxId(base, 'medical_records');
    const watermark = options.changedSince ?? process.env.CHANGED_SINCE ?? detectWatermark(source, baseOwnerMaxId);

    base.exec(`VACUUM INTO ${quoteSqlString(outputPath)}`);
    const output = new Database(outputPath, { fileMustExist: true });
    output.pragma('foreign_keys = ON');

    try {
      assertSchema(output, currentSchema, 'Banco de saída');
      const owners = source.prepare(`
        SELECT *
        FROM owners
        WHERE id > ?
           OR updated_at > ?
           OR deleted_at IS NOT NULL
        ORDER BY id
      `).all(baseOwnerMaxId, watermark) as LegacyOwnerRow[];
      const pets = source.prepare(`
        SELECT *
        FROM pets
        WHERE id > ?
           OR updated_at > ?
           OR deleted_at IS NOT NULL
        ORDER BY id
      `).all(basePetMaxId, watermark) as LegacyPetRow[];
      const records = source.prepare(`
        SELECT *
        FROM medical_records
        WHERE id > ?
           OR updated_at > ?
           OR deleted_at IS NOT NULL
        ORDER BY id
      `).all(baseRecordMaxId, watermark) as LegacyMedicalRecordRow[];
      const recentPetOwners = source.prepare(`
        SELECT DISTINCT pet_id AS id
        FROM pet_owners
        WHERE created_at > ?
           OR updated_at > ?
      `).all(watermark, watermark) as IdRow[];
      const impactedPetIds = new Set([...pets.map((pet) => pet.id), ...recentPetOwners.map((row) => row.id)]);
      const changedExistingVaccinations = vaccinationRows(
        source,
        `pv.created_at <= ${quoteSqlString(watermark)}
         AND (pv.updated_at > pv.created_at OR pv.deleted_at IS NOT NULL)`
      );
      const newVaccinations = vaccinationRows(source, `pv.created_at > ${quoteSqlString(watermark)}`);
      const report = createReport();

      const runConsolidation = output.transaction(() => {
        synchronizeOwners(source, output, owners, baseOwnerMaxId, report);
        synchronizePets(source, output, pets, impactedPetIds, basePetMaxId, report);
        synchronizeMedicalRecords(output, records, baseRecordMaxId, report);
        synchronizeVaccinations(output, changedExistingVaccinations, newVaccinations, report);
      });
      runConsolidation();

      output.pragma('optimize');
      assertIntegrity(output, 'Banco consolidado');
      printReport(sourcePath, basePath, outputPath, watermark, output, report);
    } finally {
      output.close();
    }
  } catch (error) {
    removeDatabaseFiles(outputPath);
    throw error;
  } finally {
    base.close();
    source.close();
  }
}

try {
  consolidate();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Erro durante a consolidação:', message);
  process.exitCode = 1;
}
