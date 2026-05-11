import type { MedicalRecord } from '$lib/domain/medical-record/medical-record.js';
import type { Owner } from '$lib/domain/owner/owner.js';
import type { Pet, PetInput } from '$lib/domain/pet/pet.js';
import type { PetVaccination, VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
import { listRecordsByPet } from '$lib/persistence/repositories/medical-record.repository.js';
import { getOwner } from '$lib/persistence/repositories/owner.repository.js';
import { createPet, getPet, softDeletePet, updatePet } from '$lib/persistence/repositories/pet.repository.js';
import { listVaccinationsByPet, listVaccinePresets } from '$lib/persistence/repositories/vaccine.repository.js';

export interface PetProfile {
	pet: Pet;
	owner: Owner;
	records: MedicalRecord[];
	vaccinations: PetVaccination[];
	vaccinePresets: VaccinePreset[];
}

export async function loadPetProfile(petId: number): Promise<PetProfile> {
	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');

	const [owner, records, vaccinations, vaccinePresets] = await Promise.all([getOwner(pet.ownerId), listRecordsByPet(pet.id), listVaccinationsByPet(pet.id), listVaccinePresets()]);
	if (!owner) throw new Error('owner_not_found');

	return { pet, owner, records, vaccinations, vaccinePresets };
}

export async function saveNewPet(ownerId: number, input: PetInput): Promise<Pet> {
	return createPet(ownerId, input);
}

export async function savePet(petId: number, input: PetInput): Promise<Pet> {
	return updatePet(petId, input);
}

export async function removePet(petId: number): Promise<void> {
	await softDeletePet(petId);
}