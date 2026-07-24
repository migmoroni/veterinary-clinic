import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const inputPath = resolve(process.argv[2] ?? 'dist/veterinary_clinic-version-1.user.db');
const outputDir = resolve(process.argv[3] ?? 'build');
const outputPackagePath = resolve(process.argv[4] ?? resolve(outputDir, 'veterinary_clinic_user_import.zip'));

const userDatabasePath = resolve(outputDir, 'veterinary_clinic_user.db');
const userMediaDatabasePath = resolve(outputDir, 'veterinary_clinic_user_media.db');
const packageStagingPath = resolve(outputDir, '.native-package-staging');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const CURRENT_SCHEMA_VERSION = 1;
const MANIFEST_FILE = 'manifest.json';

const MEDIA_BLOBS_DDL = `
CREATE TABLE IF NOT EXISTS blobs (
	hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
	thumbnail BLOB,
	mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
	size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
	width INTEGER CHECK(width IS NULL OR width > 0),
	height INTEGER CHECK(height IS NULL OR height > 0),
	sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	uploaded_at TEXT,
	removed_at TEXT
) WITHOUT ROWID
`;

function quoteIdentifier(identifier) {
	return `"${String(identifier).replace(/"/g, '""')}"`;
}

function prepareOutputPath(path) {
	mkdirSync(dirname(path), { recursive: true });
	removeSqliteFileSet(path);
}

function removeSqliteFileSet(path) {
	for (const filePath of [path, `${path}-wal`, `${path}-shm`]) {
		if (existsSync(filePath)) rmSync(filePath);
	}
}

function removeDirectoryIfExists(path) {
	if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

function createMediaDatabase(path) {
	prepareOutputPath(path);
	const database = new Database(path);
	try {
		database.pragma('page_size = 4096');
		database.pragma('journal_mode = WAL');
		database.pragma('cache_size = -4000');
		database.pragma('mmap_size = 33554432');
		database.exec(MEDIA_BLOBS_DDL);
		database.pragma('wal_checkpoint(TRUNCATE)');
	} finally {
		database.close();
	}
}

function readAppVersion() {
	try {
		const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
		return typeof packageJson.version === 'string' && packageJson.version.trim() ? packageJson.version : '0.2.0';
	} catch {
		return '0.2.0';
	}
}

function nowIsoWithoutMilliseconds() {
	return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function writeManifest(stagingPath) {
	const manifest = {
		app_version: readAppVersion(),
		schema_version: CURRENT_SCHEMA_VERSION,
		created_at: nowIsoWithoutMilliseconds(),
		export_type: 'native',
		domain: 'user'
	};
	writeFileSync(resolve(stagingPath, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
}

function snapshotDatabase(sourcePath, destinationPath) {
	if (!existsSync(sourcePath)) throw new Error(`snapshot_source_not_found:${sourcePath}`);
	prepareOutputPath(destinationPath);
	const source = new Database(sourcePath, { readonly: true });
	try {
		source.prepare('VACUUM INTO ?').run(destinationPath);
	} finally {
		source.close();
	}
}

const CRC32_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index += 1) {
		let value = index;
		for (let bit = 0; bit < 8; bit += 1) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		table[index] = value >>> 0;
	}
	return table;
})();

function crc32(buffer) {
	let crc = 0xffffffff;
	for (const byte of buffer) {
		crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
	const year = Math.max(1980, date.getFullYear());
	return {
		date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
	};
}

function uint16(value) {
	const buffer = Buffer.allocUnsafe(2);
	buffer.writeUInt16LE(value, 0);
	return buffer;
}

function uint32(value) {
	const buffer = Buffer.allocUnsafe(4);
	buffer.writeUInt32LE(value >>> 0, 0);
	return buffer;
}

function collectZipEntries(root, current = root, entries = []) {
	if (!existsSync(current)) return entries;
	for (const entry of readdirSync(current, { withFileTypes: true })) {
		const path = resolve(current, entry.name);
		const relativePath = path
			.slice(root.length + 1)
			.split(/[\\/]+/)
			.join('/');
		if (entry.isDirectory()) {
			entries.push({ path, relativePath: `${relativePath}/`, directory: true });
			collectZipEntries(root, path, entries);
			continue;
		}
		if (!entry.isFile()) continue;
		entries.push({ path, relativePath, directory: false });
	}
	return entries;
}

function createStoredZipFromDirectory(root, destinationPath) {
	mkdirSync(dirname(destinationPath), { recursive: true });
	if (existsSync(destinationPath)) rmSync(destinationPath);

	const entries = collectZipEntries(root).sort((left, right) => left.relativePath.localeCompare(right.relativePath));
	const outputParts = [];
	const centralParts = [];
	const centralRecords = [];
	const { date, time } = dosDateTime();
	let offset = 0;

	function pushOutput(...parts) {
		for (const part of parts) {
			outputParts.push(part);
			offset += part.byteLength;
		}
	}

	for (const entry of entries) {
		const data = entry.directory ? Buffer.alloc(0) : readFileSync(entry.path);
		const pathBytes = Buffer.from(entry.relativePath, 'utf8');
		if (pathBytes.byteLength > 0xffff) throw new Error(`zip_path_too_long:${entry.relativePath}`);
		if (data.byteLength > 0xffffffff) throw new Error(`zip_file_too_large:${entry.relativePath}`);

		const checksum = crc32(data);
		const fileOffset = offset;
		pushOutput(
			uint32(0x04034b50),
			uint16(20),
			uint16(0x0800),
			uint16(0),
			uint16(time),
			uint16(date),
			uint32(checksum),
			uint32(data.byteLength),
			uint32(data.byteLength),
			uint16(pathBytes.byteLength),
			uint16(0),
			pathBytes,
			data
		);

		centralRecords.push({
			pathBytes,
			checksum,
			size: data.byteLength,
			offset: fileOffset
		});
	}

	const centralOffset = offset;
	for (const record of centralRecords) {
		centralParts.push(
			uint32(0x02014b50),
			uint16(20),
			uint16(20),
			uint16(0x0800),
			uint16(0),
			uint16(time),
			uint16(date),
			uint32(record.checksum),
			uint32(record.size),
			uint32(record.size),
			uint16(record.pathBytes.byteLength),
			uint16(0),
			uint16(0),
			uint16(0),
			uint16(0),
			uint32(0),
			uint32(record.offset),
			record.pathBytes
		);
	}

	const centralDirectory = Buffer.concat(centralParts);
	if (centralRecords.length > 0xffff || centralOffset > 0xffffffff || centralDirectory.byteLength > 0xffffffff) {
		throw new Error('zip_archive_too_large');
	}

	const end = Buffer.concat([
		uint32(0x06054b50),
		uint16(0),
		uint16(0),
		uint16(centralRecords.length),
		uint16(centralRecords.length),
		uint32(centralDirectory.byteLength),
		uint32(centralOffset),
		uint16(0)
	]);

	writeFileSync(destinationPath, Buffer.concat([...outputParts, centralDirectory, end]));
}

function createNativeImportPackage() {
	removeDirectoryIfExists(packageStagingPath);
	const dataDir = resolve(packageStagingPath, 'data');
	const vaultUserDir = resolve(packageStagingPath, 'vault', 'user');
	mkdirSync(dataDir, { recursive: true });
	mkdirSync(vaultUserDir, { recursive: true });

	snapshotDatabase(userDatabasePath, resolve(dataDir, 'veterinary_clinic_user.db'));
	snapshotDatabase(userMediaDatabasePath, resolve(dataDir, 'veterinary_clinic_user_media.db'));
	writeManifest(packageStagingPath);
	createStoredZipFromDirectory(packageStagingPath, outputPackagePath);
	removeDirectoryIfExists(packageStagingPath);
}

function tableExists(database, tableName) {
	return Boolean(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(tableName));
}

function tableHasColumns(database, tableName, columns) {
	if (!tableExists(database, tableName)) return false;
	const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(tableName)})`).all();
	const names = new Set(rows.map((row) => row.name));
	return columns.every((column) => names.has(column));
}

function rebuildOwners(database) {
	if (!tableHasColumns(database, 'owners', ['avatar_blob'])) return;
	database.exec(`
		CREATE TABLE owners_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			additional_information TEXT CHECK(additional_information IS NULL OR length(additional_information) <= 2000),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		);

		INSERT INTO owners_new (id, name, avatar_hash, additional_information, created_at, updated_at, deleted_at, purge_after)
		SELECT id, name, NULL, additional_information, created_at, updated_at, deleted_at, purge_after
		FROM owners;

		DROP TABLE owners;
		ALTER TABLE owners_new RENAME TO owners;
	`);
}

function rebuildVeterinarianProfiles(database) {
	if (!tableHasColumns(database, 'veterinarian_profiles', ['avatar_blob'])) return;
	database.exec(`
		CREATE TABLE veterinarian_profiles_new (
			id INTEGER PRIMARY KEY CHECK(id = 1),
			name TEXT CHECK(name IS NULL OR length(name) <= 120),
			professional_registration TEXT CHECK(professional_registration IS NULL OR length(professional_registration) <= 80),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT
		);

		INSERT INTO veterinarian_profiles_new (id, name, professional_registration, avatar_hash, created_at, updated_at)
		SELECT id, name, professional_registration, NULL, created_at, updated_at
		FROM veterinarian_profiles;

		DROP TABLE veterinarian_profiles;
		ALTER TABLE veterinarian_profiles_new RENAME TO veterinarian_profiles;
	`);
}

function rebuildAdditionalResponsibles(database) {
	if (!tableHasColumns(database, 'owner_additional_responsibles', ['avatar_blob'])) return;
	database.exec(`
		CREATE TABLE owner_additional_responsibles_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id INTEGER NOT NULL,
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		);

		INSERT INTO owner_additional_responsibles_new (id, owner_id, name, avatar_hash, sort_order, created_at, updated_at)
		SELECT id, owner_id, name, NULL, sort_order, created_at, updated_at
		FROM owner_additional_responsibles;

		DROP TABLE owner_additional_responsibles;
		ALTER TABLE owner_additional_responsibles_new RENAME TO owner_additional_responsibles;
	`);
}

function rebuildPets(database) {
	if (!tableHasColumns(database, 'pets', ['avatar_blob'])) return;
	database.exec(`
		CREATE TABLE pets_new (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 80),
			birth_date TEXT CHECK(birth_date IS NULL OR length(birth_date) <= 10),
			species TEXT CHECK(species IS NULL OR length(species) <= 80),
			breed TEXT CHECK(breed IS NULL OR length(breed) <= 80),
			sex TEXT CHECK(sex IS NULL OR (sex IN ('M', 'F') AND length(sex) = 1)),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			updated_at TEXT,
			deleted_at TEXT,
			purge_after TEXT
		);

		INSERT INTO pets_new (id, name, birth_date, species, breed, sex, avatar_hash, updated_at, deleted_at, purge_after)
		SELECT id, name, birth_date, species, breed, sex, NULL, updated_at, deleted_at, purge_after
		FROM pets;

		DROP TABLE pets;
		ALTER TABLE pets_new RENAME TO pets;
	`);
}

function rebuildImageCollectionItems(database) {
	if (!tableHasColumns(database, 'image_collection_items', ['image_blob', 'original_image_blob'])) return;
	database.exec(`
		DROP TABLE image_collection_items;

		CREATE TABLE image_collection_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			collection_id INTEGER NOT NULL,
			image_hash BLOB NOT NULL CHECK(length(image_hash) = 32),
			original_image_hash BLOB NOT NULL CHECK(length(original_image_hash) = 32),
			description TEXT CHECK(description IS NULL OR length(description) <= 500),
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		);
	`);
}

function removeSystemTablesFromUserDatabase(database) {
	for (const table of [
		'product_active_ingredients',
		'product_catalog_items',
		'breed_reference_items',
		'condition_catalog_items',
		'active_ingredient_catalog_items',
		'manufacturer_catalog_items'
	]) {
		database.exec(`DROP TABLE IF EXISTS ${quoteIdentifier(table)}`);
	}
}

function recreateIndexes(database) {
	database.exec(`
		CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name);
		CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id);
		CREATE INDEX IF NOT EXISTS idx_image_collection_items_collection_id ON image_collection_items(collection_id, sort_order, id);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1;
		CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id);
		CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_name ON owner_additional_responsibles(name);
		CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);
		CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species);
		CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed);
	`);
}

function adaptUserDatabase() {
	if (!existsSync(inputPath)) throw new Error(`input_database_not_found:${inputPath}`);
	prepareOutputPath(userDatabasePath);

	const source = new Database(inputPath, { readonly: true });
	try {
		source.prepare(`VACUUM INTO ?`).run(userDatabasePath);
	} finally {
		source.close();
	}

	const database = new Database(userDatabasePath);
	try {
		database.pragma('foreign_keys = OFF');
		database.exec('BEGIN IMMEDIATE');
		try {
			rebuildOwners(database);
			rebuildVeterinarianProfiles(database);
			rebuildAdditionalResponsibles(database);
			rebuildPets(database);
			rebuildImageCollectionItems(database);
			removeSystemTablesFromUserDatabase(database);
			recreateIndexes(database);
			database.pragma('user_version = 1');
			database.exec('COMMIT');
		} catch (error) {
			database.exec('ROLLBACK');
			throw error;
		}
		database.pragma('foreign_keys = ON');
		const integrity = database.prepare('PRAGMA integrity_check').get()?.integrity_check;
		if (integrity !== 'ok') throw new Error(`integrity_check_failed:${integrity ?? 'unknown'}`);
		const foreignKeyViolations = database.prepare('PRAGMA foreign_key_check').all();
		if (foreignKeyViolations.length > 0) throw new Error(`foreign_key_check_failed:${JSON.stringify(foreignKeyViolations[0])}`);
		database.pragma('wal_checkpoint(TRUNCATE)');
		database.exec('VACUUM');
	} finally {
		database.close();
	}
}

mkdirSync(outputDir, { recursive: true });

adaptUserDatabase();
createMediaDatabase(userMediaDatabasePath);
createNativeImportPackage();

console.log(`Generated ${userDatabasePath}`);
console.log(`Generated ${userMediaDatabasePath}`);
console.log(`Generated ${outputPackagePath}`);
