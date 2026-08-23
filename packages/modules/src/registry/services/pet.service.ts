import type { Pet, PetInput } from '@vet/types/domain/pet/pet.js';
import { createPet, getPet, linkPetToOwner, searchPetsForOwnerLink, softDeletePet, updatePet } from '../repositories/pet.repository.js';

export async function loadPetById(petId: string, includeRemoved = false): Promise<Pet | null> {
	return getPet(petId, includeRemoved);
}

export async function saveNewPet(ownerId: string, input: PetInput): Promise<Pet> {
	return createPet(ownerId, input);
}

export async function searchExistingPetsForOwner(ownerId: string, query: string): Promise<Pet[]> {
	return searchPetsForOwnerLink(ownerId, query);
}

export async function addExistingPetToOwner(ownerId: string, petId: string): Promise<Pet> {
	return linkPetToOwner(ownerId, petId);
}

export async function savePet(petId: string, input: PetInput): Promise<Pet> {
	return updatePet(petId, input);
}

export async function removePet(petId: string): Promise<void> {
	await softDeletePet(petId);
}
