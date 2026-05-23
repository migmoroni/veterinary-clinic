import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineDoseType, VaccineDoseTypeInput, VaccineInput, VaccineValidityOption, VaccineValidityOptionInput } from '$lib/domain/vaccine/vaccine.js';
import {
	createVaccinations,
	deleteVaccineDoseType,
	deleteVaccineValidityOption,
	deleteVaccine,
	listVaccineDoseTypes,
	listVaccineValidityOptions,
	listVaccines,
	saveVaccineDoseType,
	saveVaccineValidityOption,
	saveVaccine,
	setVaccineDoseTypeHidden,
	setVaccineValidityOptionHidden,
	setVaccineHidden,
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

export async function loadVaccineDoseTypes(includeHidden = false): Promise<VaccineDoseType[]> {
	return listVaccineDoseTypes(includeHidden);
}

export async function saveDoseType(input: VaccineDoseTypeInput, id?: number): Promise<VaccineDoseType> {
	return saveVaccineDoseType(input, id);
}

export async function setDoseTypeHidden(id: number, hidden: boolean): Promise<VaccineDoseType> {
	return setVaccineDoseTypeHidden(id, hidden);
}

export async function removeDoseType(id: number): Promise<void> {
	await deleteVaccineDoseType(id);
}

export async function loadVaccineValidityOptions(includeHidden = false): Promise<VaccineValidityOption[]> {
	return listVaccineValidityOptions(includeHidden);
}

export async function saveValidityOption(input: VaccineValidityOptionInput, id?: number): Promise<VaccineValidityOption> {
	return saveVaccineValidityOption(input, id);
}

export async function setValidityOptionHidden(id: number, hidden: boolean): Promise<VaccineValidityOption> {
	return setVaccineValidityOptionHidden(id, hidden);
}

export async function removeValidityOption(id: number): Promise<void> {
	await deleteVaccineValidityOption(id);
}