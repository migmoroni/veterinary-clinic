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
  owners: ['id', 'name', 'avatar_blob', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
  owner_contacts: ['id', 'owner_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsibles: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
  owner_additional_responsible_contacts: ['id', 'responsible_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
  pets: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
  pet_owners: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
  medical_records: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
  app_settings: ['key', 'value', 'updated_at'],
  backup_history: ['id', 'path', 'kind', 'created_at'],
  vaccines: ['id', 'name', 'normalized_name', 'hidden_at', 'created_at', 'updated_at'],
  vaccine_dose_types: ['id', 'name', 'normalized_name', 'requires_dose_number', 'sort_order', 'hidden_at', 'created_at', 'updated_at'],
  vaccine_validity_options: ['id', 'validity_value', 'validity_unit', 'sort_order', 'hidden_at', 'created_at', 'updated_at'],
  pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose_type', 'dose_number', 'validity_value', 'validity_unit', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
} as const;

type TableName = keyof typeof requiredSchema;

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

function tableColumns(database: Database.Database, table: TableName): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as TableInfoRow[];
  return new Set(rows.map((row) => row.name));
}

function assertCompatibleSchema(database: Database.Database): void {
  const existingTables = new Set(
    (database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((row) => row.name)
  );

  const missingTables = (Object.keys(requiredSchema) as TableName[]).filter((table) => !existingTables.has(table));
  if (missingTables.length > 0) throw new Error(`Banco de origem não tem as tabelas esperadas: ${missingTables.join(', ')}`);

  const missingColumns: string[] = [];
  for (const table of Object.keys(requiredSchema) as TableName[]) {
    const columns = tableColumns(database, table);
    for (const column of requiredSchema[table]) {
      if (!columns.has(column)) missingColumns.push(`${table}.${column}`);
    }
  }

  if (missingColumns.length > 0) throw new Error(`Banco de origem não tem as colunas esperadas: ${missingColumns.join(', ')}`);
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

function countRows(database: Database.Database, table: TableName): number {
  return (database.prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`).get() as CountRow).total;
}

function tableCounts(database: Database.Database): Map<TableName, number> {
  return new Map((Object.keys(requiredSchema) as TableName[]).map((table) => [table, countRows(database, table)]));
}

function assertCountsMatch(inputCounts: Map<TableName, number>, outputCounts: Map<TableName, number>): void {
  const mismatches = [...inputCounts.entries()].filter(([table, inputCount]) => outputCounts.get(table) !== inputCount);
  if (mismatches.length > 0) {
    throw new Error(`Contagens divergentes após rebuild: ${mismatches.map(([table, count]) => `${table} origem=${count} destino=${outputCounts.get(table) ?? '?'}`).join(', ')}`);
  }
}

function printReport(inputPath: string, outputPath: string, counts: Map<TableName, number>): void {
  console.log('\nRebuild de banco exportado concluído:');
  console.log(`- Origem: ${inputPath}`);
  console.log(`- Destino: ${outputPath}`);
  console.log('- Transformações estruturais aplicadas: 0');
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
    assertCompatibleSchema(source);
    assertIntegrity(source);
    const inputCounts = tableCounts(source);

    source.exec(`VACUUM INTO ${quoteSqlString(outputPath)}`);

    const output = new Database(outputPath, { readonly: true, fileMustExist: true });
    output.pragma('foreign_keys = ON');
    try {
      assertCompatibleSchema(output);
      assertIntegrity(output);
      const outputCounts = tableCounts(output);
      assertCountsMatch(inputCounts, outputCounts);
      printReport(inputPath, outputPath, outputCounts);
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
