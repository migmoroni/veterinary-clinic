import {
	getDeletionAuditLogs,
	hardDeleteTrashItem,
	listTrashItems,
	emptyTrash,
	restoreTrashItem,
	type TrashItemId,
	type TrashKind
} from '@vet/core-local/repositories/trash.repository.js';

export async function loadTrash() {
	return listTrashItems();
}

export async function restoreFromTrash(kind: TrashKind, id: TrashItemId): Promise<void> {
	await restoreTrashItem(kind, id);
}

export async function deleteFromTrash(kind: TrashKind, id: TrashItemId): Promise<void> {
	await hardDeleteTrashItem(kind, id);
}

export async function purgeTrash(): Promise<void> {
	await emptyTrash();
}

export async function loadDeletionAuditLogs(limit?: number) {
	return getDeletionAuditLogs(limit);
}
