import type { Antiparasitic, AntiparasiticInput, PetAntiparasiticTreatment, PetAntiparasiticTreatmentInput } from '$lib/domain/antiparasitic/antiparasitic.js';
import { createAntiparasiticTreatments, deleteAntiparasitic, listAntiparasitics, saveAntiparasitic, setAntiparasiticHidden, setAntiparasiticTreatmentValidityIgnored, softDeleteAntiparasiticTreatment } from '$lib/persistence/repositories/antiparasitic.repository.js';

export async function saveNewAntiparasiticTreatments(petId: number, inputs: PetAntiparasiticTreatmentInput[]): Promise<PetAntiparasiticTreatment[]> {
	return createAntiparasiticTreatments(petId, inputs);
}

export async function removeAntiparasiticTreatment(id: number): Promise<void> {
	await softDeleteAntiparasiticTreatment(id);
}

export async function setAntiparasiticTreatmentValidity(antiparasiticTreatmentId: number, ignored: boolean): Promise<PetAntiparasiticTreatment> {
	return setAntiparasiticTreatmentValidityIgnored(antiparasiticTreatmentId, ignored);
}

export async function loadAntiparasitics(includeHidden = false): Promise<Antiparasitic[]> {
	return listAntiparasitics(includeHidden);
}

export async function saveAntiparasiticName(input: AntiparasiticInput, id?: number): Promise<Antiparasitic> {
	return saveAntiparasitic(input, id);
}

export async function setAntiparasiticNameHidden(id: number, hidden: boolean): Promise<Antiparasitic> {
	return setAntiparasiticHidden(id, hidden);
}

export async function removeAntiparasiticName(id: number): Promise<void> {
	await deleteAntiparasitic(id);
}