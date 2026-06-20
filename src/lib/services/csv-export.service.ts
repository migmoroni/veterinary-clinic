import type Database from '@tauri-apps/plugin-sql';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { addBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { getDatabase } from '$lib/persistence/sqlite/client.js';
import { CURRENT_SCHEMA_VERSION } from '$lib/persistence/sqlite/migrations.js';
import { CSV_SCHEMA_METADATA_PATH, CSV_TABLES, type CsvSchemaMetadata, type CsvTableDefinition } from './csv-database-format.js';

interface ZipEntry {
	path: string;
	data: Uint8Array;
}

interface UserVersionRow {
	user_version: number;
}

const textEncoder = new TextEncoder();

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

function timestampForExportFile(): string {
	return new Date().toISOString().replace(/[:.]/g, '-');
}

function makeCsvExportZipName(): string {
	return `export-veterinary-clinic-csv-${timestampForExportFile()}.zip`;
}

function csvEscape(value: unknown): string {
	if (value === null || typeof value === 'undefined') return '';
	const text = String(value);
	return /["\n\r,]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeFileToken(value: unknown, fallback: string): string {
	const token = String(value ?? fallback)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-zA-Z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);

	return token || fallback;
}

function binaryExtension(bytes: Uint8Array): string {
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png';
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg';
	if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'gif';
	if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
	return 'bin';
}

function crc32(data: Uint8Array): number {
	let crc = 0xffffffff;

	for (const byte of data) {
		crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()): { date: number; time: number } {
	const year = Math.max(1980, date.getFullYear());
	return {
		date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
	};
}

function writeUint16(output: number[], value: number): void {
	output.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(output: number[], value: number): void {
	output.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function appendBytes(output: number[], bytes: Uint8Array): void {
	for (const byte of bytes) output.push(byte);
}

function createZip(entries: ZipEntry[]): Uint8Array {
	const output: number[] = [];
	const centralDirectory: number[] = [];
	const { date, time } = dosDateTime();

	for (const entry of entries) {
		const pathBytes = textEncoder.encode(entry.path);
		const checksum = crc32(entry.data);
		const offset = output.length;

		writeUint32(output, 0x04034b50);
		writeUint16(output, 20);
		writeUint16(output, 0x0800);
		writeUint16(output, 0);
		writeUint16(output, time);
		writeUint16(output, date);
		writeUint32(output, checksum);
		writeUint32(output, entry.data.byteLength);
		writeUint32(output, entry.data.byteLength);
		writeUint16(output, pathBytes.byteLength);
		writeUint16(output, 0);
		appendBytes(output, pathBytes);
		appendBytes(output, entry.data);

		writeUint32(centralDirectory, 0x02014b50);
		writeUint16(centralDirectory, 20);
		writeUint16(centralDirectory, 20);
		writeUint16(centralDirectory, 0x0800);
		writeUint16(centralDirectory, 0);
		writeUint16(centralDirectory, time);
		writeUint16(centralDirectory, date);
		writeUint32(centralDirectory, checksum);
		writeUint32(centralDirectory, entry.data.byteLength);
		writeUint32(centralDirectory, entry.data.byteLength);
		writeUint16(centralDirectory, pathBytes.byteLength);
		writeUint16(centralDirectory, 0);
		writeUint16(centralDirectory, 0);
		writeUint16(centralDirectory, 0);
		writeUint16(centralDirectory, 0);
		writeUint32(centralDirectory, 0);
		writeUint32(centralDirectory, offset);
		appendBytes(centralDirectory, pathBytes);
	}

	const centralDirectoryOffset = output.length;
	appendBytes(output, Uint8Array.from(centralDirectory));

	writeUint32(output, 0x06054b50);
	writeUint16(output, 0);
	writeUint16(output, 0);
	writeUint16(output, entries.length);
	writeUint16(output, entries.length);
	writeUint32(output, centralDirectory.length);
	writeUint32(output, centralDirectoryOffset);
	writeUint16(output, 0);

	return Uint8Array.from(output);
}

async function exportTableCsv(database: Database, table: CsvTableDefinition): Promise<ZipEntry[]> {
	const binaryColumns = new Set(table.binaryColumns ?? []);
	const rows = await database.select<Record<string, unknown>[]>(`SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY ${table.orderBy}`);
	const lines = [table.columns.map(csvEscape).join(',')];
	const entries: ZipEntry[] = [];

	for (const [index, row] of rows.entries()) {
		const rowValues: string[] = [];

		for (const column of table.columns) {
			if (!binaryColumns.has(column)) {
				rowValues.push(csvEscape(row[column]));
				continue;
			}

			const bytes = normalizeByteArray(row[column]);
			if (!bytes || bytes.byteLength === 0) {
				rowValues.push('');
				continue;
			}

			const rowId = safeFileToken(row.id ?? row.key, `linha-${index + 1}`);
			const fileName = `${table.name}-${rowId}-${column}.${binaryExtension(bytes)}`;
			const relativePath = `binarios/${table.name}/${fileName}`;
			entries.push({ path: relativePath, data: bytes });
			rowValues.push(csvEscape(relativePath));
		}

		lines.push(rowValues.join(','));
	}

	return [{ path: `${table.name}.csv`, data: textEncoder.encode(`\ufeff${lines.join('\n')}\n`) }, ...entries];
}

async function exportSchemaMetadata(database: Database): Promise<ZipEntry> {
	const rows = await database.select<UserVersionRow[]>('PRAGMA user_version');
	const schemaVersion = rows[0]?.user_version ?? CURRENT_SCHEMA_VERSION;
	const metadata: CsvSchemaMetadata = {
		format: 'veterinary-clinic-csv',
		schemaVersion,
		exportedAt: new Date().toISOString()
	};

	return {
		path: CSV_SCHEMA_METADATA_PATH,
		data: textEncoder.encode(`${JSON.stringify(metadata, null, 2)}\n`)
	};
}

export async function exportDatabaseAsCsv(title: string): Promise<string | null> {
	const destinationPath = await save({
		title,
		defaultPath: makeCsvExportZipName(),
		filters: [{ name: 'ZIP', extensions: ['zip'] }]
	});

	if (!destinationPath) return null;

	const database = await getDatabase();
	const entries: ZipEntry[] = [];
	entries.push(await exportSchemaMetadata(database));

	for (const table of CSV_TABLES) {
		entries.push(...(await exportTableCsv(database, table)));
	}

	await writeFile(destinationPath, createZip(entries));
	await addBackupHistory(destinationPath, 'export');
	return destinationPath;
}
