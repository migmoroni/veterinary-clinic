import type Database from '@tauri-apps/plugin-sql';

export interface SchemaMigration {
	version: number;
	name: string;
	introducedInAppVersion: string;
	up(database: Database): Promise<void>;
	verify?(database: Database): Promise<void>;
}
