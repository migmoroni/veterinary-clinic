import type { Owner, OwnerAssociatedContact, OwnerInput } from '@vet/types/domain/owner/owner.js';
import type { Pet } from '@vet/types/domain/pet/pet.js';
import {
	createOwner,
	getOwner,
	listOwnerAssociatedContactsByOwnerIds as listOwnerAssociatedContactsByOwnerIdsRepository,
	listOwners,
	listOwnersByPet as listOwnersByPetRepository,
	softDeleteOwner,
	updateOwner
} from '../repositories/owner.repository.js';
import { linkPetToOwner, listPetsByOwner } from '../repositories/pet.repository.js';

export interface OwnerProfile {
	owner: Owner;
	pets: Pet[];
}

export async function searchOwners(query = ''): Promise<Owner[]> {
	return listOwners(query);
}

export async function listOwnersByPet(petId: string, includeRemoved = false): Promise<Owner[]> {
	return listOwnersByPetRepository(petId, includeRemoved);
}

export async function listOwnerAssociatedContactsByOwnerIds(ownerIds: string[]): Promise<Map<string, OwnerAssociatedContact[]>> {
	return listOwnerAssociatedContactsByOwnerIdsRepository(ownerIds);
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
