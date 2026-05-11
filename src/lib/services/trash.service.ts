import { hardDeleteTrashItem, listTrashItems, purgeExpiredTrash, restoreTrashItem, type TrashKind } from '$lib/persistence/repositories/trash.repository.js';

export async function loadTrash() {
	return listTrashItems();
}

export async function restoreFromTrash(kind: TrashKind, id: number): Promise<void> {
	await restoreTrashItem(kind, id);
}

export async function deleteFromTrash(kind: TrashKind, id: number): Promise<void> {
	await hardDeleteTrashItem(kind, id);
}

export async function purgeTrash(): Promise<void> {
	await purgeExpiredTrash();
}