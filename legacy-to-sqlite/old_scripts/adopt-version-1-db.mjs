import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const CURRENT_SCHEMA_VERSION = 1;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourcePath = path.resolve(scriptDir, 'build/veterinary_clinic-version-1.db');
const defaultOutputPath = path.resolve(scriptDir, 'build/veterinary_clinic-version-1.user.db');

const productTypeValues = {
	medication: {
		vaccine: JSON.stringify(['product', 'medication', 'biologicalAndImmunological', 'vaccine']),
		antiparasitic: JSON.stringify(['product', 'medication', 'antiparasitic', null]),
		antimicrobial: JSON.stringify(['product', 'medication', 'antimicrobial', null]),
		therapeutical: JSON.stringify(['product', 'medication', 'internalMedicine', null]),
		anesthetic: JSON.stringify(['product', 'medication', 'anestheticAndControlled', null])
	},
	nutrition: {
		maintenance: JSON.stringify(['product', 'nutrition', 'completeDiet', null]),
		therapeutic: JSON.stringify(['product', 'nutrition', 'prescriptionDiet', null]),
		supplement: JSON.stringify(['product', 'nutrition', 'supplementAndNutraceutical', null])
	},
	hygiene: {
		cosmetic: JSON.stringify(['product', 'hygieneAndAesthetics', 'coatAndSkin', null]),
		dermatological: JSON.stringify(['product', 'hygieneAndAesthetics', 'coatAndSkin', 'medicatedShampoo'])
	},
	environment: {
		disinfectant: JSON.stringify(['product', 'environmentAndSanitation', 'facilitySanitizer', 'hospitalDisinfectant']),
		repellent: JSON.stringify(['product', 'environmentAndSanitation', 'environmentalPestControl', 'repellent'])
	},
	consumable: {
		surgical: JSON.stringify(['product', 'clinicalConsumable', 'woundAndSurgicalCare', 'sutureMaterial']),
		disposable: JSON.stringify(['product', 'clinicalConsumable', 'injectionAndInfusion', 'syringeAndNeedle'])
	}
};
const productTypeSqlValues = Object.values(productTypeValues)
	.flatMap((subtypes) => Object.values(subtypes))
	.map(quoteSqlString)
	.join(', ');
const productCompositionOrigins = ['allopathic', 'phytotherapeutic', 'homeopathic', 'biological'];
const productCommercialCategories = ['reference', 'generic', 'similar', 'compounded', 'nonApplicable'];
const productTherapeuticActions = ['prophylactic', 'curative', 'palliative', 'control'];
const productPharmaceuticalForms = ['tablet', 'palatableTablet', 'capsule', 'powder', 'oralSuspension', 'injectableSolution', 'spotOn', 'pourOn', 'ointmentOrCream', 'solution', 'shampoo', 'soapOrBar', 'collar', 'feedOrKibble', 'deviceOrConsumable', 'nonApplicable'];
const productAdministrationRoutes = ['oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 'otic', 'ophthalmic', 'intranasal', 'epidural', 'intraarticular', 'inhaled', 'rectal', 'nonApplicable'];
const productPharmaceuticalFormReplacements = new Map([
	['oticOintment', 'ointmentOrCream'],
	['ophthalmicSolution', 'solution'],
	['topicalSpray', 'solution']
]);
const emptyProductCommercialTherapeutic = { compositionOrigin: null, commercialCategory: null, therapeuticAction: null };
const emptyProductForm = { pharmaceuticalForm: null, administrationRoutes: [], presentationDosage: null };
const emptyProductRegulatoryIdentifiers = { brazilMapa: null, unitedStatesNada: null, unitedStatesAnada: null, gtinEan: null };
const retiredUserTables = [
	'tag_assignments',
	'tags',
	'vaccine_dose_options',
	'vaccine_dose_types',
	'vaccine_preset_doses',
	'vaccine_presets',
	'vaccine_protocols',
	'vaccine_validity_options',
	'vaccines'
];
const storedCatalogTypeReplacements = new Map([
	[JSON.stringify(['medication', 'vaccine']), productTypeValues.medication.vaccine],
	[JSON.stringify(['medication', 'antiparasitic']), productTypeValues.medication.antiparasitic],
	[JSON.stringify(['product', 'medication', 'vaccine']), productTypeValues.medication.vaccine],
	[JSON.stringify(['product', 'medication', 'antiparasitic']), productTypeValues.medication.antiparasitic],
	[JSON.stringify(['nutrition', null]), productTypeValues.nutrition.maintenance],
	[JSON.stringify(['hygiene', null]), productTypeValues.hygiene.cosmetic],
	[JSON.stringify(['disinfectants', null]), productTypeValues.environment.disinfectant],
	[JSON.stringify(['product', 'nutrition', null]), productTypeValues.nutrition.maintenance],
	[JSON.stringify(['product', 'hygiene', null]), productTypeValues.hygiene.cosmetic],
	[JSON.stringify(['product', 'disinfectants', null]), productTypeValues.environment.disinfectant]
]);

function printUsage() {
	console.log(`Uso:
  node legacy-to-sqlite/adopt-version-1-db.mjs
  node legacy-to-sqlite/adopt-version-1-db.mjs --source build/veterinary_clinic-version-1.db --output build/veterinary_clinic-version-1.user.db

Opções:
  --source, -s   Banco v1 gerado pelo script anterior
  --output, -o   Cópia de saída, mantendo user_version = 1
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

function normalizeName(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function normalizedNullableText(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizedEnum(value, options) {
	return typeof value === 'string' && options.includes(value) ? value : null;
}

function normalizedProductPharmaceuticalForm(value) {
	if (typeof value !== 'string') return null;
	return normalizedEnum(productPharmaceuticalFormReplacements.get(value) ?? value, productPharmaceuticalForms);
}

function normalizedEnumList(value, options) {
	if (!Array.isArray(value)) return [];
	const normalized = [];
	for (const item of value) {
		const option = normalizedEnum(item, options);
		if (option && !normalized.includes(option)) normalized.push(option);
	}
	return normalized;
}

function normalizedTextList(value) {
	if (!Array.isArray(value)) return [];
	const normalized = [];
	for (const item of value) {
		const text = normalizedNullableText(item);
		if (text && !normalized.includes(text)) normalized.push(text);
	}
	return normalized;
}

function normalizeProductForm(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductForm, administrationRoutes: [] };
	return {
		pharmaceuticalForm: normalizedProductPharmaceuticalForm(value.pharmaceuticalForm),
		administrationRoutes: normalizedEnumList(value.administrationRoutes, productAdministrationRoutes),
		presentationDosage: normalizedNullableText(value.presentationDosage)
	};
}

function normalizeProductCommercialTherapeutic(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductCommercialTherapeutic };
	return {
		compositionOrigin: normalizedEnum(value.compositionOrigin, productCompositionOrigins),
		commercialCategory: normalizedEnum(value.commercialCategory, productCommercialCategories),
		therapeuticAction: normalizedEnum(value.therapeuticAction, productTherapeuticActions)
	};
}

function normalizeProductTargetSpecies(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { warnings: [] };
	return {
		warnings: normalizedTextList(value.warnings)
	};
}

function normalizeProductRegulatoryIdentifiers(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyProductRegulatoryIdentifiers };
	return {
		brazilMapa: normalizedNullableText(value.brazilMapa),
		unitedStatesNada: normalizedNullableText(value.unitedStatesNada),
		unitedStatesAnada: normalizedNullableText(value.unitedStatesAnada),
		gtinEan: normalizedNullableText(value.gtinEan)
	};
}

function normalizeProductClassification(value, legacySource = {}) {
	if (Array.isArray(value)) {
		return {
			commercialTherapeutic: {
				compositionOrigin: normalizedEnum(value[0], productCompositionOrigins),
				commercialCategory: normalizedEnum(value[1], productCommercialCategories),
				therapeuticAction: normalizedEnum(value[2], productTherapeuticActions)
			},
			formAndAdministration: normalizeProductForm(legacySource.form),
			targetSpecies: { warnings: normalizedTextList(legacySource.targetSpeciesWarnings) },
			regulatoryIdentifiers: normalizeProductRegulatoryIdentifiers(legacySource.regulatoryIdentifiers)
		};
	}

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {
			commercialTherapeutic: { ...emptyProductCommercialTherapeutic },
			formAndAdministration: { ...emptyProductForm, administrationRoutes: [] },
			targetSpecies: { warnings: [] },
			regulatoryIdentifiers: { ...emptyProductRegulatoryIdentifiers }
		};
	}

	return {
		commercialTherapeutic: normalizeProductCommercialTherapeutic(value.commercialTherapeutic),
		formAndAdministration: normalizeProductForm(value.formAndAdministration),
		targetSpecies: normalizeProductTargetSpecies(value.targetSpecies),
		regulatoryIdentifiers: normalizeProductRegulatoryIdentifiers(value.regulatoryIdentifiers)
	};
}

function normalizeProductExtension(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { classification: normalizeProductClassification(null), commercialLine: null, sections: {} };
	const source = value;
	return {
		classification: normalizeProductClassification(source.classification, source),
		commercialLine: normalizedNullableText(source.commercialLine),
		sections: source.sections && typeof source.sections === 'object' && !Array.isArray(source.sections) ? source.sections : {}
	};
}

function normalizeProductExtensionText(value) {
	try {
		return JSON.stringify(normalizeProductExtension(JSON.parse(value || '{}')));
	} catch {
		return JSON.stringify(normalizeProductExtension(null));
	}
}

function slug(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'item';
}

function isUuidV4(value) {
	return UUID_V4_PATTERN.test(String(value ?? ''));
}

function tableExists(database, table) {
	return Boolean(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(table));
}

function tableColumns(database, table) {
	return database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all().map((row) => row.name);
}

function hasColumn(database, table, column) {
	return tableExists(database, table) && tableColumns(database, table).includes(column);
}

function createUserCatalogTables(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS user_product_catalog_items (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${productTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(length(trim(species)) BETWEEN 1 AND 256),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			manufacturer_id TEXT,
			manufacturer_name TEXT CHECK(manufacturer_name IS NULL OR length(manufacturer_name) <= 120),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);
	`);
}

function normalizeStoredCatalogType(type, fallbackType) {
	if (typeof type !== 'string' || !type.trim()) return fallbackType;
	return storedCatalogTypeReplacements.get(type) ?? type;
}

function readManufacturerNamesById(database) {
	if (!tableExists(database, 'manufacturer_catalog_items')) return new Map();
	return new Map(
		database
			.prepare('SELECT id, name FROM manufacturer_catalog_items')
			.all()
			.map((row) => [row.id, normalizedNullableText(row.name)])
			.filter(([, name]) => Boolean(name))
	);
}

function rebuildProductCatalog(database) {
	const manufacturerNamesById = readManufacturerNamesById(database);
	const rows = [
		...(tableExists(database, 'user_product_catalog_items') ? database.prepare('SELECT * FROM user_product_catalog_items ORDER BY name COLLATE NOCASE').all() : []),
		...(tableExists(database, 'product_catalog_items') ? database.prepare('SELECT * FROM product_catalog_items ORDER BY name COLLATE NOCASE').all() : [])
	];

	database.exec(`
		DROP TABLE IF EXISTS user_product_catalog_items_next;
		CREATE TABLE user_product_catalog_items_next (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${productTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(length(trim(species)) BETWEEN 1 AND 256),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			manufacturer_id TEXT,
			manufacturer_name TEXT CHECK(manufacturer_name IS NULL OR length(manufacturer_name) <= 120),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);
	`);

	const insert = database.prepare(`
		INSERT INTO user_product_catalog_items_next (
			id, type, name, normalized_name, species, aliases, manufacturer_id, manufacturer_name, regions, extension, hidden_at, created_at, updated_at
		)
		VALUES (@id, @type, @name, @normalized_name, @species, @aliases, @manufacturer_id, @manufacturer_name, @regions, @extension, @hidden_at, @created_at, @updated_at)
	`);

	for (const row of rows) {
		if (row.origin === 'system') continue;
		const manufacturerId = isUuidV4(row.manufacturer_id) ? row.manufacturer_id : null;
		const manufacturerName =
			normalizedNullableText(row.manufacturer_name) ??
			normalizedNullableText(row.manufacturer) ??
			(manufacturerId ? manufacturerNamesById.get(manufacturerId) : null) ??
			null;
		insert.run({
			id: isUuidV4(row.id) ? row.id : crypto.randomUUID(),
			type: normalizeStoredCatalogType(row.type, productTypeValues.medication.vaccine),
			name: row.name,
			normalized_name: row.normalized_name || normalizeName(row.name),
			species: row.species || '["canine","feline"]',
			aliases: row.aliases || '[]',
			manufacturer_id: manufacturerId,
			manufacturer_name: manufacturerName,
			regions: row.regions || '[]',
			extension: normalizeProductExtensionText(row.extension),
			hidden_at: row.hidden_at ?? null,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}

	database.exec(`
		DROP TABLE IF EXISTS user_product_catalog_items;
		ALTER TABLE user_product_catalog_items_next RENAME TO user_product_catalog_items;
	`);
}

function rebuildTreatmentProtocolItems(database) {
	if (!tableExists(database, 'treatment_protocol_items')) return;
	const rows = database.prepare('SELECT * FROM treatment_protocol_items ORDER BY protocol_id, sort_order, id').all();
	database.exec(`
		DROP TABLE IF EXISTS treatment_protocol_items_next;
		CREATE TABLE treatment_protocol_items_next (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			protocol_id TEXT NOT NULL,
			catalog_item_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		);
	`);
	const protocolExists = database.prepare('SELECT id FROM treatment_protocols WHERE id = ? LIMIT 1');
	const insert = database.prepare(`
		INSERT OR IGNORE INTO treatment_protocol_items_next (id, protocol_id, catalog_item_id, sort_order, created_at, updated_at)
		VALUES (@id, @protocol_id, @catalog_item_id, @sort_order, @created_at, @updated_at)
	`);
	for (const row of rows) {
		if (!protocolExists.get(row.protocol_id)) continue;
		insert.run({
			id: row.id,
			protocol_id: row.protocol_id,
			catalog_item_id: row.catalog_item_id,
			sort_order: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : 0,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}
	database.exec(`
		DROP TABLE IF EXISTS treatment_protocol_items;
		ALTER TABLE treatment_protocol_items_next RENAME TO treatment_protocol_items;
	`);
}

function deleteImageCollectionsForEntitySubquery(database, entityType, entityIdSubquery) {
	if (!tableExists(database, 'image_collections') || !tableExists(database, 'image_collection_items')) return;
	database.exec(`
		DELETE FROM image_collection_items
		WHERE collection_id IN (
			SELECT id
			FROM image_collections
			WHERE entity_type = ${quoteSqlString(entityType)}
				AND entity_id IN (${entityIdSubquery})
		);
		DELETE FROM image_collections
		WHERE entity_type = ${quoteSqlString(entityType)}
			AND entity_id IN (${entityIdSubquery});
	`);
}

function removeSystemReferenceData(database) {
	if (tableExists(database, 'breed_reference_items')) {
		deleteImageCollectionsForEntitySubquery(database, 'breed_reference_item', 'SELECT CAST(id AS TEXT) FROM breed_reference_items');
	}
	if (tableExists(database, 'product_catalog_items')) {
		if (hasColumn(database, 'product_catalog_items', 'origin')) {
			deleteImageCollectionsForEntitySubquery(database, 'product_catalog_item', "SELECT id FROM product_catalog_items WHERE origin = 'system'");
		}
	}
	if (tableExists(database, 'manufacturer_catalog_items')) {
		deleteImageCollectionsForEntitySubquery(database, 'manufacturer_catalog_item', 'SELECT id FROM manufacturer_catalog_items');
	}
	if (tableExists(database, 'active_ingredient_catalog_items')) {
		deleteImageCollectionsForEntitySubquery(database, 'active_ingredient_catalog_item', 'SELECT id FROM active_ingredient_catalog_items');
	}
	if (tableExists(database, 'condition_catalog_items')) {
		deleteImageCollectionsForEntitySubquery(database, 'condition_catalog_item', 'SELECT id FROM condition_catalog_items');
	}

	if (tableExists(database, 'treatment_protocols')) {
		database.exec(`
			DELETE FROM treatment_protocol_doses WHERE protocol_id IN (SELECT id FROM treatment_protocols WHERE origin = 'system');
			DELETE FROM treatment_protocol_items WHERE protocol_id IN (SELECT id FROM treatment_protocols WHERE origin = 'system');
			DELETE FROM treatment_protocols WHERE origin = 'system';
		`);
		rebuildTreatmentProtocolItems(database);
		if (tableExists(database, 'treatment_protocol_doses')) {
			database.exec('DELETE FROM treatment_protocol_doses WHERE protocol_id NOT IN (SELECT id FROM treatment_protocols)');
		}
	}

	if (tableExists(database, 'product_active_ingredients')) database.exec('DROP TABLE IF EXISTS product_active_ingredients');
	if (tableExists(database, 'product_catalog_items')) database.exec('DROP TABLE IF EXISTS product_catalog_items');
	if (tableExists(database, 'breed_reference_items')) database.exec('DROP TABLE IF EXISTS breed_reference_items');
	if (tableExists(database, 'condition_catalog_items')) database.exec('DROP TABLE IF EXISTS condition_catalog_items');
	if (tableExists(database, 'active_ingredient_catalog_items')) database.exec('DROP TABLE IF EXISTS active_ingredient_catalog_items');
	if (tableExists(database, 'manufacturer_catalog_items')) database.exec('DROP TABLE IF EXISTS manufacturer_catalog_items');
	for (const table of retiredUserTables) {
		database.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`);
	}
}

function createIndexes(database) {
	database.exec(`
		CREATE INDEX IF NOT EXISTS idx_user_product_catalog_items_type_name ON user_product_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_user_product_catalog_items_type_normalized_name ON user_product_catalog_items(type, normalized_name);
		CREATE INDEX IF NOT EXISTS idx_user_product_catalog_items_manufacturer_id ON user_product_catalog_items(manufacturer_id);
		CREATE INDEX IF NOT EXISTS idx_user_product_catalog_items_hidden_at ON user_product_catalog_items(hidden_at);
	`);
}

function adoptDatabase(sourcePath, outputPath) {
	if (!fs.existsSync(sourcePath)) throw new Error(`Banco de origem não encontrado: ${sourcePath}`);
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	if (path.resolve(sourcePath) !== path.resolve(outputPath)) fs.copyFileSync(sourcePath, outputPath);

	const database = new Database(outputPath);
	database.pragma('foreign_keys = OFF');

	try {
		database.transaction(() => {
			createUserCatalogTables(database);
			rebuildProductCatalog(database);
			removeSystemReferenceData(database);
			createIndexes(database);
			database.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
		})();
		database.pragma('foreign_keys = ON');
		const foreignKeyErrors = database.prepare('PRAGMA foreign_key_check').all();
		if (foreignKeyErrors.length > 0) throw new Error(`Falha em foreign_key_check: ${JSON.stringify(foreignKeyErrors.slice(0, 5))}`);
		database.pragma('wal_checkpoint(TRUNCATE)');
	} finally {
		database.close();
	}
}

try {
	const options = parseOptions(process.argv.slice(2));
	if (options.help) {
		printUsage();
		process.exit(0);
	}

	const sourcePath = resolveInputPath(options.source ?? defaultSourcePath);
	const outputPath = resolveInputPath(options.output ?? defaultOutputPath);
	adoptDatabase(sourcePath, outputPath);
	console.log(`Banco v1 do usuário atualizado sem dados do sistema: ${path.relative(scriptDir, outputPath)}`);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
