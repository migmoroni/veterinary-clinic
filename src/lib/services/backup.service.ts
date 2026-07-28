import { listBackupHistory } from '$lib/persistence/repositories/backup.repository.js';
import { getDatabase } from '$lib/persistence/sqlite/client.js';

export async function getBackupHistory() {
	await getDatabase();
	return listBackupHistory();
}
