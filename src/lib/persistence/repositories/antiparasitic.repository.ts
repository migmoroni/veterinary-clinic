import type { Antiparasitic, AntiparasiticInput, AntiparasiticValidityUnit, PetAntiparasiticTreatment, PetAntiparasiticTreatmentInput } from '$lib/domain/antiparasitic/antiparasitic.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { deletePreventiveCatalogItem, ensurePreventiveCatalogItem, listPreventiveCatalogItems, normalizePreventiveCatalogInput, savePreventiveCatalogItem, setPreventiveCatalogItemHidden } from '$lib/persistence/repositories/preventive-catalog.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetAntiparasiticTreatmentRow {
	id: number;
	pet_id: number;
	applied_at: string;
	antiparasitic_name: string;
	antiparasitic_normalized_name: string;
	dose: string;
	validity_value: number;
	validity_unit: AntiparasiticValidityUnit;
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

function normalizeValidityUnit(value: string): AntiparasiticValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('antiparasitic_treatment_validity_required');
}

function normalizeValidityValue(value: number, unit: AntiparasiticValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.antiparasiticTreatmentValidityDays : unit === 'months' ? FIELD_LIMITS.antiparasiticTreatmentValidityMonths : FIELD_LIMITS.antiparasiticTreatmentValidityYears;
	if (normalized <= 0 || normalized > max) throw new Error('antiparasitic_treatment_validity_required');
	return normalized;
}

function normalizeAntiparasiticInputName(value: string): { name: string; normalizedName: string } {
	return normalizePreventiveCatalogInput('antiparasitic', value);
}

function normalizeDose(value: string): string {
	return requiredText(value, 'antiparasitic_treatment_dose_required', FIELD_LIMITS.antiparasiticTreatmentDose);
}

function mapAntiparasiticTreatment(row: PetAntiparasiticTreatmentRow): PetAntiparasiticTreatment {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		antiparasiticName: row.antiparasitic_name,
		antiparasiticNormalizedName: row.antiparasitic_normalized_name,
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

async function getAntiparasiticTreatmentRow(id: number): Promise<PetAntiparasiticTreatmentRow | null> {
	const rows = await selectMany<PetAntiparasiticTreatmentRow>(
		`SELECT id, pet_id, applied_at, antiparasitic_name, antiparasitic_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_antiparasitic_treatments
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);

	return rows[0] ?? null;
}

async function ensureAntiparasitic(name: string, normalizedName: string): Promise<Antiparasitic> {
	return ensurePreventiveCatalogItem('antiparasitic', name, normalizedName) as Promise<Antiparasitic>;
}

async function markPreviousEquivalentAntiparasiticTreatmentsIgnored(petId: number, antiparasiticNormalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_antiparasitic_treatments
		 WHERE pet_id = $1
			AND antiparasitic_normalized_name = $2
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[petId, antiparasiticNormalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_antiparasitic_treatments
			 SET validity_ignored_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND validity_ignored_at IS NULL`,
			[row.id]
		);
	}
}

export async function listAntiparasitics(includeHidden = false): Promise<Antiparasitic[]> {
	return listPreventiveCatalogItems('antiparasitic', includeHidden) as Promise<Antiparasitic[]>;
}

export async function saveAntiparasitic(input: AntiparasiticInput, id?: number): Promise<Antiparasitic> {
	return savePreventiveCatalogItem('antiparasitic', input, id) as Promise<Antiparasitic>;
}

export async function setAntiparasiticHidden(id: number, hidden: boolean): Promise<Antiparasitic> {
	return setPreventiveCatalogItemHidden('antiparasitic', id, hidden) as Promise<Antiparasitic>;
}

export async function deleteAntiparasitic(id: number): Promise<void> {
	await deletePreventiveCatalogItem('antiparasitic', id);
}

export async function listAntiparasiticTreatmentsByPet(petId: number, includeDeleted = false): Promise<PetAntiparasiticTreatment[]> {
	const rows = await selectMany<PetAntiparasiticTreatmentRow>(
		`SELECT id, pet_id, applied_at, antiparasitic_name, antiparasitic_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_antiparasitic_treatments
		 WHERE pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[petId]
	);

	return rows.map(mapAntiparasiticTreatment);
}

export async function createAntiparasiticTreatments(petId: number, inputs: PetAntiparasiticTreatmentInput[]): Promise<PetAntiparasiticTreatment[]> {
	const affectedAntiparasitics = new Set<string>();

	for (const input of inputs) {
		const appliedAt = requiredIsoDate(input.appliedAt);
		const { name, normalizedName } = normalizeAntiparasiticInputName(input.antiparasiticName);
		const dose = normalizeDose(input.dose);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);
		const observation = nullableMultilineText(input.observation, FIELD_LIMITS.antiparasiticTreatmentObservation);

		await ensureAntiparasitic(name, normalizedName);
		await execute(
			`INSERT INTO pet_antiparasitic_treatments (pet_id, applied_at, antiparasitic_name, antiparasitic_normalized_name, dose, validity_value, validity_unit, observation, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[petId, appliedAt, name, normalizedName, dose, validityValue, validityUnit, observation]
		);
		affectedAntiparasitics.add(normalizedName);
	}

	if (affectedAntiparasitics.size === 0) return [];
	for (const antiparasiticNormalizedName of affectedAntiparasitics) {
		await markPreviousEquivalentAntiparasiticTreatmentsIgnored(petId, antiparasiticNormalizedName);
	}

	return listAntiparasiticTreatmentsByPet(petId);
}

export async function softDeleteAntiparasiticTreatment(id: number): Promise<void> {
	const deletedAt = nowIso();
	await execute(
		`UPDATE pet_antiparasitic_treatments
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function setAntiparasiticTreatmentValidityIgnored(id: number, ignored: boolean): Promise<PetAntiparasiticTreatment> {
	await execute(
		`UPDATE pet_antiparasitic_treatments
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);

	const row = await getAntiparasiticTreatmentRow(id);
	if (!row || row.deleted_at) throw new Error('antiparasitic_treatment_not_found');
	return mapAntiparasiticTreatment(row);
}