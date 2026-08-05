import { listBackupHistory } from '@vet/core-local/repositories/backup.repository.js';
import { getDatabase } from '@vet/core-local/sqlite/client.js';

export async function getBackupHistory() {
	await getDatabase();
	return listBackupHistory();
}
