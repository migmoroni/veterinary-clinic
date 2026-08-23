import type { SqliteDatabase } from '../../client.js';

export type Database = SqliteDatabase;

export type BaselineDetection = 'empty' | 'current-unversioned' | 'unknown-unversioned' | 'versioned';

export interface SchemaStatus {
	currentVersion: number;
	targetVersion: number;
	migrationRequired: boolean;
	detection: BaselineDetection;
	isSupported: boolean;
	reason?: 'future-version' | 'unknown-schema';
}

export interface TableColumnRow {
	name: string;
}

export interface TableNameRow {
	name: string;
}

export interface TableSqlRow {
	sql: string | null;
}

export interface UserVersionRow {
	user_version: number;
}

export interface CountRow {
	total: number;
}

