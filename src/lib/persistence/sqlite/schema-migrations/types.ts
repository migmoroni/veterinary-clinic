import type { SqliteDatabase as Database } from '../client.js';

export interface SchemaMigration {
	version: number;
	name: string;
	introducedInAppVersion: string;
	up(database: Database): Promise<void>;
	verify?(database: Database): Promise<void>;
}
