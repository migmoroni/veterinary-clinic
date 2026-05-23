import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineDoseType, VaccineDoseTypeInput, VaccineInput, VaccineValidityOption, VaccineValidityOptionInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';
import { FIELD_LIMITS, assertTextLimit } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetVaccinationRow {
	id: number;
	pet_id: number;
	applied_at: string;
	vaccine_name: string;
	vaccine_normalized_name: string;
	dose_type: string;
	dose_number: number | null;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
	validity_ignored_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface VaccineRow {
	id: number;
	name: string;
	normalized_name: string;
	hidden_at: string | null;
	updated_at: string | null;
}

interface VaccineDoseTypeRow extends VaccineRow {
	requires_dose_number: number;
	sort_order: number;
}

interface VaccineValidityOptionRow {
	id: number;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
	sort_order: number;
	hidden_at: string | null;
	updated_at: string | null;
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
	if (value === 'days' || value === 'months') return value;
	throw new Error('vaccine_validity_required');
}

function normalizeValidityValue(value: number, unit: VaccineValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.vaccineValidityDays : FIELD_LIMITS.vaccineValidityMonths;
	if (normalized <= 0 || normalized > max) throw new Error('vaccine_validity_required');
	return normalized;
}

function normalizeCatalogName(value: string, error: string, maxLength: number): { name: string; normalizedName: string } {
	const name = requiredText(value, error, maxLength);
	const normalizedName = normalizeVaccineName(name);
	if (!normalizedName) throw new Error(error);
	assertTextLimit(normalizedName, FIELD_LIMITS.vaccineNormalizedName);
	return { name, normalizedName };
}

function normalizeVaccineInputName(value: string): { name: string; normalizedName: string } {
	return normalizeCatalogName(value, 'vaccine_name_required', FIELD_LIMITS.vaccineName);
}

function normalizeDoseType(value: string): string {
	return requiredText(value, 'vaccine_dose_required', FIELD_LIMITS.vaccineDoseType);
}

function normalizeDoseNumber(value: number | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	const normalized = Number.isInteger(value) ? value : 0;
	if (normalized <= 0 || normalized > FIELD_LIMITS.vaccineDoseNumber) throw new Error('vaccine_dose_required');
	return normalized;
}

function normalizeValidityOptionInput(input: VaccineValidityOptionInput): { validityValue: number; validityUnit: VaccineValidityUnit } {
	const validityUnit = normalizeValidityUnit(input.validityUnit);
	const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);
	return { validityValue, validityUnit };
}

function mapVaccine(row: VaccineRow): Vaccine {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

function mapDoseType(row: VaccineDoseTypeRow): VaccineDoseType {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		requiresDoseNumber: row.requires_dose_number === 1,
		sortOrder: row.sort_order,
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

function mapValidityOption(row: VaccineValidityOptionRow): VaccineValidityOption {
	return {
		id: row.id,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		sortOrder: row.sort_order,
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

function mapVaccination(row: PetVaccinationRow): PetVaccination {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		vaccineName: row.vaccine_name,
		vaccineNormalizedName: row.vaccine_normalized_name,
		doseType: row.dose_type,
		doseNumber: row.dose_number,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		validityIgnoredAt: row.validity_ignored_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function nextSortOrder(table: 'vaccine_dose_types' | 'vaccine_validity_options'): Promise<number> {
	const rows = await selectMany<{ next_order: number }>(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM ${table}`);
	return rows[0]?.next_order ?? 0;
}

async function getVaccinationRow(id: number): Promise<PetVaccinationRow | null> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_name, vaccine_normalized_name, dose_type, dose_number, validity_value, validity_unit, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_vaccinations
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);

	return rows[0] ?? null;
}

async function getVaccineByNormalizedName(normalizedName: string): Promise<Vaccine | null> {
	const rows = await selectMany<VaccineRow>(
		`SELECT id, name, normalized_name, hidden_at, updated_at
		 FROM vaccines
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);

	return rows[0] ? mapVaccine(rows[0]) : null;
}

async function ensureVaccine(name: string, normalizedName: string): Promise<Vaccine> {
	await execute(
		`INSERT INTO vaccines (name, normalized_name, updated_at)
		 VALUES ($1, $2, CURRENT_TIMESTAMP)
		 ON CONFLICT(normalized_name) DO UPDATE SET
			name = excluded.name,
			updated_at = CURRENT_TIMESTAMP`,
		[name, normalizedName]
	);

	const vaccine = await getVaccineByNormalizedName(normalizedName);
	if (!vaccine) throw new Error('vaccine_save_failed');
	return vaccine;
}

async function markPreviousEquivalentVaccinationsIgnored(petId: number, vaccineNormalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_vaccinations
		 WHERE pet_id = $1
			AND vaccine_normalized_name = $2
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[petId, vaccineNormalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_vaccinations
			 SET validity_ignored_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND validity_ignored_at IS NULL`,
			[row.id]
		);
	}
}

export async function listVaccines(includeHidden = false): Promise<Vaccine[]> {
	const rows = await selectMany<VaccineRow>(
		`SELECT id, name, normalized_name, hidden_at, updated_at
		 FROM vaccines
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`
	);

	return rows.map(mapVaccine);
}

export async function saveVaccine(input: VaccineInput, id?: number): Promise<Vaccine> {
	const { name, normalizedName } = normalizeVaccineInputName(input.name);

	if (id) {
		await execute(
			`UPDATE vaccines
			 SET name = $2,
				normalized_name = $3,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, name, normalizedName]
		);

		const rows = await selectMany<VaccineRow>(
			`SELECT id, name, normalized_name, hidden_at, updated_at
			 FROM vaccines
			 WHERE id = $1
			 LIMIT 1`,
			[id]
		);
		if (rows[0]) return mapVaccine(rows[0]);
		throw new Error('vaccine_save_failed');
	}

	return ensureVaccine(name, normalizedName);
}

export async function setVaccineHidden(id: number, hidden: boolean): Promise<Vaccine> {
	await execute(
		`UPDATE vaccines
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const rows = await selectMany<VaccineRow>(
		`SELECT id, name, normalized_name, hidden_at, updated_at
		 FROM vaccines
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	if (!rows[0]) throw new Error('vaccine_save_failed');
	return mapVaccine(rows[0]);
}

export async function deleteVaccine(id: number): Promise<void> {
	await execute('DELETE FROM vaccines WHERE id = $1', [id]);
}

export async function listVaccineDoseTypes(includeHidden = false): Promise<VaccineDoseType[]> {
	const rows = await selectMany<VaccineDoseTypeRow>(
		`SELECT id, name, normalized_name, requires_dose_number, sort_order, hidden_at, updated_at
		 FROM vaccine_dose_types
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY sort_order, name COLLATE NOCASE`
	);

	return rows.map(mapDoseType);
}

export async function saveVaccineDoseType(input: VaccineDoseTypeInput, id?: number): Promise<VaccineDoseType> {
	const { name, normalizedName } = normalizeCatalogName(input.name, 'vaccine_dose_required', FIELD_LIMITS.vaccineDoseType);
	const requiresDoseNumber = input.requiresDoseNumber ? 1 : 0;

	if (id) {
		await execute(
			`UPDATE vaccine_dose_types
			 SET name = $2,
				normalized_name = $3,
				requires_dose_number = $4,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, name, normalizedName, requiresDoseNumber]
		);
	} else {
		await execute(
			`INSERT INTO vaccine_dose_types (name, normalized_name, requires_dose_number, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			 ON CONFLICT(normalized_name) DO UPDATE SET
				name = excluded.name,
				requires_dose_number = excluded.requires_dose_number,
				updated_at = CURRENT_TIMESTAMP`,
			[name, normalizedName, requiresDoseNumber, await nextSortOrder('vaccine_dose_types')]
		);
	}

	const rows = await selectMany<VaccineDoseTypeRow>(
		`SELECT id, name, normalized_name, requires_dose_number, sort_order, hidden_at, updated_at
		 FROM vaccine_dose_types
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);
	if (!rows[0]) throw new Error('vaccine_save_failed');
	return mapDoseType(rows[0]);
}

export async function setVaccineDoseTypeHidden(id: number, hidden: boolean): Promise<VaccineDoseType> {
	await execute(
		`UPDATE vaccine_dose_types
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const rows = await selectMany<VaccineDoseTypeRow>(
		`SELECT id, name, normalized_name, requires_dose_number, sort_order, hidden_at, updated_at
		 FROM vaccine_dose_types
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	if (!rows[0]) throw new Error('vaccine_save_failed');
	return mapDoseType(rows[0]);
}

export async function deleteVaccineDoseType(id: number): Promise<void> {
	await execute('DELETE FROM vaccine_dose_types WHERE id = $1', [id]);
}

export async function listVaccineValidityOptions(includeHidden = false): Promise<VaccineValidityOption[]> {
	const rows = await selectMany<VaccineValidityOptionRow>(
		`SELECT id, validity_value, validity_unit, sort_order, hidden_at, updated_at
		 FROM vaccine_validity_options
		 WHERE ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY sort_order, validity_unit, validity_value`
	);

	return rows.map(mapValidityOption);
}

export async function saveVaccineValidityOption(input: VaccineValidityOptionInput, id?: number): Promise<VaccineValidityOption> {
	const { validityValue, validityUnit } = normalizeValidityOptionInput(input);

	if (id) {
		await execute(
			`UPDATE vaccine_validity_options
			 SET validity_value = $2,
				validity_unit = $3,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, validityValue, validityUnit]
		);
	} else {
		await execute(
			`INSERT INTO vaccine_validity_options (validity_value, validity_unit, sort_order, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
			 ON CONFLICT(validity_value, validity_unit) DO UPDATE SET
				updated_at = CURRENT_TIMESTAMP`,
			[validityValue, validityUnit, await nextSortOrder('vaccine_validity_options')]
		);
	}

	const rows = await selectMany<VaccineValidityOptionRow>(
		`SELECT id, validity_value, validity_unit, sort_order, hidden_at, updated_at
		 FROM vaccine_validity_options
		 WHERE validity_value = $1 AND validity_unit = $2
		 LIMIT 1`,
		[validityValue, validityUnit]
	);
	if (!rows[0]) throw new Error('vaccine_save_failed');
	return mapValidityOption(rows[0]);
}

export async function setVaccineValidityOptionHidden(id: number, hidden: boolean): Promise<VaccineValidityOption> {
	await execute(
		`UPDATE vaccine_validity_options
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const rows = await selectMany<VaccineValidityOptionRow>(
		`SELECT id, validity_value, validity_unit, sort_order, hidden_at, updated_at
		 FROM vaccine_validity_options
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	if (!rows[0]) throw new Error('vaccine_save_failed');
	return mapValidityOption(rows[0]);
}

export async function deleteVaccineValidityOption(id: number): Promise<void> {
	await execute('DELETE FROM vaccine_validity_options WHERE id = $1', [id]);
}

export async function listVaccinationsByPet(petId: number, includeDeleted = false): Promise<PetVaccination[]> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_name, vaccine_normalized_name, dose_type, dose_number, validity_value, validity_unit, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_vaccinations
		 WHERE pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
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
		const doseType = normalizeDoseType(input.doseType);
		const doseNumber = normalizeDoseNumber(input.doseNumber);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);

		await ensureVaccine(name, normalizedName);
		await execute(
			`INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_name, vaccine_normalized_name, dose_type, dose_number, validity_value, validity_unit, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[petId, appliedAt, name, normalizedName, doseType, doseNumber, validityValue, validityUnit]
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
		`UPDATE pet_vaccinations
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function setVaccinationValidityIgnored(id: number, ignored: boolean): Promise<PetVaccination> {
	await execute(
		`UPDATE pet_vaccinations
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);

	const row = await getVaccinationRow(id);
	if (!row || row.deleted_at) throw new Error('vaccination_not_found');
	return mapVaccination(row);
}
