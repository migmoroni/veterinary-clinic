import type { Owner, OwnerInput } from '$lib/domain/owner/owner.js';
import type { Pet } from '$lib/domain/pet/pet.js';
import { createOwner, getOwner, listOwners, softDeleteOwner, updateOwner } from '$lib/persistence/repositories/owner.repository.js';
import { linkPetToOwner, listPetsByOwner } from '$lib/persistence/repositories/pet.repository.js';

export interface OwnerProfile {
	owner: Owner;
	pets: Pet[];
}

export async function searchOwners(query = ''): Promise<Owner[]> {
	return listOwners(query);
}

export async function loadOwnerProfile(ownerId: string): Promise<OwnerProfile> {
	const [owner, pets] = await Promise.all([getOwner(ownerId), listPetsByOwner(ownerId)]);
	if (!owner) throw new Error('owner_not_found');
	return { owner, pets };
}

export async function saveNewOwner(input: OwnerInput): Promise<Owner> {
	return createOwner(input);
}

export async function saveOwner(ownerId: string, input: OwnerInput): Promise<Owner> {
	return updateOwner(ownerId, input);
}

export async function addPetToOwner(ownerId: string, petId: string): Promise<Pet> {
	return linkPetToOwner(ownerId, petId);
}

export async function removeOwner(ownerId: string): Promise<void> {
	await softDeleteOwner(ownerId);
}
