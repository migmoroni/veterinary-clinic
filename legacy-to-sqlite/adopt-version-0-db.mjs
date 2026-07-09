import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const CURRENT_SCHEMA_VERSION = 1;
const BASELINE_APP_VERSION = '0.2.0';
const BASELINE_MIGRATION_NAME = '0001_baseline_current_schema';
const PREFERENCE_SETTING_KEYS_TO_CLEAR = ['app.locale', 'app.typography'];
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const medicationDefaultsDir = path.resolve(scriptDir, '../src/lib/domain/medication/defaults');
const defaultSourcePath = path.resolve(scriptDir, 'dist/veterinary_clinic-version-0.db');
const defaultOutputPath = path.resolve(scriptDir, `build/veterinary_clinic-version-${CURRENT_SCHEMA_VERSION}.db`);

const sourceSchema = {
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
	pet_vaccinations: ['id', 'pet_id', 'applied_at', 'vaccine_name', 'vaccine_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after'],
	pet_antiparasitic_treatments: ['id', 'pet_id', 'applied_at', 'antiparasitic_name', 'antiparasitic_normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
};

const medicationCatalogColumns = ['id', 'kind', 'name', 'normalized_name', 'species', 'aliases', 'manufacturer', 'origin', 'regions', 'extension', 'hidden_at', 'created_at', 'updated_at'];

const medicationSchema = {
	catalog: medicationCatalogColumns,
	protocols: ['id', 'kind', 'origin', 'name', 'normalized_name', 'species', 'observation', 'sort_order', 'hidden_at', 'created_at', 'updated_at', 'deleted_at', 'purge_after'],
	protocolItems: ['id', 'protocol_id', 'catalog_item_id', 'sort_order', 'created_at', 'updated_at'],
	protocolDoses: ['id', 'protocol_id', 'dose', 'validity_value', 'validity_unit', 'sort_order', 'created_at', 'updated_at']
};

const medicationTableSets = {
	deprecated: {
		catalog: 'preventive_catalog_items',
		protocols: 'preventive_protocols',
		protocolItems: 'preventive_protocol_items',
		protocolDoses: 'preventive_protocol_doses'
	},
	current: {
		catalog: 'medication_catalog_items',
		protocols: 'medication_protocols',
		protocolItems: 'medication_protocol_items',
		protocolDoses: 'medication_protocol_doses'
	}
};

const versionedSchema = {
	...sourceSchema,
	medication_catalog_items: medicationSchema.catalog,
	medication_protocols: medicationSchema.protocols,
	medication_protocol_items: medicationSchema.protocolItems,
	medication_protocol_doses: medicationSchema.protocolDoses,
	breed_reference_items: ['id', 'breed_id', 'species', 'label_key', 'origin_id', 'origin_label_key', 'origin_country_code', 'origin_latitude', 'origin_longitude', 'size_category', 'average_weight_kg', 'average_height_cm', 'extension', 'created_at', 'updated_at'],
	pet_treatments: ['id', 'pet_id', 'kind', 'applied_at', 'name', 'normalized_name', 'dose', 'validity_value', 'validity_unit', 'observation', 'created_at', 'validity_ignored_at', 'updated_at', 'deleted_at', 'purge_after']
};
delete versionedSchema.pet_vaccinations;
delete versionedSchema.pet_antiparasitic_treatments;

const deprecatedTreatmentTables = ['pet_vaccinations', 'pet_antiparasitic_treatments'];
const deprecatedMedicationTables = ['preventive_catalog_items', 'preventive_protocols', 'preventive_protocol_items', 'preventive_protocol_doses'];

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

function normalizeMedicationCatalogName(value) {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function medicationCatalogKey(kind, normalizedName) {
	return `${kind}:${normalizedName}`;
}

function isUuidV4(value) {
	return UUID_V4_PATTERN.test(value);
}

function createMedicationCatalogUuid() {
	return crypto.randomUUID();
}

function readDefaultMedicationCatalogIdsByKey() {
	const idsByKey = new Map();
	for (const kind of ['vaccine', 'antiparasitic']) {
		const directory = path.join(medicationDefaultsDir, kind);
		if (!fs.existsSync(directory)) continue;

		for (const fileName of fs.readdirSync(directory).filter((candidate) => candidate.endsWith('.json')).sort()) {
			const filePath = path.join(directory, fileName);
			const item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
			if (typeof item.id !== 'string' || !isUuidV4(item.id)) throw new Error(`Medicamento padrão sem UUID v4: ${path.relative(scriptDir, filePath)}`);
			if (typeof item.name !== 'string' || !item.name.trim()) throw new Error(`Medicamento padrão sem nome: ${path.relative(scriptDir, filePath)}`);
			idsByKey.set(medicationCatalogKey(kind, normalizeMedicationCatalogName(item.name)), item.id);
		}
	}

	return idsByKey;
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

function assertDataSchema(database, label, schema) {
	const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
	const missingTables = Object.keys(schema).filter((table) => !tables.has(table));
	if (missingTables.length > 0) throw new Error(`${label} não tem as tabelas atuais esperadas: ${missingTables.join(', ')}`);

	const missingColumns = [];
	for (const [table, columns] of Object.entries(schema)) {
		const existingColumns = tableColumns(database, table);
		for (const column of columns) {
			if (!existingColumns.has(column)) missingColumns.push(`${table}.${column}`);
		}
	}
	if (missingColumns.length > 0) throw new Error(`${label} não tem as colunas atuais esperadas: ${missingColumns.join(', ')}`);
}

function detectMedicationSourceSchema(database, label) {
	const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
	const hasDeprecatedTables = Object.values(medicationTableSets.deprecated).every((table) => tables.has(table));
	const hasCurrentTables = Object.values(medicationTableSets.current).every((table) => tables.has(table));

	if (hasDeprecatedTables && hasCurrentTables) throw new Error(`${label} mistura tabelas preventive_* e medication_* para medicamentos.`);
	if (!hasDeprecatedTables && !hasCurrentTables) throw new Error(`${label} não tem as tabelas de medicamentos esperadas.`);

	const tableSetKey = hasDeprecatedTables ? 'deprecated' : 'current';
	const tableSet = medicationTableSets[tableSetKey];
	const expectedColumnsByKey = {
		catalog: medicationSchema.catalog,
		protocols: medicationSchema.protocols,
		protocolItems: medicationSchema.protocolItems,
		protocolDoses: medicationSchema.protocolDoses
	};
	const missingColumns = [];

	for (const [key, table] of Object.entries(tableSet)) {
		const existingColumns = tableColumns(database, table);
		for (const column of expectedColumnsByKey[key]) {
			if (key === 'catalog' && column === 'extension') continue;
			if (!existingColumns.has(column)) missingColumns.push(`${table}.${column}`);
		}
	}
	if (missingColumns.length > 0) throw new Error(`${label} não tem as colunas de medicamentos esperadas: ${missingColumns.join(', ')}`);

	return tableSetKey;
}

function ensureMedicationCatalogExtensionColumn(database) {
	const columns = tableColumns(database, 'medication_catalog_items');
	if (columns.has('extension')) return;

	database.exec("ALTER TABLE medication_catalog_items ADD COLUMN extension TEXT NOT NULL DEFAULT '{}'");
}

function convertMedicationCatalogIdsToUuidV4(database) {
	const catalogRows = database
		.prepare(
			`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, extension, hidden_at, created_at, updated_at
			 FROM medication_catalog_items
			 ORDER BY id`
		)
		.all();
	if (catalogRows.length === 0) return;

	const defaultMedicationCatalogIdsByKey = readDefaultMedicationCatalogIdsByKey();
	const idByOldId = new Map();
	const convertedCatalogRows = catalogRows.map((row) => {
		const normalizedName = normalizeMedicationCatalogName(row.normalized_name);
		const currentId = String(row.id);
		const defaultId = row.origin === 'system' ? defaultMedicationCatalogIdsByKey.get(medicationCatalogKey(row.kind, normalizedName)) : null;
		const id = defaultId ?? (isUuidV4(currentId) ? currentId : createMedicationCatalogUuid());
		idByOldId.set(String(row.id), id);
		return { ...row, id, extension: row.extension ?? '{}' };
	});
	const protocolItemRows = database
		.prepare('SELECT id, protocol_id, catalog_item_id, sort_order, created_at, updated_at FROM medication_protocol_items ORDER BY id')
		.all();
	const imageCollectionRows = database
		.prepare('SELECT id, entity_type, entity_id, primary_required, max_items, created_at, updated_at FROM image_collections ORDER BY id')
		.all();

	database.exec(`
		DROP TABLE IF EXISTS medication_catalog_items_uuid;

		CREATE TABLE medication_catalog_items_uuid (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(length(trim(species)) > 0),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) > 0),
			manufacturer TEXT,
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) > 0),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) > 0),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(kind, normalized_name)
		);
	`);

	const insertCatalogItem = database.prepare(`
		INSERT INTO medication_catalog_items_uuid (
			id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, extension, hidden_at, created_at, updated_at
		) VALUES (
			@id, @kind, @name, @normalized_name, @species, @aliases, @manufacturer, @origin, @regions, @extension, @hidden_at, @created_at, @updated_at
		)
	`);
	for (const row of convertedCatalogRows) insertCatalogItem.run(row);

	database.exec(`
		DROP INDEX IF EXISTS idx_medication_protocol_items_protocol_id;
		DROP INDEX IF EXISTS idx_medication_protocol_items_catalog_item_id;
		DROP INDEX IF EXISTS idx_medication_catalog_items_kind_name;
		DROP INDEX IF EXISTS idx_medication_catalog_items_kind_normalized_name;
		DROP INDEX IF EXISTS idx_medication_catalog_items_hidden_at;
		DROP TABLE medication_protocol_items;
		DROP TABLE medication_catalog_items;
		ALTER TABLE medication_catalog_items_uuid RENAME TO medication_catalog_items;

		CREATE TABLE medication_protocol_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			protocol_id INTEGER NOT NULL,
			catalog_item_id TEXT NOT NULL CHECK(length(trim(catalog_item_id)) = 36 AND substr(lower(trim(catalog_item_id)), 15, 1) = '4' AND substr(lower(trim(catalog_item_id)), 20, 1) IN ('8', '9', 'a', 'b')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES medication_protocols(id) ON DELETE CASCADE,
			FOREIGN KEY (catalog_item_id) REFERENCES medication_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		);
	`);

	const insertProtocolItem = database.prepare(`
		INSERT INTO medication_protocol_items (id, protocol_id, catalog_item_id, sort_order, created_at, updated_at)
		VALUES (@id, @protocol_id, @catalog_item_id, @sort_order, @created_at, @updated_at)
	`);
	for (const row of protocolItemRows) {
		const catalogItemId = idByOldId.get(String(row.catalog_item_id));
		if (!catalogItemId) throw new Error(`Protocolo aponta para medicamento inexistente: ${row.catalog_item_id}`);
		insertProtocolItem.run({ ...row, catalog_item_id: catalogItemId });
	}

	database.exec(`
		DROP TABLE IF EXISTS image_collection_items_uuid;
		DROP TABLE IF EXISTS image_collections_uuid;

		CREATE TABLE image_collections_uuid (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			entity_type TEXT NOT NULL CHECK(length(trim(entity_type)) > 0),
			entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(entity_type, entity_id)
		);
	`);

	const insertImageCollection = database.prepare(`
		INSERT INTO image_collections_uuid (id, entity_type, entity_id, primary_required, max_items, created_at, updated_at)
		VALUES (@id, @entity_type, @entity_id, @primary_required, @max_items, @created_at, @updated_at)
	`);
	for (const row of imageCollectionRows) {
		const entityId = row.entity_type === 'medication_catalog_item' ? (idByOldId.get(String(row.entity_id)) ?? String(row.entity_id)) : String(row.entity_id);
		insertImageCollection.run({ ...row, entity_id: entityId });
	}

	database.exec(`
		CREATE TABLE image_collection_items_uuid (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			collection_id INTEGER NOT NULL,
			image_blob BLOB NOT NULL CHECK(length(image_blob) > 0),
			original_image_blob BLOB NOT NULL CHECK(length(original_image_blob) > 0),
			description TEXT,
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections_uuid(id) ON DELETE CASCADE
		);

		INSERT INTO image_collection_items_uuid (
			id, collection_id, image_blob, original_image_blob, description, is_primary, sort_order, created_at, updated_at
		)
		SELECT id, collection_id, image_blob, original_image_blob, description, is_primary, sort_order, created_at, updated_at
		FROM image_collection_items
		ORDER BY id;

		DROP INDEX IF EXISTS idx_image_collections_entity;
		DROP INDEX IF EXISTS idx_image_collection_items_collection_id;
		DROP INDEX IF EXISTS idx_image_collection_items_primary;
		DROP TABLE image_collection_items;
		DROP TABLE image_collections;
		ALTER TABLE image_collections_uuid RENAME TO image_collections;
		ALTER TABLE image_collection_items_uuid RENAME TO image_collection_items;

		CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id);
		CREATE INDEX IF NOT EXISTS idx_image_collection_items_collection_id ON image_collection_items(collection_id, sort_order, id);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1;
	`);
}

function assertNoDeprecatedTreatmentTables(database, label) {
	const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
	const deprecatedTables = deprecatedTreatmentTables.filter((table) => tables.has(table));
	if (deprecatedTables.length > 0) throw new Error(`${label} ainda contém tabelas substituídas: ${deprecatedTables.join(', ')}`);
}

function assertNoDeprecatedMedicationTables(database, label) {
	const tables = new Set(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name));
	const deprecatedTables = deprecatedMedicationTables.filter((table) => tables.has(table));
	if (deprecatedTables.length > 0) throw new Error(`${label} ainda contém tabelas preventivas substituídas: ${deprecatedTables.join(', ')}`);
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

function countTreatments(database, kind) {
	return database.prepare('SELECT COUNT(*) AS total FROM pet_treatments WHERE kind = ?').get(kind).total;
}

function migrateTreatmentTables(database) {
	const originalVaccinationRows = countRows(database, 'pet_vaccinations');
	const originalAntiparasiticRows = countRows(database, 'pet_antiparasitic_treatments');

	database.exec(`
		DROP TABLE IF EXISTS pet_treatments;

		CREATE TABLE pet_treatments (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pet_id INTEGER NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			applied_at TEXT NOT NULL DEFAULT CURRENT_DATE,
			name TEXT NOT NULL CHECK(length(trim(name)) > 0),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
			dose TEXT NOT NULL CHECK(length(trim(dose)) > 0),
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			validity_ignored_at TEXT,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT
		);

		INSERT INTO pet_treatments (
			pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation,
			created_at, validity_ignored_at, updated_at, deleted_at, purge_after
		)
		SELECT
			pet_id, 'vaccine', applied_at, vaccine_name, vaccine_normalized_name, dose, validity_value, validity_unit, observation,
			COALESCE(created_at, CURRENT_TIMESTAMP), validity_ignored_at, updated_at, deleted_at, purge_after
		FROM pet_vaccinations
		ORDER BY id;

		INSERT INTO pet_treatments (
			pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation,
			created_at, validity_ignored_at, updated_at, deleted_at, purge_after
		)
		SELECT
			pet_id, 'antiparasitic', applied_at, antiparasitic_name, antiparasitic_normalized_name, dose, validity_value, validity_unit, observation,
			COALESCE(created_at, CURRENT_TIMESTAMP), validity_ignored_at, updated_at, deleted_at, purge_after
		FROM pet_antiparasitic_treatments
		ORDER BY id;

		DROP TABLE pet_vaccinations;
		DROP TABLE pet_antiparasitic_treatments;

		CREATE INDEX IF NOT EXISTS idx_pet_treatments_pet_id ON pet_treatments(pet_id);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_kind_applied_at ON pet_treatments(kind, applied_at);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_kind_normalized_name ON pet_treatments(kind, normalized_name);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_latest_active ON pet_treatments(kind, pet_id, normalized_name, applied_at DESC, id DESC) WHERE deleted_at IS NULL AND validity_ignored_at IS NULL;
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_validity_ignored_at ON pet_treatments(validity_ignored_at);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_deleted_at ON pet_treatments(deleted_at);
	`);

	return { originalVaccinationRows, originalAntiparasiticRows };
}

function migrateMedicationTables(database) {
	const tableSetKey = detectMedicationSourceSchema(database, 'Banco intermediário');
	const sourceTables = medicationTableSets[tableSetKey];
	const originalCatalogRows = countRows(database, sourceTables.catalog);
	const originalProtocolRows = countRows(database, sourceTables.protocols);

	if (tableSetKey === 'deprecated') {
		database.exec(`
			ALTER TABLE preventive_catalog_items RENAME TO medication_catalog_items;
			ALTER TABLE preventive_protocols RENAME TO medication_protocols;
			ALTER TABLE preventive_protocol_items RENAME TO medication_protocol_items;
			ALTER TABLE preventive_protocol_doses RENAME TO medication_protocol_doses;
		`);
	}
	ensureMedicationCatalogExtensionColumn(database);
	convertMedicationCatalogIdsToUuidV4(database);

	database.exec(`
		DROP INDEX IF EXISTS idx_preventive_catalog_items_kind_name;
		DROP INDEX IF EXISTS idx_preventive_catalog_items_kind_normalized_name;
		DROP INDEX IF EXISTS idx_preventive_catalog_items_hidden_at;
		DROP INDEX IF EXISTS idx_preventive_protocols_kind_name;
		DROP INDEX IF EXISTS idx_preventive_protocols_kind_normalized_name;
		DROP INDEX IF EXISTS idx_preventive_protocols_hidden_at;
		DROP INDEX IF EXISTS idx_preventive_protocols_deleted_at;
		DROP INDEX IF EXISTS idx_preventive_protocol_items_protocol_id;
		DROP INDEX IF EXISTS idx_preventive_protocol_items_catalog_item_id;
		DROP INDEX IF EXISTS idx_preventive_protocol_doses_protocol_id;

		CREATE INDEX IF NOT EXISTS idx_medication_catalog_items_kind_name ON medication_catalog_items(kind, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_medication_catalog_items_kind_normalized_name ON medication_catalog_items(kind, normalized_name);
		CREATE INDEX IF NOT EXISTS idx_medication_catalog_items_hidden_at ON medication_catalog_items(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_medication_protocols_kind_name ON medication_protocols(kind, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_medication_protocols_kind_normalized_name ON medication_protocols(kind, normalized_name);
		CREATE INDEX IF NOT EXISTS idx_medication_protocols_hidden_at ON medication_protocols(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_medication_protocols_deleted_at ON medication_protocols(deleted_at);
		CREATE INDEX IF NOT EXISTS idx_medication_protocol_items_protocol_id ON medication_protocol_items(protocol_id);
		CREATE INDEX IF NOT EXISTS idx_medication_protocol_items_catalog_item_id ON medication_protocol_items(catalog_item_id);
		CREATE INDEX IF NOT EXISTS idx_medication_protocol_doses_protocol_id ON medication_protocol_doses(protocol_id);
	`);

	return { originalCatalogRows, originalProtocolRows };
}

function ensureBreedReferenceTable(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS breed_reference_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			breed_id TEXT NOT NULL CHECK(length(trim(breed_id)) > 0),
			species TEXT NOT NULL CHECK(species IN ('canine', 'feline')),
			label_key TEXT NOT NULL CHECK(length(trim(label_key)) > 0),
			origin_id TEXT NOT NULL CHECK(length(trim(origin_id)) > 0),
			origin_label_key TEXT,
			origin_country_code TEXT,
			origin_latitude REAL,
			origin_longitude REAL,
			size_category TEXT NOT NULL CHECK(size_category IN ('small', 'medium', 'large', 'giant')),
			average_weight_kg TEXT NOT NULL CHECK(length(trim(average_weight_kg)) > 0),
			average_height_cm TEXT NOT NULL CHECK(length(trim(average_height_cm)) > 0),
			extension TEXT NOT NULL DEFAULT '{}',
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(breed_id),
			CHECK((origin_latitude IS NULL AND origin_longitude IS NULL) OR (origin_latitude BETWEEN -90 AND 90 AND origin_longitude BETWEEN -180 AND 180))
		);

		CREATE INDEX IF NOT EXISTS idx_breed_reference_items_species_label ON breed_reference_items(species, label_key COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_breed_reference_items_origin_id ON breed_reference_items(origin_id);
	`);
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

function clearSavedPreferences(database) {
	const placeholders = PREFERENCE_SETTING_KEYS_TO_CLEAR.map(() => '?').join(', ');
	return database
		.prepare(`DELETE FROM app_settings WHERE key IN (${placeholders})`)
		.run(...PREFERENCE_SETTING_KEYS_TO_CLEAR).changes;
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
		assertDataSchema(source, 'Banco de origem', sourceSchema);
		detectMedicationSourceSchema(source, 'Banco de origem');
		assertIntegrity(source, 'Banco de origem');
		source.exec(`VACUUM INTO ${quoteSqlString(outputPath)}`);
	} finally {
		source.close();
	}

	const output = new Database(outputPath, { fileMustExist: true });
	output.pragma('foreign_keys = ON');
	try {
		let clearedPreferenceSettings = 0;
		let treatmentMigration = { originalVaccinationRows: 0, originalAntiparasiticRows: 0 };
		let medicationMigration = { originalCatalogRows: 0, originalProtocolRows: 0 };
		output.transaction(() => {
			medicationMigration = migrateMedicationTables(output);
			treatmentMigration = migrateTreatmentTables(output);
			ensureBreedReferenceTable(output);
			stampSchemaVersion(output);
			clearedPreferenceSettings = clearSavedPreferences(output);
		})();
		assertDataSchema(output, 'Banco versionado', versionedSchema);
		assertNoDeprecatedMedicationTables(output, 'Banco versionado');
		assertNoDeprecatedTreatmentTables(output, 'Banco versionado');
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
		console.log(`- medication_catalog_items: ${countRows(output, 'medication_catalog_items')} de ${medicationMigration.originalCatalogRows}`);
		console.log(`- medication_protocols: ${countRows(output, 'medication_protocols')} de ${medicationMigration.originalProtocolRows}`);
		console.log(`- breed_reference_items: ${countRows(output, 'breed_reference_items')}`);
		console.log(`- pet_treatments: ${countRows(output, 'pet_treatments')}`);
		console.log(`  - vaccine: ${countTreatments(output, 'vaccine')} de ${treatmentMigration.originalVaccinationRows}`);
		console.log(`  - antiparasitic: ${countTreatments(output, 'antiparasitic')} de ${treatmentMigration.originalAntiparasiticRows}`);
		console.log(`- preferências removidas: ${clearedPreferenceSettings}`);
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
