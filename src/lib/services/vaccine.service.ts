import type { PetVaccination, PetVaccinationInput, VaccinePreset, VaccinePresetInput } from '$lib/domain/vaccine/vaccine.js';
import {
	createVaccinations,
	deleteVaccinePreset,
	listVaccinePresets,
	listUsedVaccinePresetDoseIds,
	listUsedVaccinePresetIds,
	saveVaccinePreset,
	setVaccinationValidityIgnored,
	softDeleteVaccination
} from '$lib/persistence/repositories/vaccine.repository.js';

export async function saveNewVaccinations(petId: number, inputs: PetVaccinationInput[]): Promise<PetVaccination[]> {
	return createVaccinations(petId, inputs);
}

export async function removeVaccination(id: number): Promise<void> {
	await softDeleteVaccination(id);
}

export async function setVaccinationValidity(vaccinationId: number, ignored: boolean): Promise<PetVaccination> {
	return setVaccinationValidityIgnored(vaccinationId, ignored);
}

export async function loadVaccinePresets(): Promise<VaccinePreset[]> {
	return listVaccinePresets();
}

export async function loadUsedPresetIds(): Promise<number[]> {
	return listUsedVaccinePresetIds();
}

export async function loadUsedDoseIds(): Promise<number[]> {
	return listUsedVaccinePresetDoseIds();
}

export async function savePreset(input: VaccinePresetInput, id?: number): Promise<VaccinePreset> {
	return saveVaccinePreset(input, id);
}

export async function removePreset(id: number): Promise<void> {
	await deleteVaccinePreset(id);
}