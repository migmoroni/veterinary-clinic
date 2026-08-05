import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '@vet/types/domain/shared/field-limits.js';
import type { ImageCollectionItemInput } from '@vet/types/domain/image-collection/image-collection.js';
import type { PetTreatment, PetTreatmentInput, TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind, TreatmentValidityUnit } from '@vet/types/domain/treatment/treatment.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { deleteProductCatalogItem, ensureTreatmentProductCatalogItem, getTreatmentProductCatalogItemById, listTreatmentProductCatalogItems, normalizeProductCatalogInput, saveProductCatalogItemImages, saveTreatmentProductCatalogItem, setProductCatalogItemHidden } from '@vet/modules/knowledge/repositories/product-catalog.repository.js';
import { execute, selectMany } from '@vet/core-local/sqlite/client.js';

interface PetTreatmentRow {
	id: string;
	pet_id: string;
	kind: TreatmentKind;
	applied_at: string;
	name: string;
	normalized_name: string;
	dose: string;
	validity_value: number;
	validity_unit: TreatmentValidityUnit;
	observation: string | null;
	validity_ignored_at: string | null;
	created_at: string | null;
	updated_at: string | null;
	removed_at: string | null;
}

interface TreatmentConfig {
	defaultValidityValue: number;
	defaultValidityUnit: TreatmentValidityUnit;
}

export const treatmentConfigs: Record<TreatmentKind, TreatmentConfig> = {
	vaccine: {
		defaultValidityValue: 12,
		defaultValidityUnit: 'months'
	},
	antiparasitic: {
		defaultValidityValue: 6,
		defaultValidityUnit: 'months'
	}
};

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

function normalizeValidityValue(value: number, unit: TreatmentValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.treatmentValidityDays : unit === 'months' ? FIELD_LIMITS.treatmentValidityMonths : FIELD_LIMITS.treatmentValidityYears;
	if (normalized <= 0 || normalized > max) throw new Error('treatment_validity_required');
	return normalized;
}

function normalizeDose(value: string): string {
	return requiredText(value, 'treatment_dose_required', FIELD_LIMITS.treatmentDose);
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
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		removedAt: row.removed_at
	};
}

async function getTreatmentRow(kind: TreatmentKind, id: string): Promise<PetTreatmentRow | null> {
	const rows = await selectMany<PetTreatmentRow>(
		`SELECT id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, created_at, updated_at, removed_at
		 FROM pet_treatments
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);

	return rows[0] ?? null;
}

async function markPreviousEquivalentTreatmentsIgnored(kind: TreatmentKind, petId: string, normalizedName: string): Promise<void> {
	const rows = await selectMany<{ id: string; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_treatments
		 WHERE kind = $1
			AND pet_id = $2
			AND normalized_name = $3
			AND removed_at IS NULL
		 ORDER BY applied_at DESC, id DESC`,
		[kind, petId, normalizedName]
	);

	const previousRows = rows.slice(1).filter((row) => !row.validity_ignored_at);

	for (const row of previousRows) {
		await execute(
			`UPDATE pet_treatments
			 SET validity_ignored_at = $3,
				updated_at = $3
			 WHERE id = $1 AND kind = $2 AND validity_ignored_at IS NULL`,
			[row.id, kind, nowIso()]
		);
	}
}

export async function listTreatmentCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	return listTreatmentProductCatalogItems(kind, includeHidden, includeImages);
}

export async function getTreatmentCatalogItem(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem | null> {
	return getTreatmentProductCatalogItemById(id, includeHidden, includeImages);
}

export async function saveTreatmentCatalogItem(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<TreatmentCatalogItem> {
	return saveTreatmentProductCatalogItem(kind, input, id);
}

export async function setTreatmentCatalogItemHidden(kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<TreatmentCatalogItem> {
	return setProductCatalogItemHidden(kind, id, hidden);
}

export async function saveTreatmentCatalogItemImages(kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	return saveProductCatalogItemImages(kind, id, images);
}

export async function deleteTreatmentCatalogItem(kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await deleteProductCatalogItem(kind, id);
}

export async function listTreatmentsByPet(kind: TreatmentKind, petId: string, includeRemoved = false): Promise<PetTreatment[]> {
	const rows = await selectMany<PetTreatmentRow>(
		`SELECT id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, validity_ignored_at, created_at, updated_at, removed_at
		 FROM pet_treatments
		 WHERE kind = $1 AND pet_id = $2 ${includeRemoved ? '' : 'AND removed_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[kind, petId]
	);

	return rows.map(mapTreatment);
}

export async function createTreatments(kind: TreatmentKind, petId: string, inputs: PetTreatmentInput[]): Promise<PetTreatment[]> {
	const affectedTreatments = new Set<string>();

	for (const input of inputs) {
		const appliedAt = requiredIsoDate(input.appliedAt);
		const { name, normalizedName } = normalizeProductCatalogInput(kind, input.name);
		const dose = normalizeDose(input.dose);
		const validityUnit = normalizeValidityUnit(input.validityUnit);
		const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);
		const observation = nullableMultilineText(input.observation, FIELD_LIMITS.treatmentObservation);

		await ensureTreatmentProductCatalogItem(kind, name, normalizedName);
		const createdAt = nowIso();
		await execute(
			`INSERT INTO pet_treatments (id, pet_id, kind, applied_at, name, normalized_name, dose, validity_value, validity_unit, observation, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
			[createUuidV7(), petId, kind, appliedAt, name, normalizedName, dose, validityValue, validityUnit, observation, createdAt]
		);
		affectedTreatments.add(normalizedName);
	}

	if (affectedTreatments.size === 0) return [];
	for (const normalizedName of affectedTreatments) {
		await markPreviousEquivalentTreatmentsIgnored(kind, petId, normalizedName);
	}

	return listTreatmentsByPet(kind, petId);
}

export async function softDeleteTreatment(kind: TreatmentKind, id: string): Promise<void> {
	const removedAt = nowIso();
	await execute(
		`UPDATE pet_treatments
		 SET removed_at = $3, updated_at = $3
		 WHERE id = $1 AND kind = $2 AND removed_at IS NULL`,
		[id, kind, removedAt]
	);
}

export async function setTreatmentValidityIgnored(kind: TreatmentKind, id: string, ignored: boolean): Promise<PetTreatment> {
	const updatedAt = nowIso();
	await execute(
		`UPDATE pet_treatments
		 SET validity_ignored_at = ${ignored ? 'COALESCE(validity_ignored_at, $3)' : 'NULL'},
			updated_at = $3
		 WHERE id = $1 AND kind = $2 AND removed_at IS NULL`,
		[id, kind, updatedAt]
	);

	const row = await getTreatmentRow(kind, id);
	if (!row || row.removed_at) throw new Error('treatment_not_found');
	return mapTreatment(row);
}
