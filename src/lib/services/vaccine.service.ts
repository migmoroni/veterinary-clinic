import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineInput } from '$lib/domain/vaccine/vaccine.js';
import { createVaccinations, deleteVaccine, listVaccines, saveVaccine, setVaccineHidden, setVaccinationValidityIgnored, softDeleteVaccination } from '$lib/persistence/repositories/vaccine.repository.js';

export async function saveNewVaccinations(petId: number, inputs: PetVaccinationInput[]): Promise<PetVaccination[]> {
	return createVaccinations(petId, inputs);
}

export async function removeVaccination(id: number): Promise<void> {
	await softDeleteVaccination(id);
}

export async function setVaccinationValidity(vaccinationId: number, ignored: boolean): Promise<PetVaccination> {
	return setVaccinationValidityIgnored(vaccinationId, ignored);
}

export async function loadVaccines(includeHidden = false): Promise<Vaccine[]> {
	return listVaccines(includeHidden);
}

export async function saveVaccineName(input: VaccineInput, id?: number): Promise<Vaccine> {
	return saveVaccine(input, id);
}

export async function setVaccineNameHidden(id: number, hidden: boolean): Promise<Vaccine> {
	return setVaccineHidden(id, hidden);
}

export async function removeVaccineName(id: number): Promise<void> {
	await deleteVaccine(id);
}
