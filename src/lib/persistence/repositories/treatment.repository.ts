import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import type { PetTreatment, PetTreatmentInput, TreatmentCatalogItem, TreatmentCatalogItemInput, TreatmentKind, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { deletePreventiveCatalogItem, ensurePreventiveCatalogItem, listPreventiveCatalogItems, normalizePreventiveCatalogInput, savePreventiveCatalogItem, setPreventiveCatalogItemHidden } from '$lib/persistence/repositories/preventive-catalog.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetTreatmentRow {
	id: number;
	pet_id: number;
	kind: TreatmentKind;
	applied_at: string;
	name: string;
	normalized_name: string;
	dose: string;
	validity_value: number;
	validity_unit: TreatmentValidityUnit;
	observation: string | null;
	validity_ignored_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface TreatmentConfig {
	nameLimit: number;
	doseLimit: number;
	observationLimit: number;
	validityDaysLimit: number;
	validityMonthsLimit: number;
	validityYearsLimit: number;
	defaultValidityValue: number;
	defaultValidityUnit: TreatmentValidityUnit;
}

export const treatmentConfigs: Record<TreatmentKind, TreatmentConfig> = {
	vaccine: {
		nameLimit: FIELD_LIMITS.vaccineName,
		doseLimit: FIELD_LIMITS.vaccineDose,
		observationLimit: FIELD_LIMITS.vaccinationObservation,
		validityDaysLimit: FIELD_LIMITS.vaccineValidityDays,
		validityMonthsLimit: FIELD_LIMITS.vaccineValidityMonths,
		validityYearsLimit: FIELD_LIMITS.vaccineValidityYears,
		defaultValidityValue: 12,
		defaultValidityUnit: 'months'
	},
	antiparasitic: {
		nameLimit: FIELD_LIMITS.antiparasiticName,
		doseLimit: FIELD_LIMITS.antiparasiticTreatmentDose,
		observationLimit: FIELD_LIMITS.antiparasiticTreatmentObservation,
		validityDaysLimit: FIELD_LIMITS.antiparasiticTreatmentValidityDays,
		validityMonthsLimit: FIELD_LIMITS.antiparasiticTreatmentValidityMonths,
		validityYearsLimit: FIELD_LIMITS.antiparasiticTreatmentValidityYears,
		defaultValidityValue: 6,
		defaultValidityUnit: 'months'
	}
};

function configFor(kind: TreatmentKind): TreatmentConfig {
	return treatmentConfigs[kind];
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

function normalizeValidityUnit(value: string): TreatmentValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('treatment_validity_required');
}

function normalizeValidityValue(kind: TreatmentKind, value: number, unit: TreatmentValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const config = configFor(kind);
	const max = unit === 'days' ? config.validityDaysLimit : unit === 'months' ? config.validityMonthsLimit : config.validityYearsLimit;
	if (normalized <= 0 || normalized > max) throw new Error('treatment_validity_required');
	return normalized;
}

function normalizeDose(kind: TreatmentKind, value: string): string {
	return requiredText(value, 'treatment_dose_required', configFor(kind).doseLimit);
}

function mapTreatment(row: PetTreatmentRow): PetTreatment {
	return {
		id: row.id,
		petId: row.pet_id,
		kind: row.kind,
		appliedAt: row.applied_at,
		name: row.name,
		normalizedName: row.normalized_name,
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

async function getTreatmentRow(kind: TreatmentKind, id: number): Promise<PetTreatmentRow | null> {
	const rows = await selectMany<PetTreatmentRow>(
		`SELECT id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_treatments
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);

	return rows[0] ?? null;
}

async function markPreviousEquivalentTreatmentsIgnored(kind: TreatmentKind, petId: number, normalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_treatments
		 WHERE kind = $1
			AND pet_id = $2
			AND normalized_name = $3
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[kind, petId, normalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_treatments
			 SET validity_ignored_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND kind = $2 AND validity_ignored_at IS NULL`,
			[row.id, kind]
		);
	}
}

export async function listTreatmentCatalogItems(kind: TreatmentKind, includeHidden = false): Promise<TreatmentCatalogItem[]> {
	return listPreventiveCatalogItems(kind, includeHidden);
}

export async function saveTreatmentCatalogItem(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: number): Promise<TreatmentCatalogItem> {
	return savePreventiveCatalogItem(kind, input, id);
}

export async function setTreatmentCatalogItemHidden(kind: TreatmentKind, id: number, hidden: boolean): Promise<TreatmentCatalogItem> {
	return setPreventiveCatalogItemHidden(kind, id, hidden);
}

export async function deleteTreatmentCatalogItem(kind: TreatmentKind, id: number): Promise<void> {
	await deletePreventiveCatalogItem(kind, id);
}

export async function listTreatmentsByPet(kind: TreatmentKind, petId: number, includeDeleted = false): Promise<PetTreatment[]> {
	const rows = await selectMany<PetTreatmentRow>(
		`SELECT id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_treatments
		 WHERE kind = $1 AND pet_id = $2 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[kind, petId]
	);

	return rows.map(mapTreatment);
}

export async function createTreatments(kind: TreatmentKind, petId: number, inputs: PetTreatmentInput[]): Promise<PetTreatment[]> {
	const affectedTreatments = new Set<string>();

	for (const input of inputs) {
		const appliedAt = requiredIsoDate(input.appliedAt);
		const { name, normalizedName } = normalizePreventiveCatalogInput(kind, input.name);
		const dose = normalizeDose(kind, input.dose);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(kind, Number(input.validityValue), validityUnit);
		const observation = nullableMultilineText(input.observation, configFor(kind).observationLimit);

		await ensurePreventiveCatalogItem(kind, name, normalizedName);
		await execute(
			`INSERT INTO pet_treatments (pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
			[petId, kind, appliedAt, name, normalizedName, dose, validityValue, validityUnit, observation]
		);
		affectedTreatments.add(normalizedName);
	}

	if (affectedTreatments.size === 0) return [];
	for (const normalizedName of affectedTreatments) {
		await markPreviousEquivalentTreatmentsIgnored(kind, petId, normalizedName);
	}

	return listTreatmentsByPet(kind, petId);
}

export async function softDeleteTreatment(kind: TreatmentKind, id: number): Promise<void> {
	const deletedAt = nowIso();
	await execute(
		`UPDATE pet_treatments
		 SET deleted_at = $3, purge_after = $4, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = $2 AND deleted_at IS NULL`,
		[id, kind, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function setTreatmentValidityIgnored(kind: TreatmentKind, id: number, ignored: boolean): Promise<PetTreatment> {
	await execute(
		`UPDATE pet_treatments
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = $2 AND deleted_at IS NULL`,
		[id, kind]
	);

	const row = await getTreatmentRow(kind, id);
	if (!row || row.deleted_at) throw new Error('treatment_not_found');
	return mapTreatment(row);
}
