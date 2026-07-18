import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const CURRENT_SCHEMA_VERSION = 1;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultSourcePath = path.resolve(scriptDir, 'build/veterinary_clinic-version-1.db');
const defaultOutputPath = path.resolve(scriptDir, 'build/veterinary_clinic-version-1.catalog.db');
const catalogDefaultsDir = path.resolve(scriptDir, '../src/lib/catalog/defaults');
const productDefaultsDir = path.join(catalogDefaultsDir, 'products');
const manufacturerDefaultsDir = path.join(catalogDefaultsDir, 'manufacturers');
const activeIngredientDefaultsDir = path.join(catalogDefaultsDir, 'active-ingredients');
const conditionDefaultsDir = path.join(catalogDefaultsDir, 'conditions');

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
const manufacturerTypeValue = JSON.stringify(['manufacturer', 'veterinaryIndustrial', 'veterinaryIndustrialLaboratory']);
const activeIngredientTypeValues = {
	substance: JSON.stringify(['activeIngredient', 'antiInfective', 'antiparasitic', 'macrocyclicLactones']),
	combination: JSON.stringify(['activeIngredient', 'antiInfective', 'antibacterial', 'macrolides'])
};
const activeIngredientTypeSqlValues = Object.values(activeIngredientTypeValues).map(quoteSqlString).join(', ');
const conditionTypeValues = {
	disease: JSON.stringify(['condition', 'disease', 'infectiousAndParasitic', 'viral']),
	syndrome: JSON.stringify(['condition', 'syndrome', 'acuteEmergency', 'systemicInflammatoryResponse']),
	disorder: JSON.stringify(['condition', 'disorder', 'behavioralAndCognitive', 'behavioralDisorder']),
	injury: JSON.stringify(['condition', 'injury', 'mechanicalAndTraumatic', 'softTissueTrauma'])
};
const conditionTypeSqlValues = Object.values(conditionTypeValues).map(quoteSqlString).join(', ');
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
	[JSON.stringify(['product', 'disinfectants', null]), productTypeValues.environment.disinfectant],
	[JSON.stringify(['manufacturer', null]), manufacturerTypeValue],
	[JSON.stringify(['activeIngredient', 'substance']), activeIngredientTypeValues.substance],
	[JSON.stringify(['activeIngredient', 'combination']), activeIngredientTypeValues.combination],
	[JSON.stringify(['condition', 'disease']), conditionTypeValues.disease],
	[JSON.stringify(['condition', 'syndrome']), conditionTypeValues.syndrome],
	[JSON.stringify(['condition', 'disorder']), conditionTypeValues.disorder],
	[JSON.stringify(['condition', 'injury']), conditionTypeValues.injury]
]);

function printUsage() {
	console.log(`Uso:
  node legacy-to-sqlite/adopt-version-1-db.mjs
  node legacy-to-sqlite/adopt-version-1-db.mjs --source build/veterinary_clinic-version-1.db --output build/veterinary_clinic-version-1.catalog.db

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

function readJson(file) {
	return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonFiles(directory) {
	if (!fs.existsSync(directory)) return [];
	return fs
		.readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) return readJsonFiles(fullPath);
			return entry.isFile() && entry.name.endsWith('.json') ? [fullPath] : [];
		})
		.sort((left, right) => left.localeCompare(right));
}

function readDefaultManufacturers() {
	return readJsonFiles(manufacturerDefaultsDir).map(readJson);
}

function readDefaultActiveIngredients() {
	return readJsonFiles(activeIngredientDefaultsDir).map(readJson);
}

function readDefaultConditions() {
	return readJsonFiles(conditionDefaultsDir).map(readJson);
}

function readDefaultProducts() {
	return readJsonFiles(productDefaultsDir).map(readJson);
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

function createCatalogTables(database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS manufacturer_catalog_items (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type = ${quoteSqlString(manufacturerTypeValue)}),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);

		CREATE TABLE IF NOT EXISTS active_ingredient_catalog_items (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${activeIngredientTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);

		CREATE TABLE IF NOT EXISTS condition_catalog_items (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${conditionTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);

		CREATE TABLE IF NOT EXISTS product_active_ingredients (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id TEXT NOT NULL,
			active_ingredient_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (product_id) REFERENCES product_catalog_items(id) ON DELETE CASCADE,
			FOREIGN KEY (active_ingredient_id) REFERENCES active_ingredient_catalog_items(id) ON DELETE CASCADE,
			UNIQUE(product_id, active_ingredient_id)
		);
	`);
}

function normalizeStoredCatalogType(type, fallbackType) {
	if (typeof type !== 'string' || !type.trim()) return fallbackType;
	return storedCatalogTypeReplacements.get(type) ?? type;
}

function stringifyCatalogTypeFromJson(type, source) {
	if (!Array.isArray(type) || ![3, 4].includes(type.length) || typeof type[0] !== 'string' || type.slice(1).some((item) => item !== null && typeof item !== 'string')) {
		throw new Error(`Tipo de catálogo inválido em ${source}`);
	}
	return JSON.stringify(type);
}

function rebuildManufacturerCatalog(database) {
	const rows = tableExists(database, 'manufacturer_catalog_items') ? database.prepare('SELECT * FROM manufacturer_catalog_items ORDER BY name COLLATE NOCASE').all() : [];
	database.exec(`
		DROP TABLE IF EXISTS manufacturer_catalog_items_next;
		CREATE TABLE manufacturer_catalog_items_next (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type = ${quoteSqlString(manufacturerTypeValue)}),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);
	`);
	const insert = database.prepare(`
		INSERT OR IGNORE INTO manufacturer_catalog_items_next (id, type, name, normalized_name, aliases, origin, regions, extension, hidden_at, created_at, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, @origin, @regions, @extension, @hidden_at, @created_at, @updated_at)
	`);
	for (const row of rows) {
		const name = String(row.name ?? '').trim();
		const normalizedName = String(row.normalized_name ?? normalizeName(name)).trim();
		if (!name || !normalizedName) continue;
		insert.run({
			id: isUuidV4(row.id) ? row.id : crypto.randomUUID(),
			type: normalizeStoredCatalogType(row.type, manufacturerTypeValue),
			name,
			normalized_name: normalizedName,
			aliases: row.aliases || '[]',
			origin: row.origin === 'system' ? 'system' : 'user',
			regions: row.regions || '[]',
			extension: normalizeProductExtensionText(row.extension),
			hidden_at: row.hidden_at ?? null,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}
	database.exec(`
		DROP TABLE IF EXISTS manufacturer_catalog_items;
		ALTER TABLE manufacturer_catalog_items_next RENAME TO manufacturer_catalog_items;
	`);
}

function rebuildActiveIngredientCatalog(database) {
	const rows = tableExists(database, 'active_ingredient_catalog_items') ? database.prepare('SELECT * FROM active_ingredient_catalog_items ORDER BY name COLLATE NOCASE').all() : [];
	database.exec(`
		DROP TABLE IF EXISTS active_ingredient_catalog_items_next;
		CREATE TABLE active_ingredient_catalog_items_next (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${activeIngredientTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);
	`);
	const insert = database.prepare(`
		INSERT OR IGNORE INTO active_ingredient_catalog_items_next (id, type, name, normalized_name, aliases, origin, regions, extension, hidden_at, created_at, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, @origin, @regions, @extension, @hidden_at, @created_at, @updated_at)
	`);
	for (const row of rows) {
		const name = String(row.name ?? '').trim();
		const normalizedName = String(row.normalized_name ?? normalizeName(name)).trim();
		if (!name || !normalizedName) continue;
		insert.run({
			id: isUuidV4(row.id) ? row.id : crypto.randomUUID(),
			type: normalizeStoredCatalogType(row.type, activeIngredientTypeValues.substance),
			name,
			normalized_name: normalizedName,
			aliases: row.aliases || '[]',
			origin: row.origin === 'system' ? 'system' : 'user',
			regions: row.regions || '[]',
			extension: row.extension || '{}',
			hidden_at: row.hidden_at ?? null,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}
	database.exec(`
		DROP TABLE IF EXISTS active_ingredient_catalog_items;
		ALTER TABLE active_ingredient_catalog_items_next RENAME TO active_ingredient_catalog_items;
	`);
}

function rebuildConditionCatalog(database) {
	const rows = tableExists(database, 'condition_catalog_items') ? database.prepare('SELECT * FROM condition_catalog_items ORDER BY name COLLATE NOCASE').all() : [];
	database.exec(`
		DROP TABLE IF EXISTS condition_catalog_items_next;
		CREATE TABLE condition_catalog_items_next (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${conditionTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			UNIQUE(normalized_name)
		);
	`);
	const insert = database.prepare(`
		INSERT OR IGNORE INTO condition_catalog_items_next (id, type, name, normalized_name, aliases, origin, regions, extension, hidden_at, created_at, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, @origin, @regions, @extension, @hidden_at, @created_at, @updated_at)
	`);
	for (const row of rows) {
		const name = String(row.name ?? '').trim();
		const normalizedName = String(row.normalized_name ?? normalizeName(name)).trim();
		if (!name || !normalizedName) continue;
		insert.run({
			id: isUuidV4(row.id) ? row.id : crypto.randomUUID(),
			type: normalizeStoredCatalogType(row.type, conditionTypeValues.disease),
			name,
			normalized_name: normalizedName,
			aliases: row.aliases || '[]',
			origin: row.origin === 'system' ? 'system' : 'user',
			regions: row.regions || '[]',
			extension: row.extension || '{}',
			hidden_at: row.hidden_at ?? null,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}
	database.exec(`
		DROP TABLE IF EXISTS condition_catalog_items;
		ALTER TABLE condition_catalog_items_next RENAME TO condition_catalog_items;
	`);
}

function syncDefaultManufacturers(database) {
	const insert = database.prepare(`
		INSERT INTO manufacturer_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, 'system', @regions, @extension, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			normalized_name = excluded.normalized_name,
			aliases = excluded.aliases,
			regions = excluded.regions,
			extension = excluded.extension,
			updated_at = CURRENT_TIMESTAMP
		WHERE manufacturer_catalog_items.origin = 'system'
	`);
	for (const item of readDefaultManufacturers()) {
		insert.run({
			id: item.id,
			type: stringifyCatalogTypeFromJson(item.type, item.name),
			name: item.name,
			normalized_name: normalizeName(item.name),
			aliases: JSON.stringify(Array.isArray(item.aliases) ? item.aliases : []),
			regions: JSON.stringify(Array.isArray(item.regions) ? item.regions : []),
			extension: JSON.stringify(item.extension ?? {})
		});
	}
}

function syncDefaultActiveIngredients(database) {
	const insert = database.prepare(`
		INSERT INTO active_ingredient_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, 'system', @regions, @extension, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			normalized_name = excluded.normalized_name,
			aliases = excluded.aliases,
			regions = excluded.regions,
			extension = excluded.extension,
			updated_at = CURRENT_TIMESTAMP
		WHERE active_ingredient_catalog_items.origin = 'system'
	`);
	for (const item of readDefaultActiveIngredients()) {
		insert.run({
			id: item.id,
			type: stringifyCatalogTypeFromJson(item.type, item.name),
			name: item.name,
			normalized_name: normalizeName(item.name),
			aliases: JSON.stringify(Array.isArray(item.aliases) ? item.aliases : []),
			regions: JSON.stringify(Array.isArray(item.regions) ? item.regions : []),
			extension: JSON.stringify(item.extension ?? {})
		});
	}
}

function syncDefaultConditions(database) {
	const insert = database.prepare(`
		INSERT INTO condition_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
		VALUES (@id, @type, @name, @normalized_name, @aliases, 'system', @regions, @extension, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			normalized_name = excluded.normalized_name,
			aliases = excluded.aliases,
			regions = excluded.regions,
			extension = excluded.extension,
			updated_at = CURRENT_TIMESTAMP
		WHERE condition_catalog_items.origin = 'system'
	`);
	for (const item of readDefaultConditions()) {
		insert.run({
			id: item.id,
			type: stringifyCatalogTypeFromJson(item.type, item.name),
			name: item.name,
			normalized_name: normalizeName(item.name),
			aliases: JSON.stringify(Array.isArray(item.aliases) ? item.aliases : []),
			regions: JSON.stringify(Array.isArray(item.regions) ? item.regions : []),
			extension: JSON.stringify(item.extension ?? {})
		});
	}
}

function ensureUserManufacturer(database, name) {
	const normalizedName = normalizeName(name);
	if (!normalizedName) return null;
	const existing = database.prepare('SELECT id FROM manufacturer_catalog_items WHERE normalized_name = ? LIMIT 1').get(normalizedName);
	if (existing?.id) return existing.id;
	const id = crypto.randomUUID();
	database.prepare(`
		INSERT INTO manufacturer_catalog_items (id, type, name, normalized_name, aliases, origin, regions, extension, updated_at)
		VALUES (?, ?, ?, ?, '[]', 'user', '[]', '{}', CURRENT_TIMESTAMP)
	`).run(id, manufacturerTypeValue, name.trim(), normalizedName);
	return id;
}

function rebuildProductCatalog(database) {
	const defaultProductsById = new Map(readDefaultProducts().map((item) => [item.id, item]));
	const rows = tableExists(database, 'product_catalog_items')
		? database.prepare('SELECT * FROM product_catalog_items ORDER BY name COLLATE NOCASE').all()
		: [];

	database.exec(`
		DROP TABLE IF EXISTS product_catalog_items_next;
		CREATE TABLE product_catalog_items_next (
			id TEXT PRIMARY KEY CHECK(length(trim(id)) = 36 AND substr(lower(trim(id)), 15, 1) = '4' AND substr(lower(trim(id)), 20, 1) IN ('8', '9', 'a', 'b')),
			type TEXT NOT NULL CHECK(type IN (${productTypeSqlValues})),
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) BETWEEN 1 AND 120),
			species TEXT NOT NULL DEFAULT '["canine","feline"]' CHECK(length(trim(species)) BETWEEN 1 AND 256),
			aliases TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(aliases)) BETWEEN 1 AND 1000),
			manufacturer_id TEXT,
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin IN ('system', 'user')),
			regions TEXT NOT NULL DEFAULT '[]' CHECK(length(trim(regions)) BETWEEN 1 AND 1024),
			extension TEXT NOT NULL DEFAULT '{}' CHECK(length(trim(extension)) BETWEEN 1 AND 64000),
			hidden_at TEXT,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (manufacturer_id) REFERENCES manufacturer_catalog_items(id) ON DELETE SET NULL,
			UNIQUE(normalized_name)
		);
	`);

	const insert = database.prepare(`
		INSERT INTO product_catalog_items_next (
			id, type, name, normalized_name, species, aliases, manufacturer_id, origin, regions, extension, hidden_at, created_at, updated_at
		)
		VALUES (@id, @type, @name, @normalized_name, @species, @aliases, @manufacturer_id, @origin, @regions, @extension, @hidden_at, @created_at, @updated_at)
	`);

	for (const row of rows) {
		const fallbackDefault = defaultProductsById.get(row.id);
		const manufacturerId = row.manufacturer_id ?? fallbackDefault?.manufacturerId ?? ensureUserManufacturer(database, row.manufacturer ?? '');
		insert.run({
			id: isUuidV4(row.id) ? row.id : crypto.randomUUID(),
			type: normalizeStoredCatalogType(row.type, productTypeValues.medication.vaccine),
			name: row.name,
			normalized_name: row.normalized_name || normalizeName(row.name),
			species: row.species || '["canine","feline"]',
			aliases: row.aliases || '[]',
			manufacturer_id: manufacturerId,
			origin: row.origin === 'system' ? 'system' : 'user',
			regions: row.regions || '[]',
			extension: row.extension || '{}',
			hidden_at: row.hidden_at ?? null,
			created_at: row.created_at ?? new Date().toISOString(),
			updated_at: row.updated_at ?? null
		});
	}

	database.exec(`
		DROP TABLE product_catalog_items;
		ALTER TABLE product_catalog_items_next RENAME TO product_catalog_items;
	`);
}

function syncDefaultProducts(database) {
	const insert = database.prepare(`
		INSERT INTO product_catalog_items (
			id, type, name, normalized_name, species, aliases, manufacturer_id, origin, regions, extension, updated_at
		)
		VALUES (@id, @type, @name, @normalized_name, @species, @aliases, @manufacturer_id, 'system', @regions, @extension, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			type = excluded.type,
			name = excluded.name,
			normalized_name = excluded.normalized_name,
			species = excluded.species,
			aliases = excluded.aliases,
			manufacturer_id = excluded.manufacturer_id,
			regions = excluded.regions,
			extension = excluded.extension,
			updated_at = CURRENT_TIMESTAMP
		WHERE product_catalog_items.origin = 'system'
	`);
	const clearRelations = database.prepare('DELETE FROM product_active_ingredients WHERE product_id = ?');
	const insertRelation = database.prepare(`
		INSERT INTO product_active_ingredients (product_id, active_ingredient_id, sort_order, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(product_id, active_ingredient_id) DO UPDATE SET sort_order = excluded.sort_order, updated_at = CURRENT_TIMESTAMP
	`);

	for (const item of readDefaultProducts()) {
		insert.run({
			id: item.id,
			type: stringifyCatalogTypeFromJson(item.type, item.name),
			name: item.name,
			normalized_name: normalizeName(item.name),
			species: JSON.stringify(Array.isArray(item.species) ? item.species : ['canine', 'feline']),
			aliases: JSON.stringify(Array.isArray(item.aliases) ? item.aliases : []),
			manufacturer_id: item.manufacturerId ?? null,
			regions: JSON.stringify(Array.isArray(item.regions) ? item.regions : []),
			extension: JSON.stringify(normalizeProductExtension(item.extension ?? {}))
		});

		clearRelations.run(item.id);
		for (const [sortOrder, activeIngredientId] of (item.activeIngredientIds ?? []).entries()) {
			insertRelation.run(item.id, activeIngredientId, sortOrder);
		}
	}
}

function createIndexes(database) {
	database.exec(`
		CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_type_name ON manufacturer_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_manufacturer_catalog_items_hidden_at ON manufacturer_catalog_items(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_type_name ON active_ingredient_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_active_ingredient_catalog_items_hidden_at ON active_ingredient_catalog_items(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_condition_catalog_items_type_name ON condition_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_condition_catalog_items_hidden_at ON condition_catalog_items(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_name ON product_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_product_catalog_items_type_normalized_name ON product_catalog_items(type, normalized_name);
		CREATE INDEX IF NOT EXISTS idx_product_catalog_items_manufacturer_id ON product_catalog_items(manufacturer_id);
		CREATE INDEX IF NOT EXISTS idx_product_catalog_items_hidden_at ON product_catalog_items(hidden_at);
		CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_product_id ON product_active_ingredients(product_id, sort_order, id);
		CREATE INDEX IF NOT EXISTS idx_product_active_ingredients_active_ingredient_id ON product_active_ingredients(active_ingredient_id);
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
			createCatalogTables(database);
			rebuildManufacturerCatalog(database);
			rebuildActiveIngredientCatalog(database);
			rebuildConditionCatalog(database);
			syncDefaultManufacturers(database);
			syncDefaultActiveIngredients(database);
			syncDefaultConditions(database);
			rebuildProductCatalog(database);
			syncDefaultProducts(database);
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
	console.log(`Banco v1 atualizado para catálogo amplo: ${path.relative(scriptDir, outputPath)}`);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}
