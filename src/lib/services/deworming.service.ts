import type { Dewormer, DewormerInput, PetDeworming, PetDewormingInput } from '$lib/domain/deworming/deworming.js';
import { createDewormings, deleteDewormer, listDewormers, saveDewormer, setDewormerHidden, setDewormingValidityIgnored, softDeleteDeworming } from '$lib/persistence/repositories/deworming.repository.js';

export async function saveNewDewormings(petId: number, inputs: PetDewormingInput[]): Promise<PetDeworming[]> {
	return createDewormings(petId, inputs);
}

export async function removeDeworming(id: number): Promise<void> {
	await softDeleteDeworming(id);
}

export async function setDewormingValidity(dewormingId: number, ignored: boolean): Promise<PetDeworming> {
	return setDewormingValidityIgnored(dewormingId, ignored);
}

export async function loadDewormers(includeHidden = false): Promise<Dewormer[]> {
	return listDewormers(includeHidden);
}

export async function saveDewormerName(input: DewormerInput, id?: number): Promise<Dewormer> {
	return saveDewormer(input, id);
}

export async function setDewormerNameHidden(id: number, hidden: boolean): Promise<Dewormer> {
	return setDewormerHidden(id, hidden);
}

export async function removeDewormerName(id: number): Promise<void> {
	await deleteDewormer(id);
}