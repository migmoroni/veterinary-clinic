import type { Dewormer, DewormerInput, DewormingValidityUnit, PetDeworming, PetDewormingInput } from '$lib/domain/deworming/deworming.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { deletePreventiveCatalogItem, ensurePreventiveCatalogItem, listPreventiveCatalogItems, normalizePreventiveCatalogInput, savePreventiveCatalogItem, setPreventiveCatalogItemHidden } from '$lib/persistence/repositories/preventive-catalog.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetDewormingRow {
	id: number;
	pet_id: number;
	applied_at: string;
	dewormer_name: string;
	dewormer_normalized_name: string;
	dose: string;
	validity_value: number;
	validity_unit: DewormingValidityUnit;
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

function normalizeValidityUnit(value: string): DewormingValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('deworming_validity_required');
}

function normalizeValidityValue(value: number, unit: DewormingValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.dewormingValidityDays : unit === 'months' ? FIELD_LIMITS.dewormingValidityMonths : FIELD_LIMITS.dewormingValidityYears;
	if (normalized <= 0 || normalized > max) throw new Error('deworming_validity_required');
	return normalized;
}

function normalizeDewormerInputName(value: string): { name: string; normalizedName: string } {
	return normalizePreventiveCatalogInput('dewormer', value);
}

function normalizeDose(value: string): string {
	return requiredText(value, 'deworming_dose_required', FIELD_LIMITS.dewormingDose);
}

function mapDeworming(row: PetDewormingRow): PetDeworming {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		dewormerName: row.dewormer_name,
		dewormerNormalizedName: row.dewormer_normalized_name,
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

async function getDewormingRow(id: number): Promise<PetDewormingRow | null> {
	const rows = await selectMany<PetDewormingRow>(
		`SELECT id, pet_id, applied_at, dewormer_name, dewormer_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_dewormings
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);

	return rows[0] ?? null;
}

async function ensureDewormer(name: string, normalizedName: string): Promise<Dewormer> {
	return ensurePreventiveCatalogItem('dewormer', name, normalizedName) as Promise<Dewormer>;
}

async function markPreviousEquivalentDewormingsIgnored(petId: number, dewormerNormalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_dewormings
		 WHERE pet_id = $1
			AND dewormer_normalized_name = $2
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[petId, dewormerNormalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_dewormings
			 SET validity_ignored_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND validity_ignored_at IS NULL`,
			[row.id]
		);
	}
}

export async function listDewormers(includeHidden = false): Promise<Dewormer[]> {
	return listPreventiveCatalogItems('dewormer', includeHidden) as Promise<Dewormer[]>;
}

export async function saveDewormer(input: DewormerInput, id?: number): Promise<Dewormer> {
	return savePreventiveCatalogItem('dewormer', input, id) as Promise<Dewormer>;
}

export async function setDewormerHidden(id: number, hidden: boolean): Promise<Dewormer> {
	return setPreventiveCatalogItemHidden('dewormer', id, hidden) as Promise<Dewormer>;
}

export async function deleteDewormer(id: number): Promise<void> {
	await deletePreventiveCatalogItem('dewormer', id);
}

export async function listDewormingsByPet(petId: number, includeDeleted = false): Promise<PetDeworming[]> {
	const rows = await selectMany<PetDewormingRow>(
		`SELECT id, pet_id, applied_at, dewormer_name, dewormer_normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_dewormings
		 WHERE pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[petId]
	);

	return rows.map(mapDeworming);
}

export async function createDewormings(petId: number, inputs: PetDewormingInput[]): Promise<PetDeworming[]> {
	const affectedDewormers = new Set<string>();

	for (const input of inputs) {
		const appliedAt = requiredIsoDate(input.appliedAt);
		const { name, normalizedName } = normalizeDewormerInputName(input.dewormerName);
		const dose = normalizeDose(input.dose);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);
		const observation = nullableMultilineText(input.observation, FIELD_LIMITS.dewormingObservation);

		await ensureDewormer(name, normalizedName);
		await execute(
			`INSERT INTO pet_dewormings (pet_id, applied_at, dewormer_name, dewormer_normalized_name, dose, validity_value, validity_unit, observation, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[petId, appliedAt, name, normalizedName, dose, validityValue, validityUnit, observation]
		);
		affectedDewormers.add(normalizedName);
	}

	if (affectedDewormers.size === 0) return [];
	for (const dewormerNormalizedName of affectedDewormers) {
		await markPreviousEquivalentDewormingsIgnored(petId, dewormerNormalizedName);
	}

	return listDewormingsByPet(petId);
}

export async function softDeleteDeworming(id: number): Promise<void> {
	const deletedAt = nowIso();
	await execute(
		`UPDATE pet_dewormings
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function setDewormingValidityIgnored(id: number, ignored: boolean): Promise<PetDeworming> {
	await execute(
		`UPDATE pet_dewormings
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);

	const row = await getDewormingRow(id);
	if (!row || row.deleted_at) throw new Error('deworming_not_found');
	return mapDeworming(row);
}