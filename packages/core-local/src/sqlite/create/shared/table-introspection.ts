import { PRODUCT_TYPE_SQL_VALUES } from './catalog-sql.js';
import { quoteIdentifier } from './sql-utils.js';
import type { CountRow, Database, TableColumnRow, TableNameRow, TableSqlRow } from './types.js';

export async function tableHasColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${quoteIdentifier(table)})`);
	const names = new Set(rows.map((row) => row.name));
	return columns.every((column) => names.has(column));
}

export async function tableHasExactColumns(database: Database, table: string, columns: string[]): Promise<boolean> {
	const rows = await database.select<TableColumnRow[]>(`PRAGMA table_info(${quoteIdentifier(table)})`);
	const names = rows.map((row) => row.name);
	if (names.length !== columns.length) return false;
	return columns.every((column) => names.includes(column));
}

export async function tableExists(database: Database, table: string): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = $1 LIMIT 1", [table]);
	return rows.length > 0;
}

export async function tableSql(database: Database, table: string): Promise<string> {
	const rows = await database.select<TableSqlRow[]>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = $1 LIMIT 1", [table]);
	return rows[0]?.sql ?? '';
}

export async function productCatalogHasCurrentTypes(database: Database, table = 'product_catalog_items'): Promise<boolean> {
	const rows = await database.select<CountRow[]>(`SELECT COUNT(*) AS total FROM ${quoteIdentifier(table)} WHERE type NOT IN (${PRODUCT_TYPE_SQL_VALUES})`);
	return (rows[0]?.total ?? 0) === 0;
}

export async function isEmptyDatabase(database: Database): Promise<boolean> {
	const rows = await database.select<TableNameRow[]>(
		"SELECT name FROM sqlite_master WHERE type IN ('table', 'view', 'trigger', 'index') AND name NOT LIKE 'sqlite_%' LIMIT 1"
	);
	return rows.length === 0;
}

