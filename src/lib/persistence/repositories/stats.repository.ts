import { selectOne } from '$lib/persistence/sqlite/client.js';

interface CountRow {
	count: number;
}

async function countActive(table: 'owners' | 'pets' | 'medical_records'): Promise<number> {
	const row = await selectOne<CountRow>(`SELECT COUNT(*) AS count FROM ${table} WHERE deleted_at IS NULL`);
	return row?.count ?? 0;
}

export async function getClinicCounts() {
	const [owners, pets, records] = await Promise.all([
		countActive('owners'),
		countActive('pets'),
		countActive('medical_records')
	]);

	return { owners, pets, records };
}