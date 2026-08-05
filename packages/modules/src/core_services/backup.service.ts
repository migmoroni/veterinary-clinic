import { listBackupHistory } from '@vet/modules/core_repositories/backup.repository.js';
import { getDatabase } from '@vet/core-local/sqlite/client.js';

export async function getBackupHistory() {
	await getDatabase();
	return listBackupHistory();
}
