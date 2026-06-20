import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const CURRENT_SCHEMA_VERSION = 1;
const BASELINE_APP_VERSION = '0.2.0';
const BASELINE_MIGRATION_NAME = '0001_baseline_current_schema';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourcePath = path.resolve(scriptDir, 'dist/veterinary_clinic-version-0.db');
const defaultOutputPath = path.resolve(scriptDir, 'build/veterinary_clinic-version-1.db');

const requiredSchema = {
	owners: ['id', 'name', 'avatar_blob', 'additional_information', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
	veterinarian_profiles: ['id', 'name', 'professional_registration', 'avatar_blob', 'created_at', 'updated_at'],
	workplaces: ['id', 'name', 'services_description', 'created_at', 'updated_at'],
	addresses: ['id', 'owner_id', 'workplace_id', 'street', 'street_number', 'address_complement', 'neighborhood', 'city', 'state', 'country', 'postal_code', 'created_at', 'updated_at'],
	image_collections: ['id', 'entity_type', 'entity_id', 'primary_required', 'max_items', 'created_at', 'updated_at'],
	image_collection_items: ['id', 'collection_id', 'image_blob', 'original_image_blob', 'description', 'is_primary', 'sort_order', 'created_at', 'updated_at'],
	contacts: ['id', 'owner_id', 'responsible_id', 'veterinarian_profile_id', 'workplace_id', 'kind', 'label', 'value', 'sort_order', 'created_at', 'updated_at'],
	owner_additional_responsibles: ['id', 'owner_id', 'name', 'avatar_blob', 'sort_order', 'created_at', 'updated_at'],
	pets: ['id', 'name', 'birth_date', 'species', 'breed', 'sex', 'avatar_blob', 'updated_at', 'deleted_at', 'purge_after'],
	pet_owners: ['id', 'pet_id', 'owner_id', 'sort_order', 'created_at', 'updated_at'],
	medical_records: ['id', 'pet_id', 'title', 'description', 'admitted_at', 'discharged_at', 'updated_at', 'deleted_at', 'purge_after'],
	app_settings: ['key', 'value', 'updated_at'],
	backup_history: ['id', 'path', 'kind', 'created_at'],
	preventive_catalog_items: ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer', 'origin', 'regions', 'hidden_at', 'created_at', 'updated_at'],
	preventive_protocols: ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
	preventive_protocol_items: ['id', 'protocol_id', 'catalog_item_id', 'sort_order', 'created_at', 'updated_at'],
	preventive_protocol_doses: ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at'],
	pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after'],
	pet_antiparasitic_treatments: ['id', 'pet_id', 'applied_at', 'antiparasitic_name', 'antiparasitic_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
};

function printUsage() {
	console.log(`Uso:
  npm run adopt:version-0
  npm run adopt:version-0 -- --source dist/veterinary_clinic-version-0.db --output build/veterinary_clinic-version-1.db

Opções:
  --source, -s   Banco atual sem versionamento formal
  --output, -o   Cópia de saída com schema v1
  --help, -h     Mostra esta ajuda

Padrões:
  source: ${path.relative(scriptDir, defaultSourcePath)}
  output: ${path.relative(scriptDir, defaultOutputPath)}
`);
}

function resolveInputPath(value) {
	return path.isAbsolute(value) ? value : path.resolve(scriptDir, value);
}

function parseOptions(args) {
	const options = {};
	const positionals = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];
		if (arg === '--help' || arg === '-h') {
			options.help = true;
			continue;
		}

		const nextValue = () => {
			const value = args[index + 1];
			if (!value) throw new Error(`Informe um valor após ${arg}.`);
			index += 1;
			return value;
		};

		if (arg === '--source' || arg === '--input' || arg === '-s') options.source = nextValue();
		else if (arg === '--output' || arg === '-o') options.output = nextValue();
		else if (arg.startsWith('--source=') || arg.startsWith('--input=')) options.source = arg.slice(arg.indexOf('=') + 1);
		else if (arg.startsWith('--output=')) options.output = arg.slice(arg.indexOf('=') + 1);
		else if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`);
		else positionals.push(arg);
	}

	if (!options.source && positionals[0]) options.source = positionals[0];
	if (!options.output && positionals[1]) options.output = positionals[1];
	if (positionals.length > 2) throw new Error(`Argumentos posicionais demais: ${positionals.slice(2).join(', ')}`);
	return options;
}

function quoteIdentifier(value) {
	return `"${value.replace(/"/g, '""')}"`;
}

function quoteSqlString(value) {
	return `'${value.replace(/'/g, "''")}'`;
}

function removeDatabaseFiles(databasePath) {
	for (const suffix of ['', '-wal', '-shm']) {
		const candidate = `${databasePath}${suffix}`;
		if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true });
	}
}

function tableColumns(database, table) {
	return new Set(database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => row.name));
}

function assertCurrentDataSchema(database, label) {
	const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
	const missingTables = Object.keys(requiredSchema).filter((table) => !tables.has(table));
	if (missingTables.length > 0) throw new Error(`${label} não tem as tabelas atuais esperadas: ${missingTables.join(', ')}`);

	const missingColumns = [];
	for (const [table, columns] of Object.entries(requiredSchema)) {
		const existingColumns = tableColumns(database, table);
		for (const column of columns) {
			if (!existingColumns.has(column)) missingColumns.push(`${table}.${column}`);
		}
	}
	if (missingColumns.length > 0) throw new Error(`${label} não tem as colunas atuais esperadas: ${missingColumns.join(', ')}`);
}

function assertIntegrity(database, label) {
	const integrityProblems = database
		.prepare('PRAGMA integrity_check')
		.all()
		.map((row) => row.integrity_check)
		.filter((value) => value !== 'ok');
	if (integrityProblems.length > 0) throw new Error(`${label}: integrity_check falhou: ${integrityProblems.join('; ')}`);

	const foreignKeyProblems = database.prepare('PRAGMA foreign_key_check').all();
	if (foreignKeyProblems.length > 0) {
		const sample = foreignKeyProblems
			.slice(0, 5)
			.map((row) => `${row.table}[rowid=${row.rowid}] -> ${row.parent}`)
			.join('; ');
		throw new Error(`${label}: foreign_key_check encontrou ${foreignKeyProblems.length} problema(s): ${sample}`);
	}
}

function userVersion(database) {
	return Number(database.prepare('PRAGMA user_version').get()?.user_version ?? 0);
}

function countRows(database, table) {
	return database.prepare(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)}`).get().total;
}

function stampSchemaVersion(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
			applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	database
		.prepare(
			`INSERT INTO schema_migrations (version, name, app_version, applied_at)
			 VALUES (?, ?, ?, CURRENT_TIMESTAMP)
			 ON CONFLICT(version) DO UPDATE SET
				name = excluded.name,
				app_version = excluded.app_version`
		)
		.run(CURRENT_SCHEMA_VERSION, BASELINE_MIGRATION_NAME, BASELINE_APP_VERSION);

	database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
}

function assertStamped(database) {
	const version = userVersion(database);
	if (version !== CURRENT_SCHEMA_VERSION) throw new Error(`user_version esperado ${CURRENT_SCHEMA_VERSION}, recebido ${version}`);

	const migration = database.prepare('SELECT version, name, app_version FROM schema_migrations WHERE version = ?').get(CURRENT_SCHEMA_VERSION);
	if (!migration) throw new Error(`schema_migrations não recebeu a versão ${CURRENT_SCHEMA_VERSION}`);
	if (migration.name !== BASELINE_MIGRATION_NAME || migration.app_version !== BASELINE_APP_VERSION) {
		throw new Error('schema_migrations recebeu metadados inesperados');
	}
}

function adoptVersionZeroDatabase() {
	const options = parseOptions(process.argv.slice(2));
	if (options.help) {
		printUsage();
		return;
	}

	const sourcePath = resolveInputPath(options.source ?? defaultSourcePath);
	const outputPath = resolveInputPath(options.output ?? defaultOutputPath);

	if (!fs.existsSync(sourcePath)) throw new Error(`Banco de origem não encontrado: ${sourcePath}`);
	if (path.resolve(sourcePath) === path.resolve(outputPath)) throw new Error('O arquivo de saída deve ser diferente do banco de origem.');

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	removeDatabaseFiles(outputPath);

	const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
	source.pragma('foreign_keys = ON');
	try {
		const sourceVersion = userVersion(source);
		if (sourceVersion > CURRENT_SCHEMA_VERSION) throw new Error(`Banco de origem tem schema futuro: user_version=${sourceVersion}`);
		assertCurrentDataSchema(source, 'Banco de origem');
		assertIntegrity(source, 'Banco de origem');
		source.exec(`VACUUM INTO ${quoteSqlString(outputPath)}`);
	} finally {
		source.close();
	}

	const output = new Database(outputPath, { fileMustExist: true });
	output.pragma('foreign_keys = ON');
	try {
		output.transaction(() => {
			stampSchemaVersion(output);
		})();
		assertCurrentDataSchema(output, 'Banco versionado');
		assertStamped(output);
		assertIntegrity(output, 'Banco versionado');
		output.pragma('optimize');

		console.log('\nBanco versionado criado:');
		console.log(`- Origem preservada: ${sourcePath}`);
		console.log(`- Saída: ${outputPath}`);
		console.log(`- Schema user_version: ${userVersion(output)}`);
		console.log(`- owners: ${countRows(output, 'owners')}`);
		console.log(`- pets: ${countRows(output, 'pets')}`);
		console.log(`- medical_records: ${countRows(output, 'medical_records')}`);
		console.log(`- pet_vaccinations: ${countRows(output, 'pet_vaccinations')}`);
		console.log(`- pet_antiparasitic_treatments: ${countRows(output, 'pet_antiparasitic_treatments')}`);
	} finally {
		output.close();
	}
}

try {
	adoptVersionZeroDatabase();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
