import type { MedicalRecord } from '@vet/types/domain/medical-record/medical-record.js';
import type { Owner } from '@vet/types/domain/owner/owner.js';
import type { Pet, PetInput } from '@vet/types/domain/pet/pet.js';
import { TREATMENT_KINDS, type PetTreatment, type TreatmentCatalogItem, type TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import { listRecordsByPet } from '@vet/modules/medical_records/repositories/medical-record.repository.js';
import { listOwnersByPet } from '@vet/modules/registry/repositories/owner.repository.js';
import { createPet, getPet, linkPetToOwner, searchPetsForOwnerLink, softDeletePet, updatePet } from '@vet/modules/registry/repositories/pet.repository.js';
import { listTreatmentCatalogItems, listTreatmentsByPet } from '@vet/modules/medical_records/repositories/treatment.repository.js';

export interface PetProfile {
	pet: Pet;
	owners: Owner[];
	records: MedicalRecord[];
	treatments: Record<TreatmentKind, PetProfileTreatmentBundle>;
}

export interface PetProfileTreatmentBundle {
	treatments: PetTreatment[];
	catalogItems: TreatmentCatalogItem[];
}

export async function loadPetProfile(petId: string): Promise<PetProfile> {
	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');

	const [owners, records, treatmentEntries] = await Promise.all([
		listOwnersByPet(pet.id),
		listRecordsByPet(pet.id),
		Promise.all(
			TREATMENT_KINDS.map(async (kind) => {
				const [treatments, catalogItems] = await Promise.all([listTreatmentsByPet(kind, pet.id), listTreatmentCatalogItems(kind)]);
				return [kind, { treatments, catalogItems }] as const;
			})
		)
	]);

	return { pet, owners, records, treatments: Object.fromEntries(treatmentEntries) as Record<TreatmentKind, PetProfileTreatmentBundle> };
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
