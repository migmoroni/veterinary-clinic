import type { MedicalRecord } from '@vet/types/domain/medical-record/medical-record.js';
import type { Owner } from '@vet/types/domain/owner/owner.js';
import type { Pet } from '@vet/types/domain/pet/pet.js';
import { TREATMENT_KINDS, type PetTreatment, type TreatmentCatalogItem, type TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import { getPet } from '@vet/modules/registry/pets';
import { listOwnersByPet } from '@vet/modules/registry/owners';
import { listRecordsByPet } from '@vet/modules/medical_records/records';
import { listTreatmentsByPet } from '@vet/modules/medical_records/treatments';
import { loadTreatmentCatalogItems } from '@vet/modules/knowledge/products';

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
				const [treatments, catalogItems] = await Promise.all([listTreatmentsByPet(kind, pet.id), loadTreatmentCatalogItems(kind)]);
				return [kind, { treatments, catalogItems }] as const;
			})
		)
	]);

	return { pet, owners, records, treatments: Object.fromEntries(treatmentEntries) as Record<TreatmentKind, PetProfileTreatmentBundle> };
}
