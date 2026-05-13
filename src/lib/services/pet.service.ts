import type { MedicalRecord } from '$lib/domain/medical-record/medical-record.js';
import type { Owner } from '$lib/domain/owner/owner.js';
import type { Pet, PetInput } from '$lib/domain/pet/pet.js';
import type { PetVaccination, VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
import { listRecordsByPet } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnersByPet } from '$lib/persistence/repositories/owner.repository.js';
import { createPet, getPet, linkPetToOwner, searchPetsForOwnerLink, softDeletePet, updatePet } from '$lib/persistence/repositories/pet.repository.js';
import { listVaccinationsByPet, listVaccinePresets } from '$lib/persistence/repositories/vaccine.repository.js';

export interface PetProfile {
	pet: Pet;
	owner: Owner | null;
	owners: Owner[];
	records: MedicalRecord[];
	vaccinations: PetVaccination[];
	vaccinePresets: VaccinePreset[];
}

export async function loadPetProfile(petId: number, ownerId?: number): Promise<PetProfile> {
	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');

	const [owners, records, vaccinations, vaccinePresets] = await Promise.all([listOwnersByPet(pet.id), listRecordsByPet(pet.id), listVaccinationsByPet(pet.id), listVaccinePresets()]);
	const owner = owners.find((item) => item.id === ownerId) ?? owners[0] ?? null;

	return { pet, owner, owners, records, vaccinations, vaccinePresets };
}

export async function saveNewPet(ownerId: number, input: PetInput): Promise<Pet> {
	return createPet(ownerId, input);
}

export async function searchExistingPetsForOwner(ownerId: number, query: string): Promise<Pet[]> {
	return searchPetsForOwnerLink(ownerId, query);
}

export async function addExistingPetToOwner(ownerId: number, petId: number): Promise<Pet> {
	return linkPetToOwner(ownerId, petId);
}

export async function savePet(petId: number, input: PetInput): Promise<Pet> {
	return updatePet(petId, input);
}

export async function removePet(petId: number): Promise<void> {
	await softDeletePet(petId);
}