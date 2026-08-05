import type { PetTreatment, PetTreatmentInput, TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import { createTreatments, setTreatmentValidityIgnored, softDeleteTreatment } from '../repositories/treatment.repository.js';

export async function saveNewTreatments(kind: TreatmentKind, petId: string, inputs: PetTreatmentInput[]): Promise<PetTreatment[]> {
	return createTreatments(kind, petId, inputs);
}

export async function removeTreatment(kind: TreatmentKind, id: string): Promise<void> {
	await softDeleteTreatment(kind, id);
}

export async function setTreatmentValidity(kind: TreatmentKind, treatmentId: string, ignored: boolean): Promise<PetTreatment> {
	return setTreatmentValidityIgnored(kind, treatmentId, ignored);
}
