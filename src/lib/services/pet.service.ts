import type { MedicalRecord } from '$lib/domain/medical-record/medical-record.js';
import type { Antiparasitic, PetAntiparasiticTreatment } from '$lib/domain/antiparasitic/antiparasitic.js';
import type { Owner } from '$lib/domain/owner/owner.js';
import type { Pet, PetInput } from '$lib/domain/pet/pet.js';
import type { PetVaccination, Vaccine } from '$lib/domain/vaccine/vaccine.js';
import { listAntiparasitics, listAntiparasiticTreatmentsByPet } from '$lib/persistence/repositories/antiparasitic.repository.js';
import { listRecordsByPet } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnersByPet } from '$lib/persistence/repositories/owner.repository.js';
import { createPet, getPet, linkPetToOwner, searchPetsForOwnerLink, softDeletePet, updatePet } from '$lib/persistence/repositories/pet.repository.js';
import { listVaccinationsByPet, listVaccines } from '$lib/persistence/repositories/vaccine.repository.js';

export interface PetProfile {
	pet: Pet;
	owners: Owner[];
	records: MedicalRecord[];
	vaccinations: PetVaccination[];
	vaccines: Vaccine[];
	antiparasiticTreatments: PetAntiparasiticTreatment[];
	antiparasitics: Antiparasitic[];
}

export async function loadPetProfile(petId: number): Promise<PetProfile> {
	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');

	const [owners, records, vaccinations, vaccines, antiparasiticTreatments, antiparasitics] = await Promise.all([
		listOwnersByPet(pet.id),
		listRecordsByPet(pet.id),
		listVaccinationsByPet(pet.id),
		listVaccines(),
		listAntiparasiticTreatmentsByPet(pet.id),
		listAntiparasitics()
	]);

	return { pet, owners, records, vaccinations, vaccines, antiparasiticTreatments, antiparasitics };
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