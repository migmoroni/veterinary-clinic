import { listOwnerAvatarBytesByIds } from '$lib/persistence/repositories/owner.repository.js';
import { listPetAvatarBytesByIds } from '$lib/persistence/repositories/pet.repository.js';

export async function loadOwnerAvatarsByOwnerIds(ownerIds: number[]): Promise<Map<number, Uint8Array | null>> {
	return listOwnerAvatarBytesByIds(ownerIds);
}

export async function loadPetAvatarsByPetIds(petIds: number[]): Promise<Map<number, Uint8Array | null>> {
	return listPetAvatarBytesByIds(petIds);
}