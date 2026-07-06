import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { deletePreventiveCatalogItem, ensurePreventiveCatalogItem, listPreventiveCatalogItems, normalizePreventiveCatalogInput, savePreventiveCatalogItem, setPreventiveCatalogItemHidden } from '$lib/persistence/repositories/preventive-catalog.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetVaccinationRow {
	id: number;
	pet_id: number;
	applied_at: string;
	vaccine_name: string;
	vaccine_normalized_name: string;
	dose: string;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
	observation: string | null;
	validity_ignored_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

function requiredText(value: string, error: string, maxLength?: number): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(error);
	if (maxLength !== undefined) assertTextLimit(trimmed, maxLength);
	return trimmed;
}

function requiredIsoDate(value: string): string {
	const trimmed = requiredText(value, 'date_invalid', FIELD_LIMITS.isoDate);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) throw new Error('date_invalid');
	return trimmed;
}

function normalizeValidityUnit(value: string): VaccineValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('vaccine_validity_required');
}

function normalizeValidityValue(value: number, unit: VaccineValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.vaccineValidityDays : unit === 'months' ? FIELD_LIMITS.vaccineValidityMonths : FIELD_LIMITS.vaccineValidityYears;
	if (normalized <= 0 || normalized > max) throw new Error('vaccine_validity_required');
	return normalized;
}

function normalizeVaccineInputName(value: string): { name: string; normalizedName: string } {
	return normalizePreventiveCatalogInput('vaccine', value);
}

function normalizeDose(value: string): string {
	return requiredText(value, 'vaccine_dose_required', FIELD_LIMITS.vaccineDose);
}

function mapVaccination(row: PetVaccinationRow): PetVaccination {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		vaccineName: row.vaccine_name,
		vaccineNormalizedName: row.vaccine_normalized_name,
		dose: row.dose,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		observation: row.observation,
		validityIgnoredAt: row.validity_ignored_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function getVaccinationRow(id: number): Promise<PetVaccinationRow | null> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, name AS vaccine_name, normalized_name AS vaccine_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_treatments
		 WHERE id = $1 AND kind = 'vaccine'
		 LIMIT 1`,
		[id]
	);

	return rows[0] ?? null;
}

async function ensureVaccine(name: string, normalizedName: string): Promise<Vaccine> {
	return ensurePreventiveCatalogItem('vaccine', name, normalizedName) as Promise<Vaccine>;
}

async function markPreviousEquivalentVaccinationsIgnored(petId: number, vaccineNormalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_treatments
		 WHERE kind = 'vaccine'
			AND pet_id = $1
			AND normalized_name = $2
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[petId, vaccineNormalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_treatments
			 SET validity_ignored_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND kind = 'vaccine' AND validity_ignored_at IS NULL`,
			[row.id]
		);
	}
}

export async function listVaccines(includeHidden = false): Promise<Vaccine[]> {
	return listPreventiveCatalogItems('vaccine', includeHidden) as Promise<Vaccine[]>;
}

export async function saveVaccine(input: VaccineInput, id?: number): Promise<Vaccine> {
	return savePreventiveCatalogItem('vaccine', input, id) as Promise<Vaccine>;
}

export async function setVaccineHidden(id: number, hidden: boolean): Promise<Vaccine> {
	return setPreventiveCatalogItemHidden('vaccine', id, hidden) as Promise<Vaccine>;
}

export async function deleteVaccine(id: number): Promise<void> {
	await deletePreventiveCatalogItem('vaccine', id);
}

export async function listVaccinationsByPet(petId: number, includeDeleted = false): Promise<PetVaccination[]> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, name AS vaccine_name, normalized_name AS vaccine_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_treatments
		 WHERE kind = 'vaccine' AND pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[petId]
	);

	return rows.map(mapVaccination);
}

export async function createVaccinations(petId: number, inputs: PetVaccinationInput[]): Promise<PetVaccination[]> {
	const affectedVaccines = new Set<string>();

	for (const input of inputs) {
		const appliedAt = requiredIsoDate(input.appliedAt);
		const { name, normalizedName } = normalizeVaccineInputName(input.vaccineName);
		const dose = normalizeDose(input.dose);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);
		const observation = nullableMultilineText(input.observation, FIELD_LIMITS.vaccinationObservation);

		await ensureVaccine(name, normalizedName);
		await execute(
			`INSERT INTO pet_treatments (pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, updated_at)
			 VALUES ($1, 'vaccine', $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[petId, appliedAt, name, normalizedName, dose, validityValue, validityUnit, observation]
		);
		affectedVaccines.add(normalizedName);
	}

	if (affectedVaccines.size === 0) return [];
	for (const vaccineNormalizedName of affectedVaccines) {
		await markPreviousEquivalentVaccinationsIgnored(petId, vaccineNormalizedName);
	}

	return listVaccinationsByPet(petId);
}

export async function softDeleteVaccination(id: number): Promise<void> {
	const deletedAt = nowIso();
	await execute(
		`UPDATE pet_treatments
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = 'vaccine' AND deleted_at IS NULL`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function setVaccinationValidityIgnored(id: number, ignored: boolean): Promise<PetVaccination> {
	await execute(
		`UPDATE pet_treatments
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = 'vaccine' AND deleted_at IS NULL`,
		[id]
	);

	const row = await getVaccinationRow(id);
	if (!row || row.deleted_at) throw new Error('vaccination_not_found');
	return mapVaccination(row);
}
