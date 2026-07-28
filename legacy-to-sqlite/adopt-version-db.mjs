import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const inputPath = resolve(process.argv[2] ?? 'dist/veterinary_clinic-version-1.user.db');
const outputDir = resolve(process.argv[3] ?? 'build');
const outputPackagePath = resolve(process.argv[4] ?? resolve(outputDir, 'veterinary_clinic_user_import.zip'));

const userDatabasePath = resolve(outputDir, 'veterinary_clinic_user.db');
const userMediaDatabasePath = resolve(outputDir, 'veterinary_clinic_user_media.db');
const userLogsDatabasePath = resolve(outputDir, 'veterinary_clinic_user_logs.db');
const packageStagingPath = resolve(outputDir, '.native-package-staging');
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const CURRENT_SCHEMA_VERSION = 1;

const MEDIA_BLOBS_DDL = `
CREATE TABLE IF NOT EXISTS blobs (
	hash BLOB PRIMARY KEY CHECK(length(hash) = 32),
	thumbnail BLOB,
	mime_type TEXT NOT NULL CHECK(length(trim(mime_type)) > 0),
	size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
	width INTEGER CHECK(width IS NULL OR width > 0),
	height INTEGER CHECK(height IS NULL OR height > 0),
	sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'error')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	updated_by TEXT,
	uploaded_at TEXT,
	removed_at TEXT
) WITHOUT ROWID
`;

const USER_LOGS_DDL = `
CREATE TABLE IF NOT EXISTS database_manifest (
	scope TEXT PRIMARY KEY CHECK(scope = 'user'),
	database_id TEXT NOT NULL UNIQUE CHECK(
		length(database_id) = 36
		AND substr(database_id, 9, 1) = '-'
		AND substr(database_id, 14, 1) = '-'
		AND substr(database_id, 15, 1) = '7'
		AND substr(database_id, 19, 1) = '-'
		AND substr(database_id, 24, 1) = '-'
	),
	app_version TEXT NOT NULL CHECK(length(trim(app_version)) > 0),
	schema_version INTEGER NOT NULL CHECK(schema_version > 0),
	created_at TEXT NOT NULL,
	updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permanent_deletion_logs (
	id TEXT PRIMARY KEY,
	domain TEXT NOT NULL CHECK(domain IN ('user_data', 'user_media')),
	target_table TEXT NOT NULL,
	target_id TEXT NOT NULL,
	deleted_by TEXT,
	snapshot_json TEXT,
	created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_audit_logs (
	id TEXT PRIMARY KEY,
	action_type TEXT NOT NULL,
	description TEXT NOT NULL,
	actor_id TEXT,
	created_at TEXT NOT NULL
);
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

function createLogsDatabase(path) {
	prepareOutputPath(path);
	const database = new Database(path);
	try {
		database.pragma('page_size = 4096');
		database.pragma('journal_mode = WAL');
		database.pragma('synchronous = NORMAL');
		database.pragma('cache_size = -2000');
		database.exec(USER_LOGS_DDL);
		ensureDatabaseManifest(database);
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

function ensureDatabaseManifest(database) {
	const createdAt = nowIsoWithoutMilliseconds();
	database
		.prepare(`
			INSERT INTO database_manifest (
				scope, database_id, app_version, schema_version, created_at, updated_at
			)
			SELECT
				'user',
				?,
				?,
				?,
				?,
				?
			WHERE NOT EXISTS (
				SELECT 1 FROM database_manifest WHERE scope = 'user'
			)
		`)
		.run(createUuidV7(), readAppVersion(), CURRENT_SCHEMA_VERSION, createdAt, createdAt);
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
	snapshotDatabase(userLogsDatabasePath, resolve(dataDir, 'veterinary_clinic_user_logs.db'));
	createStoredZipFromDirectory(packageStagingPath, outputPackagePath);
	removeDirectoryIfExists(packageStagingPath);
}

function tableExists(database, tableName) {
	return Boolean(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1").get(tableName));
}

function createUuidV7() {
	const timestamp = BigInt(Date.now());
	const bytes = Buffer.alloc(16);
	bytes[0] = Number((timestamp >> 40n) & 0xffn);
	bytes[1] = Number((timestamp >> 32n) & 0xffn);
	bytes[2] = Number((timestamp >> 24n) & 0xffn);
	bytes[3] = Number((timestamp >> 16n) & 0xffn);
	bytes[4] = Number((timestamp >> 8n) & 0xffn);
	bytes[5] = Number(timestamp & 0xffn);
	for (let index = 6; index < 16; index += 1) bytes[index] = Math.floor(Math.random() * 256);
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = bytes.toString('hex');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readRows(database, tableName) {
	if (!tableExists(database, tableName)) return [];
	return database.prepare(`SELECT * FROM ${quoteIdentifier(tableName)}`).all();
}

function oldKey(value) {
	return value == null ? null : String(value);
}

function createIdMap(rows) {
	return new Map(rows.map((row) => [oldKey(row.id), createUuidV7()]));
}

function mappedId(map, value) {
	const key = oldKey(value);
	return key == null ? null : (map.get(key) ?? null);
}

function normalizeTimestamp(value, fallback = new Date().toISOString()) {
	if (typeof value !== 'string' || !value.trim()) return fallback;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function nullableRemovedAt(row) {
	const removed = row?.removed_at ?? row?.deleted_at ?? null;
	return removed == null ? null : normalizeTimestamp(removed, null);
}

function createUserSchema(database) {
	database.exec(`
		DROP TABLE IF EXISTS pet_treatments;
		DROP TABLE IF EXISTS treatment_protocol_doses;
		DROP TABLE IF EXISTS treatment_protocol_items;
		DROP TABLE IF EXISTS treatment_protocols;
		DROP TABLE IF EXISTS user_product_catalog_items;
		DROP TABLE IF EXISTS backup_history;
		DROP TABLE IF EXISTS schema_migrations;
		DROP TABLE IF EXISTS app_settings;
		DROP TABLE IF EXISTS medical_records;
		DROP TABLE IF EXISTS pet_owners;
		DROP TABLE IF EXISTS pets;
		DROP TABLE IF EXISTS owner_additional_responsibles;
		DROP TABLE IF EXISTS contacts;
		DROP TABLE IF EXISTS image_collection_items;
		DROP TABLE IF EXISTS image_collections;
		DROP TABLE IF EXISTS addresses;
		DROP TABLE IF EXISTS workplaces;
		DROP TABLE IF EXISTS veterinarian_profiles;
		DROP TABLE IF EXISTS owners;

		CREATE TABLE owners (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			additional_information TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE veterinarian_profiles (
			id TEXT PRIMARY KEY,
			name TEXT,
			professional_registration TEXT,
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE workplaces (
			id TEXT PRIMARY KEY,
			name TEXT,
			services_description TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE addresses (
			id TEXT PRIMARY KEY,
			owner_id TEXT,
			workplace_id TEXT,
			street TEXT,
			street_number TEXT,
			address_complement TEXT,
			neighborhood TEXT,
			city TEXT,
			state TEXT,
			country TEXT NOT NULL DEFAULT 'BRA',
			postal_code TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE,
			CHECK((owner_id IS NOT NULL) + (workplace_id IS NOT NULL) = 1),
			UNIQUE(owner_id),
			UNIQUE(workplace_id)
		);

		CREATE TABLE image_collections (
			id TEXT PRIMARY KEY,
			entity_type TEXT NOT NULL,
			entity_id TEXT NOT NULL,
			primary_required INTEGER NOT NULL DEFAULT 0 CHECK(primary_required IN (0, 1)),
			max_items INTEGER CHECK(max_items IS NULL OR max_items > 0),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			UNIQUE(entity_type, entity_id)
		);

		CREATE TABLE image_collection_items (
			id TEXT PRIMARY KEY,
			collection_id TEXT NOT NULL,
			image_hash BLOB NOT NULL CHECK(length(image_hash) = 32),
			original_image_hash BLOB NOT NULL CHECK(length(original_image_hash) = 32),
			description TEXT,
			is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (collection_id) REFERENCES image_collections(id) ON DELETE CASCADE
		);

		CREATE TABLE contacts (
			id TEXT PRIMARY KEY,
			owner_id TEXT,
			responsible_id TEXT,
			veterinarian_profile_id TEXT,
			workplace_id TEXT,
			kind TEXT NOT NULL CHECK(kind IN ('phone', 'mobile', 'email', 'other')),
			label TEXT NOT NULL DEFAULT '',
			value TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			FOREIGN KEY (responsible_id) REFERENCES owner_additional_responsibles(id) ON DELETE CASCADE,
			FOREIGN KEY (veterinarian_profile_id) REFERENCES veterinarian_profiles(id) ON DELETE CASCADE,
			FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE
		);

		CREATE TABLE owner_additional_responsibles (
			id TEXT PRIMARY KEY,
			owner_id TEXT NOT NULL,
			name TEXT NOT NULL,
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
		);

		CREATE TABLE pets (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			birth_date TEXT,
			species TEXT,
			breed TEXT,
			sex TEXT CHECK(sex IS NULL OR sex IN ('M', 'F')),
			avatar_hash BLOB CHECK(avatar_hash IS NULL OR length(avatar_hash) = 32),
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE pet_owners (
			id TEXT PRIMARY KEY,
			pet_id TEXT NOT NULL,
			owner_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
			FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE,
			UNIQUE(pet_id, owner_id)
		);

		CREATE TABLE medical_records (
			id TEXT PRIMARY KEY,
			pet_id TEXT NOT NULL,
			title TEXT,
			description TEXT,
			admitted_at TEXT,
			discharged_at TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id),
			CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
		);

		CREATE TABLE app_settings (
			id TEXT PRIMARY KEY,
			key TEXT NOT NULL,
			value TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			UNIQUE(key)
		);

		CREATE TABLE schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			app_version TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);

		CREATE TABLE backup_history (
			id TEXT PRIMARY KEY,
			path TEXT NOT NULL,
			kind TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE user_product_catalog_items (
			id TEXT PRIMARY KEY,
			type TEXT NOT NULL,
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			species TEXT NOT NULL DEFAULT '["canine","feline"]',
			aliases TEXT NOT NULL DEFAULT '[]',
			manufacturer_id TEXT,
			manufacturer_name TEXT,
			regions TEXT NOT NULL DEFAULT '[]',
			extension TEXT NOT NULL DEFAULT '{}',
			hidden_at TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			UNIQUE(normalized_name)
		);

		CREATE TABLE treatment_protocols (
			id TEXT PRIMARY KEY,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			origin TEXT NOT NULL DEFAULT 'user' CHECK(origin = 'user'),
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			species TEXT NOT NULL DEFAULT '["canine","feline"]',
			observation TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0,
			hidden_at TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT
		);

		CREATE TABLE treatment_protocol_items (
			id TEXT PRIMARY KEY,
			protocol_id TEXT NOT NULL,
			catalog_item_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE,
			UNIQUE(protocol_id, catalog_item_id)
		);

		CREATE TABLE treatment_protocol_doses (
			id TEXT PRIMARY KEY,
			protocol_id TEXT NOT NULL,
			dose TEXT NOT NULL,
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (protocol_id) REFERENCES treatment_protocols(id) ON DELETE CASCADE
		);

		CREATE TABLE pet_treatments (
			id TEXT PRIMARY KEY,
			pet_id TEXT NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('vaccine', 'antiparasitic')),
			applied_at TEXT NOT NULL,
			name TEXT NOT NULL,
			normalized_name TEXT NOT NULL,
			dose TEXT NOT NULL,
			validity_value INTEGER NOT NULL CHECK(validity_value > 0),
			validity_unit TEXT NOT NULL CHECK(validity_unit IN ('days', 'months', 'years')),
			observation TEXT,
			created_at TEXT NOT NULL,
			validity_ignored_at TEXT,
			updated_at TEXT NOT NULL,
			updated_by TEXT,
			removed_at TEXT,
			FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE RESTRICT
		);
	`);
}

function migrateUserRows(database, snapshots) {
	const ownerIdMap = createIdMap(snapshots.owners);
	const veterinarianProfileIdMap = createIdMap(snapshots.veterinarian_profiles);
	const workplaceIdMap = createIdMap(snapshots.workplaces);
	const addressIdMap = createIdMap(snapshots.addresses);
	const responsibleIdMap = createIdMap(snapshots.owner_additional_responsibles);
	const petIdMap = createIdMap(snapshots.pets);
	const petOwnerIdMap = createIdMap(snapshots.pet_owners);
	const recordIdMap = createIdMap(snapshots.medical_records);
	const backupIdMap = createIdMap(snapshots.backup_history);
	const userProductIdMap = createIdMap(snapshots.user_product_catalog_items);
	const protocolRows = snapshots.treatment_protocols.filter((row) => row.origin !== 'system');
	const protocolIdMap = createIdMap(protocolRows);
	const protocolItemIdMap = createIdMap(snapshots.treatment_protocol_items);
	const protocolDoseIdMap = createIdMap(snapshots.treatment_protocol_doses);
	const treatmentIdMap = createIdMap(snapshots.pet_treatments);

	const now = new Date().toISOString();
	const ts = (row, field, fallback = now) => normalizeTimestamp(row?.[field], fallback);
	const updated = (row, created) => ts(row, 'updated_at', created);

	const ownerInsert = database.prepare(`
		INSERT INTO owners (id, name, avatar_hash, additional_information, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, NULL, ?, ?, ?, NULL, ?)
	`);
	for (const row of snapshots.owners) {
		const created = ts(row, 'created_at');
		ownerInsert.run(ownerIdMap.get(oldKey(row.id)), row.name, row.additional_information ?? null, created, updated(row, created), nullableRemovedAt(row));
	}

	const profileInsert = database.prepare(`
		INSERT INTO veterinarian_profiles (id, name, professional_registration, avatar_hash, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.veterinarian_profiles) {
		const created = ts(row, 'created_at');
		profileInsert.run(veterinarianProfileIdMap.get(oldKey(row.id)), row.name ?? null, row.professional_registration ?? null, created, updated(row, created));
	}

	const workplaceInsert = database.prepare(`
		INSERT INTO workplaces (id, name, services_description, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.workplaces) {
		const created = ts(row, 'created_at');
		workplaceInsert.run(workplaceIdMap.get(oldKey(row.id)), row.name ?? null, row.services_description ?? null, created, updated(row, created));
	}

	const addressInsert = database.prepare(`
		INSERT INTO addresses (id, owner_id, workplace_id, street, street_number, address_complement, neighborhood, city, state, country, postal_code, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.addresses) {
		const ownerId = mappedId(ownerIdMap, row.owner_id);
		const workplaceId = mappedId(workplaceIdMap, row.workplace_id);
		if (!ownerId && !workplaceId) continue;
		const created = ts(row, 'created_at');
		addressInsert.run(
			addressIdMap.get(oldKey(row.id)),
			ownerId,
			workplaceId,
			row.street ?? null,
			row.street_number ?? null,
			row.address_complement ?? null,
			row.neighborhood ?? null,
			row.city ?? null,
			row.state ?? null,
			row.country ?? 'BRA',
			row.postal_code ?? null,
			created,
			updated(row, created)
		);
	}

	const responsibleInsert = database.prepare(`
		INSERT INTO owner_additional_responsibles (id, owner_id, name, avatar_hash, sort_order, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.owner_additional_responsibles) {
		const ownerId = mappedId(ownerIdMap, row.owner_id);
		if (!ownerId) continue;
		const created = ts(row, 'created_at');
		responsibleInsert.run(responsibleIdMap.get(oldKey(row.id)), ownerId, row.name, row.sort_order ?? 0, created, updated(row, created));
	}

	const contactInsert = database.prepare(`
		INSERT INTO contacts (id, owner_id, responsible_id, veterinarian_profile_id, workplace_id, kind, label, value, sort_order, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.contacts) {
		const ownerId = mappedId(ownerIdMap, row.owner_id);
		const responsibleId = mappedId(responsibleIdMap, row.responsible_id);
		const veterinarianProfileId = mappedId(veterinarianProfileIdMap, row.veterinarian_profile_id);
		const workplaceId = mappedId(workplaceIdMap, row.workplace_id);
		if (!ownerId && !responsibleId && !veterinarianProfileId && !workplaceId) continue;
		const created = ts(row, 'created_at');
		contactInsert.run(createUuidV7(), ownerId, responsibleId, veterinarianProfileId, workplaceId, row.kind, row.label ?? '', row.value, row.sort_order ?? 0, created, updated(row, created));
	}

	const petInsert = database.prepare(`
		INSERT INTO pets (id, name, birth_date, species, breed, sex, avatar_hash, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?)
	`);
	for (const row of snapshots.pets) {
		const created = ts(row, 'created_at', ts(row, 'updated_at'));
		petInsert.run(petIdMap.get(oldKey(row.id)), row.name, row.birth_date ?? null, row.species ?? null, row.breed ?? null, row.sex ?? null, created, updated(row, created), nullableRemovedAt(row));
	}

	const petOwnerInsert = database.prepare(`
		INSERT OR IGNORE INTO pet_owners (id, pet_id, owner_id, sort_order, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.pet_owners) {
		const petId = mappedId(petIdMap, row.pet_id);
		const ownerId = mappedId(ownerIdMap, row.owner_id);
		if (!petId || !ownerId) continue;
		const created = ts(row, 'created_at');
		petOwnerInsert.run(petOwnerIdMap.get(oldKey(row.id)), petId, ownerId, row.sort_order ?? 0, created, updated(row, created));
	}

	const recordInsert = database.prepare(`
		INSERT INTO medical_records (id, pet_id, title, description, admitted_at, discharged_at, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
	`);
	for (const row of snapshots.medical_records) {
		const petId = mappedId(petIdMap, row.pet_id);
		if (!petId) continue;
		const created = ts(row, 'created_at', ts(row, 'updated_at'));
		recordInsert.run(recordIdMap.get(oldKey(row.id)), petId, row.title ?? null, row.description ?? null, row.admitted_at ?? null, row.discharged_at ?? null, created, updated(row, created), nullableRemovedAt(row));
	}

	const settingsInsert = database.prepare(`
		INSERT INTO app_settings (id, key, value, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.app_settings) {
		const created = ts(row, 'created_at', ts(row, 'updated_at'));
		settingsInsert.run(createUuidV7(), row.key, row.value ?? null, created, updated(row, created));
	}

	const backupInsert = database.prepare(`
		INSERT INTO backup_history (id, path, kind, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.backup_history) {
		const created = ts(row, 'created_at');
		backupInsert.run(backupIdMap.get(oldKey(row.id)), row.path, row.kind, created, updated(row, created));
	}

	const productInsert = database.prepare(`
		INSERT INTO user_product_catalog_items (id, type, name, normalized_name, species, aliases, manufacturer_id, manufacturer_name, regions, extension, hidden_at, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
	`);
	for (const row of snapshots.user_product_catalog_items) {
		const created = ts(row, 'created_at');
		productInsert.run(
			userProductIdMap.get(oldKey(row.id)),
			row.type,
			row.name,
			row.normalized_name,
			row.species ?? '["canine","feline"]',
			row.aliases ?? '[]',
			row.manufacturer_id ?? null,
			row.manufacturer_name ?? null,
			row.regions ?? '[]',
			row.extension ?? '{}',
			row.hidden_at ?? null,
			created,
			updated(row, created),
			nullableRemovedAt(row)
		);
	}

	const protocolInsert = database.prepare(`
		INSERT INTO treatment_protocols (id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
	`);
	for (const row of protocolRows) {
		const created = ts(row, 'created_at');
		protocolInsert.run(protocolIdMap.get(oldKey(row.id)), row.kind, row.name, row.normalized_name, row.species ?? '["canine","feline"]', row.observation ?? null, row.sort_order ?? 0, row.hidden_at ?? null, created, updated(row, created), nullableRemovedAt(row));
	}

	const protocolItemInsert = database.prepare(`
		INSERT OR IGNORE INTO treatment_protocol_items (id, protocol_id, catalog_item_id, sort_order, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.treatment_protocol_items) {
		const protocolId = mappedId(protocolIdMap, row.protocol_id);
		if (!protocolId) continue;
		const catalogItemId = userProductIdMap.get(oldKey(row.catalog_item_id)) ?? row.catalog_item_id;
		const created = ts(row, 'created_at');
		protocolItemInsert.run(protocolItemIdMap.get(oldKey(row.id)) ?? createUuidV7(), protocolId, catalogItemId, row.sort_order ?? 0, created, updated(row, created));
	}

	const protocolDoseInsert = database.prepare(`
		INSERT INTO treatment_protocol_doses (id, protocol_id, dose, validity_value, validity_unit, sort_order, created_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
	`);
	for (const row of snapshots.treatment_protocol_doses) {
		const protocolId = mappedId(protocolIdMap, row.protocol_id);
		if (!protocolId) continue;
		const created = ts(row, 'created_at');
		protocolDoseInsert.run(protocolDoseIdMap.get(oldKey(row.id)) ?? createUuidV7(), protocolId, row.dose, row.validity_value, row.validity_unit, row.sort_order ?? 0, created, updated(row, created));
	}

	const treatmentInsert = database.prepare(`
		INSERT INTO pet_treatments (id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, created_at, validity_ignored_at, updated_at, updated_by, removed_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
	`);
	for (const row of snapshots.pet_treatments) {
		const petId = mappedId(petIdMap, row.pet_id);
		if (!petId) continue;
		const created = ts(row, 'created_at');
		treatmentInsert.run(treatmentIdMap.get(oldKey(row.id)), petId, row.kind, row.applied_at, row.name, row.normalized_name, row.dose, row.validity_value, row.validity_unit, row.observation ?? null, created, row.validity_ignored_at ?? null, updated(row, created), nullableRemovedAt(row));
	}
}

function recreateIndexes(database) {
	database.exec(`
		CREATE INDEX IF NOT EXISTS idx_owners_name ON owners(name);
		CREATE INDEX IF NOT EXISTS idx_addresses_owner_id ON addresses(owner_id);
		CREATE INDEX IF NOT EXISTS idx_addresses_workplace_id ON addresses(workplace_id);
		CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON contacts(owner_id);
		CREATE INDEX IF NOT EXISTS idx_contacts_responsible_id ON contacts(responsible_id);
		CREATE INDEX IF NOT EXISTS idx_contacts_veterinarian_profile_id ON contacts(veterinarian_profile_id);
		CREATE INDEX IF NOT EXISTS idx_contacts_workplace_id ON contacts(workplace_id);
		CREATE INDEX IF NOT EXISTS idx_image_collections_entity ON image_collections(entity_type, entity_id);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_image_collection_items_primary ON image_collection_items(collection_id) WHERE is_primary = 1 AND removed_at IS NULL;
		CREATE INDEX IF NOT EXISTS idx_owner_additional_responsibles_owner_id ON owner_additional_responsibles(owner_id);
		CREATE INDEX IF NOT EXISTS idx_pet_owners_pet_id ON pet_owners(pet_id);
		CREATE INDEX IF NOT EXISTS idx_pet_owners_owner_id ON pet_owners(owner_id);
		CREATE INDEX IF NOT EXISTS idx_pets_name ON pets(name);
		CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id ON medical_records(pet_id);
		CREATE INDEX IF NOT EXISTS idx_user_product_catalog_items_type_name ON user_product_catalog_items(type, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_treatment_protocols_kind_name ON treatment_protocols(kind, name COLLATE NOCASE);
		CREATE INDEX IF NOT EXISTS idx_treatment_protocol_items_protocol_id ON treatment_protocol_items(protocol_id);
		CREATE INDEX IF NOT EXISTS idx_treatment_protocol_doses_protocol_id ON treatment_protocol_doses(protocol_id);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_pet_id ON pet_treatments(pet_id);
		CREATE INDEX IF NOT EXISTS idx_pet_treatments_removed_at ON pet_treatments(removed_at);
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
		const snapshots = {
			owners: readRows(database, 'owners'),
			veterinarian_profiles: readRows(database, 'veterinarian_profiles'),
			workplaces: readRows(database, 'workplaces'),
			addresses: readRows(database, 'addresses'),
			image_collections: readRows(database, 'image_collections'),
			image_collection_items: readRows(database, 'image_collection_items'),
			contacts: readRows(database, 'contacts'),
			owner_additional_responsibles: readRows(database, 'owner_additional_responsibles'),
			pets: readRows(database, 'pets'),
			pet_owners: readRows(database, 'pet_owners'),
			medical_records: readRows(database, 'medical_records'),
			app_settings: readRows(database, 'app_settings'),
			backup_history: readRows(database, 'backup_history'),
			user_product_catalog_items: readRows(database, 'user_product_catalog_items'),
			treatment_protocols: readRows(database, 'treatment_protocols'),
			treatment_protocol_items: readRows(database, 'treatment_protocol_items'),
			treatment_protocol_doses: readRows(database, 'treatment_protocol_doses'),
			pet_treatments: readRows(database, 'pet_treatments')
		};
		database.exec('BEGIN IMMEDIATE');
		try {
			createUserSchema(database);
			migrateUserRows(database, snapshots);
			recreateIndexes(database);
			database.prepare(
				`INSERT OR IGNORE INTO schema_migrations (version, name, app_version, applied_at)
				 VALUES (?, ?, ?, ?)`
			).run(CURRENT_SCHEMA_VERSION, '0001_baseline_current_schema', readAppVersion(), nowIsoWithoutMilliseconds());
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
createLogsDatabase(userLogsDatabasePath);
createNativeImportPackage();

console.log(`Generated ${userDatabasePath}`);
console.log(`Generated ${userMediaDatabasePath}`);
console.log(`Generated ${userLogsDatabasePath}`);
console.log(`Generated ${outputPackagePath}`);
