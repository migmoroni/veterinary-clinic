import Database from '@tauri-apps/plugin-sql';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { closeDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { createCurrentIndexes, CURRENT_SCHEMA_VERSION, runMigrations } from '$lib/persistence/sqlite/migrations.js';
import { ensureDatabaseDirectory, makeDatabaseCopyName, removeAppConfigFile, replaceDatabaseWithAppConfigFile } from '$lib/native/database-file.js';
import { clearClientStateAfterDatabaseImport } from './client-state.service.js';
import { CSV_SCHEMA_METADATA_PATH, CSV_TABLES, type CsvSchemaMetadata, type CsvTableDefinition } from './csv-database-format.js';

interface TableColumnInfo {
	name: string;
	type: string;
	notnull: number;
	pk: number;
}

interface CsvImportResult {
	importedPath: string;
	safetyBackupName: string;
}

type PreparedCell = { kind: 'literal'; sql: string } | { kind: 'parameter'; value: unknown };

interface PreparedRow {
	cells: PreparedCell[];
	parameterValues: unknown[];
	estimatedSqlLength: number;
}

interface ForeignKeyViolationRow {
	table: string;
	rowid: number;
	parent: string;
	fkid: number;
}

const textDecoder = new TextDecoder();
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const MAX_BATCH_ROWS = 100;
const MAX_BATCH_PARAMETERS = 500;
const MAX_BATCH_SQL_LENGTH = 250_000;

function readUint16(bytes: Uint8Array, offset: number): number {
	return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
	return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
	const minimumOffset = Math.max(0, bytes.byteLength - 0xffff - 22);

	for (let offset = bytes.byteLength - 22; offset >= minimumOffset; offset -= 1) {
		if (readUint32(bytes, offset) === ZIP_END_OF_CENTRAL_DIRECTORY) return offset;
	}

	throw new Error('csv_zip_invalid');
}

function readZipEntries(bytes: Uint8Array): Map<string, Uint8Array> {
	const endOffset = findEndOfCentralDirectory(bytes);
	const entryCount = readUint16(bytes, endOffset + 10);
	const centralDirectorySize = readUint32(bytes, endOffset + 12);
	const centralDirectoryOffset = readUint32(bytes, endOffset + 16);

	if (centralDirectoryOffset + centralDirectorySize > bytes.byteLength) throw new Error('csv_zip_invalid');

	const entries = new Map<string, Uint8Array>();
	let offset = centralDirectoryOffset;

	for (let index = 0; index < entryCount; index += 1) {
		if (readUint32(bytes, offset) !== ZIP_CENTRAL_DIRECTORY_HEADER) throw new Error('csv_zip_invalid');

		const flags = readUint16(bytes, offset + 8);
		const compressionMethod = readUint16(bytes, offset + 10);
		const compressedSize = readUint32(bytes, offset + 20);
		const uncompressedSize = readUint32(bytes, offset + 24);
		const fileNameLength = readUint16(bytes, offset + 28);
		const extraFieldLength = readUint16(bytes, offset + 30);
		const fileCommentLength = readUint16(bytes, offset + 32);
		const localHeaderOffset = readUint32(bytes, offset + 42);
		const fileNameStart = offset + 46;
		const path = textDecoder.decode(bytes.subarray(fileNameStart, fileNameStart + fileNameLength));

		if (!path.endsWith('/')) {
			if ((flags & 1) !== 0 || (flags & 8) !== 0 || compressionMethod !== 0 || compressedSize !== uncompressedSize) throw new Error('csv_zip_unsupported');
			if (entries.has(path)) throw new Error(`csv_zip_duplicate_entry:${path}`);
			if (readUint32(bytes, localHeaderOffset) !== ZIP_LOCAL_FILE_HEADER) throw new Error('csv_zip_invalid');

			const localNameLength = readUint16(bytes, localHeaderOffset + 26);
			const localExtraLength = readUint16(bytes, localHeaderOffset + 28);
			const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
			const dataEnd = dataStart + compressedSize;

			if (dataEnd > bytes.byteLength) throw new Error('csv_zip_invalid');
			entries.set(path, bytes.slice(dataStart, dataEnd));
		}

		offset = fileNameStart + fileNameLength + extraFieldLength + fileCommentLength;
	}

	return entries;
}

function readSchemaMetadata(entries: Map<string, Uint8Array>): CsvSchemaMetadata | null {
	const metadataBytes = entries.get(CSV_SCHEMA_METADATA_PATH);
	if (!metadataBytes) return null;

	let parsed: unknown;
	try {
		parsed = JSON.parse(textDecoder.decode(metadataBytes));
	} catch {
		throw new Error('csv_schema_metadata_invalid');
	}

	if (!parsed || typeof parsed !== 'object') throw new Error('csv_schema_metadata_invalid');
	const metadata = parsed as Partial<CsvSchemaMetadata>;
	const schemaVersion = metadata.schemaVersion;
	if (metadata.format !== 'veterinary-clinic-csv' || typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) throw new Error('csv_schema_metadata_invalid');
	if (schemaVersion > CURRENT_SCHEMA_VERSION) throw new Error(`csv_schema_from_future:${schemaVersion}`);

	return {
		format: 'veterinary-clinic-csv',
		schemaVersion,
		exportedAt: typeof metadata.exportedAt === 'string' ? metadata.exportedAt : ''
	};
}

function parseCsv(bytes: Uint8Array, path: string): string[][] {
	const text = textDecoder.decode(bytes).replace(/^\ufeff/, '');
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];

		if (inQuotes) {
			if (char === '"') {
				if (text[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += char;
			}
			continue;
		}

		if (char === '"') {
			if (field.length > 0) throw new Error(`csv_invalid_quote:${path}`);
			inQuotes = true;
			continue;
		}

		if (char === ',') {
			row.push(field);
			field = '';
			continue;
		}

		if (char === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			continue;
		}

		if (char !== '\r') field += char;
	}

	if (inQuotes) throw new Error(`csv_unclosed_quote:${path}`);
	if (field.length > 0 || row.length > 0) rows.push([...row, field]);

	return rows.filter((parsedRow) => !(parsedRow.length === 1 && parsedRow[0] === ''));
}

function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

function bytesToSqlLiteral(value: Uint8Array | null): string {
	if (!value || value.byteLength === 0) return 'NULL';
	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

function isNullableColumn(info: TableColumnInfo | undefined): boolean {
	return Boolean(info && info.notnull === 0 && info.pk === 0);
}

function isIntegerColumn(info: TableColumnInfo | undefined): boolean {
	return Boolean(info?.type.toUpperCase().includes('INT'));
}

function parseScalarValue(rawValue: string, table: CsvTableDefinition, column: string, info: TableColumnInfo | undefined): string | number | null {
	if (isIntegerColumn(info)) {
		if (rawValue === '') {
			if (isNullableColumn(info)) return null;
			throw new Error(`csv_required_value_missing:${table.name}.${column}`);
		}

		const value = Number(rawValue);
		if (!Number.isInteger(value)) throw new Error(`csv_invalid_integer:${table.name}.${column}`);
		return value;
	}

	if (rawValue === '' && isNullableColumn(info)) return null;
	return rawValue;
}

function validateHeader(table: CsvTableDefinition, rows: string[][], path: string): string[][] {
	if (rows.length === 0) throw new Error(`csv_missing_header:${path}`);

	const [header, ...dataRows] = rows;
	const headerMatches = header.length === table.columns.length && header.every((column, index) => column === table.columns[index]);
	if (!headerMatches) throw new Error(`csv_header_mismatch:${path}`);

	return dataRows;
}

async function getColumnInfo(database: Database, tableName: string): Promise<Map<string, TableColumnInfo>> {
	const rows = await database.select<TableColumnInfo[]>(`PRAGMA table_info(${quoteIdentifier(tableName)})`);
	return new Map(rows.map((row) => [row.name, row]));
}

function prepareRow(table: CsvTableDefinition, row: string[], binaryColumns: Set<string>, columnInfo: Map<string, TableColumnInfo>, entries: Map<string, Uint8Array>): PreparedRow {
	const cells: PreparedCell[] = [];
	const parameterValues: unknown[] = [];
	let estimatedSqlLength = 0;

	for (const [index, column] of table.columns.entries()) {
		const rawValue = row[index];

		if (binaryColumns.has(column)) {
			const binaryPath = rawValue.replace(/\\/g, '/');
			const binaryBytes = binaryPath ? entries.get(binaryPath) : null;
			if (binaryPath && !binaryBytes) throw new Error(`csv_binary_missing:${binaryPath}`);

			const sql = bytesToSqlLiteral(binaryBytes ?? null);
			cells.push({ kind: 'literal', sql });
			estimatedSqlLength += sql.length;
			continue;
		}

		const value = parseScalarValue(rawValue, table, column, columnInfo.get(column));
		cells.push({ kind: 'parameter', value });
		parameterValues.push(value);
		estimatedSqlLength += 4;
	}

	return { cells, parameterValues, estimatedSqlLength };
}

function renderRowValues(row: PreparedRow, startParameterIndex: number): string {
	let nextParameterIndex = startParameterIndex;

	return `(${row.cells
		.map((cell) => {
			if (cell.kind === 'literal') return cell.sql;
			nextParameterIndex += 1;
			return `$${nextParameterIndex}`;
		})
		.join(', ')})`;
}

async function importTable(database: Database, table: CsvTableDefinition, entries: Map<string, Uint8Array>): Promise<void> {
	const path = `${table.name}.csv`;
	const csvBytes = entries.get(path);
	if (!csvBytes) throw new Error(`csv_table_missing:${path}`);

	const rows = validateHeader(table, parseCsv(csvBytes, path), path);
	const binaryColumns = new Set(table.binaryColumns ?? []);
	const columnInfo = await getColumnInfo(database, table.name);
	const quotedColumns = table.columns.map(quoteIdentifier).join(', ');
	const insertPrefix = `INSERT INTO ${quoteIdentifier(table.name)} (${quotedColumns}) VALUES `;
	let batchRows: string[] = [];
	let batchValues: unknown[] = [];
	let batchSqlLength = insertPrefix.length;

	async function flushBatch(): Promise<void> {
		if (batchRows.length === 0) return;
		await database.execute(`${insertPrefix}${batchRows.join(', ')}`, batchValues);
		batchRows = [];
		batchValues = [];
		batchSqlLength = insertPrefix.length;
	}

	for (const row of rows) {
		if (row.length !== table.columns.length) throw new Error(`csv_row_column_count:${path}`);

		const preparedRow = prepareRow(table, row, binaryColumns, columnInfo, entries);
		const shouldFlush =
			batchRows.length > 0 &&
			(batchRows.length >= MAX_BATCH_ROWS || batchValues.length + preparedRow.parameterValues.length > MAX_BATCH_PARAMETERS || batchSqlLength + preparedRow.estimatedSqlLength > MAX_BATCH_SQL_LENGTH);

		if (shouldFlush) await flushBatch();

		batchRows.push(renderRowValues(preparedRow, batchValues.length));
		batchValues.push(...preparedRow.parameterValues);
		batchSqlLength += preparedRow.estimatedSqlLength;
	}

	await flushBatch();
}

async function importTables(database: Database, entries: Map<string, Uint8Array>): Promise<void> {
	await database.execute('PRAGMA foreign_keys = OFF');
	await database.execute('BEGIN IMMEDIATE');

	try {
		for (const table of CSV_TABLES) {
			await importTable(database, table, entries);
		}

		const violations = await database.select<ForeignKeyViolationRow[]>('PRAGMA foreign_key_check');
		if (violations.length > 0) {
			const violation = violations[0];
			throw new Error(`csv_foreign_key_violation:${violation.table}.${violation.rowid}->${violation.parent}`);
		}

		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	} finally {
		await database.execute('PRAGMA foreign_keys = ON');
	}
}

async function createIndexesAfterImport(database: Database): Promise<void> {
	await database.execute('BEGIN IMMEDIATE');
	try {
		await createCurrentIndexes(database);
		await database.execute('COMMIT');
	} catch (error) {
		await database.execute('ROLLBACK').catch(() => undefined);
		throw error;
	}
}

async function restoreCsvSchemaVersion(database: Database, metadata: CsvSchemaMetadata | null): Promise<void> {
	const schemaVersion = metadata?.schemaVersion ?? CURRENT_SCHEMA_VERSION;
	if (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > CURRENT_SCHEMA_VERSION) throw new Error(`csv_schema_version_unsupported:${schemaVersion}`);
	await database.execute(`PRAGMA user_version = ${schemaVersion}`);
}

async function buildDatabaseFromCsvZip(tempName: string, archive: Uint8Array): Promise<void> {
	const databaseUrl = `sqlite:${tempName}`;
	await ensureDatabaseDirectory();
	await removeAppConfigFile(tempName);

	const database = await Database.load(databaseUrl);
	try {
		await database.execute('PRAGMA foreign_keys = ON');
		await runMigrations(database, { seedDefaultData: false, createIndexes: false });

		const entries = readZipEntries(archive);
		const schemaMetadata = readSchemaMetadata(entries);
		await importTables(database, entries);
		await createIndexesAfterImport(database);
		await restoreCsvSchemaVersion(database, schemaMetadata);
	} finally {
		await database.close(databaseUrl);
	}
}

export async function importDatabaseFromCsv(title: string): Promise<CsvImportResult | null> {
	const selectedPath = await open({
		title,
		multiple: false,
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!selectedPath || Array.isArray(selectedPath)) return null;

	const tempName = makeDatabaseCopyName('csv-import-candidate');

	try {
		await buildDatabaseFromCsvZip(tempName, await readFile(selectedPath));
		await closeDatabase();
		const safetyBackupName = await replaceDatabaseWithAppConfigFile(tempName);
		await getDatabase();
		await addBackupHistory(selectedPath, 'import');
		if (safetyBackupName) await addBackupHistory(safetyBackupName, 'pre_import_backup');
		clearClientStateAfterDatabaseImport();
		return { importedPath: selectedPath, safetyBackupName: safetyBackupName ?? '' };
	} catch (error) {
		await removeAppConfigFile(tempName);
		throw error;
	}
}
