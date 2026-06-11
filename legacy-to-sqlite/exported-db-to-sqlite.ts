import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

interface CountRow {
  total: number;
}

interface ForeignKeyCheckRow {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
}

interface IntegrityCheckRow {
  integrity_check: string;
}

interface TableInfoRow {
  name: string;
}

interface CliOptions {
  source?: string;
  output?: string;
  help: boolean;
}

const projectDir = process.cwd();
const distDir = path.resolve(projectDir, 'dist');
const buildDir = path.resolve(projectDir, 'build');
const defaultOutputPath = path.resolve(buildDir, 'veterinary_clinic.db');

const requiredSchema = {
  owners: ['id', 'name', 'avatar_blob', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
  addresses: ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'],
  veterinarian_profiles: ['id', 'name', 'professional_registration', 'avatar_blob', 'created_at', 'updated_at'],
  workplaces: ['id', 'name', 'services_description', 'created_at', 'updated_at'],
  image_collections: ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items', 'created_at', 'updated_at'],
  image_collection_items: ['id', 'collection_id', 'image_blob', 'original_image_blob', 'description', 'is_primary', 'sort_order', 'created_at', 'updated_at'],
  owner_contacts: ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsibles: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
  pets: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
  pet_owners: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
  medical_records: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
  app_settings: ['key', 'value', 'updated_at'],
  backup_history: ['id', 'path', 'kind', 'created_at'],
  preventive_catalog_items: ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'hidden_at', 'created_at', 'updated_at'],
  preventive_protocols: ['id', 'kind', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
  preventive_protocol_items: ['id', 'protocol_id', 'catalog_item_id', 'sort_order', 'created_at', 'updated_at'],
  preventive_protocol_doses: ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at'],
  pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after'],
  pet_antiparasitic_treatments: ['id', 'pet_id', 'applied_at', 'antiparasitic_name', 'antiparasitic_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
} as const;

type TableName = keyof typeof requiredSchema;
type SchemaDefinition = Record<string, readonly string[]>;
type SourceSchemaKind = 'current' | 'split-addresses';

const { addresses: _addresses, ...schemaWithoutAddresses } = requiredSchema;
const splitAddressSchema = {
  ...schemaWithoutAddresses,
  owner_addresses: ['owner_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'],
  workplace_addresses: ['workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at']
} as const;

const copySidecarSuffixes = ['', '-wal', '-shm'];

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function resolvePath(value: string): string {
  return path.isAbsolute(value) ? value : path.resolve(projectDir, value);
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

    if (arg === '--source' || arg === '--input' || arg === '-s') {
      const value = args[index + 1];
      if (!value) throw new Error(`Informe um caminho após ${arg}.`);
      options.source = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--source=') || arg.startsWith('--input=')) {
      options.source = arg.slice(arg.indexOf('=') + 1);
      continue;
    }

    if (arg === '--output' || arg === '-o') {
      const value = args[index + 1];
      if (!value) throw new Error(`Informe um caminho após ${arg}.`);
      options.output = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--output=')) {
      options.output = arg.slice(arg.indexOf('=') + 1);
      continue;
    }

    if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`);
    positionals.push(arg);
  }

  if (!options.source && positionals[0]) options.source = positionals[0];
  if (!options.output && positionals[1]) options.output = positionals[1];
  if (positionals.length > 2) throw new Error(`Argumentos posicionais demais: ${positionals.slice(2).join(', ')}`);

  return options;
}

function printUsage(): void {
  console.log(`Uso:
  node exported-db-to-sqlite.js [source-db] [output-db]
  node exported-db-to-sqlite.js --source dist/export.db --output build/veterinary_clinic.db

Variáveis de ambiente:
  SOURCE_DB=dist/export.db OUTPUT_DB=build/veterinary_clinic.db node exported-db-to-sqlite.js

Com npm, passe argumentos após --:
  npm run exported-db -- --source dist/export.db`);
}

function resolveInputCandidate(value: string): string {
  const directPath = resolvePath(value);
  if (fs.existsSync(directPath)) return directPath;

  const distPath = path.resolve(distDir, value);
  if (!path.isAbsolute(value) && fs.existsSync(distPath)) return distPath;

  return directPath;
}

function findDistDatabase(): string {
  if (!fs.existsSync(distDir)) throw new Error(`Pasta dist não encontrada: ${distDir}`);

  const candidates = fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(db|sqlite|sqlite3)$/i.test(entry.name))
    .map((entry) => path.resolve(distDir, entry.name))
    .sort((first, second) => first.localeCompare(second));

  if (candidates.length === 0) throw new Error(`Nenhum arquivo .db, .sqlite ou .sqlite3 encontrado em ${distDir}`);
  if (candidates.length === 1) return candidates[0];

  throw new Error(`Mais de um banco encontrado em dist. Informe o caminho com --source: ${candidates.map((candidate) => path.basename(candidate)).join(', ')}`);
}

function resolveInputPath(options: CliOptions): string {
  const explicit = options.source ?? process.env.SOURCE_DB;
  return explicit ? resolveInputCandidate(explicit) : findDistDatabase();
}

function resolveOutputPath(options: CliOptions): string {
  const explicit = options.output ?? process.env.OUTPUT_DB;
  return explicit ? resolvePath(explicit) : defaultOutputPath;
}

function removeExistingOutput(outputPath: string): void {
  for (const suffix of copySidecarSuffixes) {
    const candidate = `${outputPath}${suffix}`;
    if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
  }
}

function prepareOutputPath(inputPath: string, outputPath: string): void {
  if (!fs.existsSync(inputPath)) throw new Error(`Banco de origem não encontrado: ${inputPath}`);
  if (path.resolve(inputPath) === path.resolve(outputPath)) throw new Error('Banco de origem e destino não podem ser o mesmo arquivo.');

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  removeExistingOutput(outputPath);
}

function tableColumns(database: Database.Database, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as TableInfoRow[];
  return new Set(rows.map((row) => row.name));
}

function hasTable(database: Database.Database, table: string): boolean {
  return Boolean(database.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));
}

function assertCompatibleSchema(database: Database.Database, schema: SchemaDefinition): void {
  const existingTables = new Set(
    (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name)
  );

  const missingTables = Object.keys(schema).filter((table) => !existingTables.has(table));
  if (missingTables.length > 0) throw new Error(`Banco de origem não tem as tabelas esperadas: ${missingTables.join(', ')}`);

  const missingColumns: string[] = [];
  for (const table of Object.keys(schema)) {
    const columns = tableColumns(database, table);
    for (const column of schema[table]) {
      if (!columns.has(column)) missingColumns.push(`${table}.${column}`);
    }
  }

  if (missingColumns.length > 0) throw new Error(`Banco de origem não tem as colunas esperadas: ${missingColumns.join(', ')}`);
}

function detectSourceSchema(database: Database.Database): SourceSchemaKind {
  if (hasTable(database, 'addresses')) {
    assertCompatibleSchema(database, requiredSchema);
    return 'current';
  }

  assertCompatibleSchema(database, splitAddressSchema);
  return 'split-addresses';
}

function assertIntegrity(database: Database.Database): void {
  const integrityRows = database.prepare('PRAGMA integrity_check').all() as IntegrityCheckRow[];
  const integrityProblems = integrityRows.map((row) => row.integrity_check).filter((value) => value !== 'ok');
  if (integrityProblems.length > 0) throw new Error(`PRAGMA integrity_check encontrou problemas: ${integrityProblems.join('; ')}`);

  const foreignKeyRows = database.prepare('PRAGMA foreign_key_check').all() as ForeignKeyCheckRow[];
  if (foreignKeyRows.length > 0) {
    const sample = foreignKeyRows.slice(0, 5).map((row) => `${row.table}[rowid=${row.rowid}] -> ${row.parent}`).join('; ');
    throw new Error(`PRAGMA foreign_key_check encontrou ${foreignKeyRows.length} problema(s): ${sample}`);
  }
}

function countRows(database: Database.Database, table: string): number {
  return (database.prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`).get() as CountRow).total;
}

function tableCounts(database: Database.Database, schemaKind: SourceSchemaKind = 'current'): Map<TableName, number> {
  return new Map(
    (Object.keys(requiredSchema) as TableName[]).map((table) => [
      table,
      table === 'addresses' && schemaKind === 'split-addresses'
        ? countRows(database, 'owner_addresses') + countRows(database, 'workplace_addresses')
        : countRows(database, table)
    ])
  );
}

function assertCountsMatch(inputCounts: Map<TableName, number>, outputCounts: Map<TableName, number>): void {
  const mismatches = [...inputCounts.entries()].filter(([table, inputCount]) => outputCounts.get(table) !== inputCount);
  if (mismatches.length > 0) {
    throw new Error(`Contagens divergentes após rebuild: ${mismatches.map(([table, count]) => `${table} origem=${count} destino=${outputCounts.get(table) ?? '?'}`).join(', ')}`);
  }
}

function transformSplitAddresses(database: Database.Database): void {
  database.pragma('foreign_keys = OFF');
  const transform = database.transaction(() => {
    database.exec(`
      CREATE TABLE addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        workplace_id INTEGER,
        street TEXT CHECK(street IS NULL OR length(street) <= 160),
        street_number TEXT CHECK(street_number IS NULL OR length(street_number) <= 32),
        address_complement TEXT CHECK(address_complement IS NULL OR length(address_complement) <= 80),
        neighborhood TEXT CHECK(neighborhood IS NULL OR length(neighborhood) <= 120),
        city TEXT CHECK(city IS NULL OR length(city) <= 120),
        state TEXT CHECK(state IS NULL OR length(state) <= 80),
        country TEXT NOT NULL DEFAULT 'BRA' CHECK(length(country) = 3),
        postal_code TEXT CHECK(postal_code IS NULL OR length(postal_code) <= 32),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
        FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
        CHECK((owner_id IS NOT NULL) + (workplace_id IS NOT NULL) = 1),
        UNIQUE(owner_id),
        UNIQUE(workplace_id)
      );

      INSERT INTO addresses (
        owner_id, workplace_id, street, street_number, address_complement,
        neighborhood, city, state, country, postal_code, created_at, updated_at
      )
      SELECT owner_id, NULL, street, street_number, address_complement,
        neighborhood, city, state, country, postal_code, created_at, updated_at
      FROM owner_addresses;

      INSERT INTO addresses (
        owner_id, workplace_id, street, street_number, address_complement,
        neighborhood, city, state, country, postal_code, created_at, updated_at
      )
      SELECT NULL, workplace_id, street, street_number, address_complement,
        neighborhood, city, state, country, postal_code, created_at, updated_at
      FROM workplace_addresses;

      DROP TABLE workplace_addresses;
      DROP TABLE owner_addresses;

      CREATE INDEX idx_addresses_owner_id ON addresses(owner_id);
      CREATE INDEX idx_addresses_workplace_id ON addresses(workplace_id);
      CREATE INDEX idx_addresses_city ON addresses(city);
      CREATE INDEX idx_addresses_state ON addresses(state);
    `);
  });

  try {
    transform();
  } finally {
    database.pragma('foreign_keys = ON');
  }
}

function printReport(inputPath: string, outputPath: string, counts: Map<TableName, number>, schemaKind: SourceSchemaKind): void {
  console.log('\nRebuild de banco exportado concluído:');
  console.log(`- Origem: ${inputPath}`);
  console.log(`- Destino: ${outputPath}`);
  console.log(`- Transformações estruturais aplicadas: ${schemaKind === 'split-addresses' ? 1 : 0}`);
  if (schemaKind === 'split-addresses') console.log('  - owner_addresses + workplace_addresses -> addresses');
  console.log('- Tabelas copiadas e validadas:');
  for (const [table, count] of counts.entries()) {
    console.log(`  - ${table}: ${count}`);
  }
}

function rebuildExportedDatabase(): void {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const inputPath = resolveInputPath(options);
  const outputPath = resolveOutputPath(options);
  prepareOutputPath(inputPath, outputPath);

  const source = new Database(inputPath, { readonly: true, fileMustExist: true });
  source.pragma('foreign_keys = ON');

  try {
    const sourceSchemaKind = detectSourceSchema(source);
    assertIntegrity(source);
    const inputCounts = tableCounts(source, sourceSchemaKind);

    source.exec(`VACUUM INTO ${quoteSqlString(outputPath)}`);

    const output = new Database(outputPath, { fileMustExist: true });
    output.pragma('foreign_keys = ON');
    try {
      if (sourceSchemaKind === 'split-addresses') transformSplitAddresses(output);
      assertCompatibleSchema(output, requiredSchema);
      assertIntegrity(output);
      const outputCounts = tableCounts(output);
      assertCountsMatch(inputCounts, outputCounts);
      printReport(inputPath, outputPath, outputCounts, sourceSchemaKind);
    } finally {
      output.close();
    }
  } finally {
    source.close();
  }
}

try {
  rebuildExportedDatabase();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Erro durante o rebuild do banco exportado:', message);
  process.exitCode = 1;
}
