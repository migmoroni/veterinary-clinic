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
  vaccine_presets: ['id', 'name', 'normalized_name', 'default_protocol_id', 'created_at', 'hidden_at', 'updated_at'],
  vaccine_protocols: ['id', 'vaccine_preset_id', 'name', 'normalized_name', 'sort_order', 'created_at', 'updated_at'],
  vaccine_preset_doses: ['id', 'vaccine_preset_id', 'vaccine_protocol_id', 'label', 'normalized_label', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at'],
  pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_preset_id', 'vaccine_protocol_id', 'vaccine_preset_dose_id', 'vaccine_name', 'vaccine_protocol_name', 'vaccine_dose_label', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
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

function findDistDatabase(): string {
  if (!fs.existsSync(distDir)) throw new Error(`Pasta dist não encontrada: ${distDir}`);

  const candidates = fs
    .readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(db|sqlite|sqlite3)$/i.test(entry.name))
    .map((entry) => path.resolve(distDir, entry.name))
    .sort((first, second) => first.localeCompare(second));

  if (candidates.length === 0) throw new Error(`Nenhum arquivo .db, .sqlite ou .sqlite3 encontrado em ${distDir}`);
  if (candidates.length === 1) return candidates[0];

  const preferred = candidates.filter((candidate) => path.basename(candidate).toLowerCase() === 'veterinary_clinic.db');
  if (preferred.length === 1) return preferred[0];

  throw new Error(`Mais de um banco encontrado em dist. Informe o caminho explicitamente: ${candidates.map((candidate) => path.basename(candidate)).join(', ')}`);
}

function resolveInputPath(): string {
  const explicit = process.argv[2] ?? process.env.SOURCE_DB;
  return explicit ? resolvePath(explicit) : findDistDatabase();
}

function resolveOutputPath(): string {
  const explicit = process.argv[3] ?? process.env.OUTPUT_DB;
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
  const inputPath = resolveInputPath();
  const outputPath = resolveOutputPath();
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
