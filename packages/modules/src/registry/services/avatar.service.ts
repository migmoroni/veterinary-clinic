import { listOwnerAvatarBytesByIds } from '@vet/modules/registry/repositories/owner.repository.js';
import { listPetAvatarBytesByIds } from '@vet/modules/registry/repositories/pet.repository.js';

export async function loadOwnerAvatarsByOwnerIds(ownerIds: string[]): Promise<Map<string, Uint8Array | null>> {
	return listOwnerAvatarBytesByIds(ownerIds);
}

export async function loadPetAvatarsByPetIds(petIds: string[]): Promise<Map<string, Uint8Array | null>> {
	return listPetAvatarBytesByIds(petIds);
}
