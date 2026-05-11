import type { PetVaccination, PetVaccinationInput, VaccinePreset, VaccinePresetInput } from '$lib/domain/vaccine/vaccine.js';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetVaccinationRow {
	id: number;
	pet_id: number;
	applied_at: string;
	vaccine_preset_id: number;
	vaccine_name: string;
	validity_ignored_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface VaccinePresetRow {
	id: number;
	name: string;
	normalized_name: string;
	validity_months: number;
	updated_at: string | null;
}

interface CountRow {
	count: number;
}

interface UsedPresetRow {
	vaccine_preset_id: number;
}

function requiredText(value: string, error: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(error);
	return trimmed;
}

function normalizeValidity(value: number): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	return Math.max(0, normalized);
}

function requiredPresetId(value: number): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw new Error('vaccine_preset_required');
	return id;
}

function mapVaccination(row: PetVaccinationRow): PetVaccination {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		vaccinePresetId: row.vaccine_preset_id,
		vaccineName: row.vaccine_name,
		validityIgnoredAt: row.validity_ignored_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function getVaccinationRow(id: number): Promise<PetVaccinationRow | null> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_name, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_vaccinations
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);

	return rows[0] ?? null;
}

async function markPreviousEquivalentVaccinationsIgnored(petId: number, vaccinePresetId: number): Promise<void> {
	const rows = await selectMany<{ id: number; validity_ignored_at: string | null }>(
		`SELECT id, validity_ignored_at
		 FROM pet_vaccinations
		 WHERE pet_id = $1
			AND vaccine_preset_id = $2
			AND deleted_at IS NULL
		 ORDER BY applied_at DESC, id DESC
		`,
		[petId, vaccinePresetId]
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

function mapPreset(row: VaccinePresetRow): VaccinePreset {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		validityMonths: row.validity_months,
		updatedAt: row.updated_at
	};
}

export async function listVaccinationsByPet(petId: number, includeDeleted = false): Promise<PetVaccination[]> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_name, validity_ignored_at, updated_at, deleted_at, purge_after
		 FROM pet_vaccinations
		 WHERE pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY applied_at DESC, id DESC`,
		[petId]
	);

	return rows.map(mapVaccination);
}

export async function createVaccinations(petId: number, inputs: PetVaccinationInput[]): Promise<PetVaccination[]> {
	const createdIds: number[] = [];
	const affectedPresetIds = new Set<number>();

	for (const input of inputs) {
		const vaccinePresetId = requiredPresetId(input.vaccinePresetId);
		const presets = await selectMany<VaccinePresetRow>(
			`SELECT id, name, normalized_name, validity_months, updated_at
			 FROM vaccine_presets
			 WHERE id = $1
			 LIMIT 1`,
			[vaccinePresetId]
		);
		const preset = presets[0] ? mapPreset(presets[0]) : null;
		if (!preset) throw new Error('vaccine_preset_required');

		const result = await execute(
			`INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_preset_id, vaccine_name, updated_at)
			 VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, CURRENT_TIMESTAMP)`,
			[petId, requiredText(input.appliedAt, 'date_invalid'), preset.id, preset.name]
		);
		createdIds.push(Number(result.lastInsertId));
		affectedPresetIds.add(preset.id);
	}

	if (createdIds.length === 0) return [];
	for (const vaccinePresetId of affectedPresetIds) {
		await markPreviousEquivalentVaccinationsIgnored(petId, vaccinePresetId);
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

export async function listVaccinePresets(): Promise<VaccinePreset[]> {
	const rows = await selectMany<VaccinePresetRow>(
		`SELECT id, name, normalized_name, validity_months, updated_at
		 FROM vaccine_presets
		 ORDER BY name COLLATE NOCASE`
	);

	return rows.map(mapPreset);
}

export async function listUsedVaccinePresetIds(): Promise<number[]> {
	const rows = await selectMany<UsedPresetRow>(
		`SELECT DISTINCT vaccine_preset_id
		 FROM pet_vaccinations
		 WHERE deleted_at IS NULL`
	);

	return rows.map((row) => row.vaccine_preset_id);
}

export async function saveVaccinePreset(input: VaccinePresetInput, id?: number): Promise<VaccinePreset> {
	const name = requiredText(input.name, 'vaccine_name_required');
	const normalizedName = normalizeVaccineName(name);
	const validityMonths = normalizeValidity(input.validityMonths);
	if (validityMonths === 0) throw new Error('vaccine_validity_required');

	if (id) {
		await execute(
			`UPDATE vaccine_presets
			 SET name = $2,
				normalized_name = $3,
				validity_months = $4,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[id, name, normalizedName, validityMonths]
		);
	} else {
		await execute(
			`INSERT INTO vaccine_presets (name, normalized_name, validity_months, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
			 ON CONFLICT(normalized_name) DO UPDATE SET
				name = excluded.name,
				validity_months = excluded.validity_months,
				updated_at = CURRENT_TIMESTAMP`,
			[name, normalizedName, validityMonths]
		);
	}

	const rows = await selectMany<VaccinePresetRow>(
		`SELECT id, name, normalized_name, validity_months, updated_at
		 FROM vaccine_presets
		 WHERE normalized_name = $1
		 LIMIT 1`,
		[normalizedName]
	);

	const preset = rows[0] ? mapPreset(rows[0]) : null;
	if (!preset) throw new Error('vaccine_preset_save_failed');
	return preset;
}

export async function deleteVaccinePreset(id: number): Promise<void> {
	const rows = await selectMany<CountRow>('SELECT COUNT(*) AS count FROM pet_vaccinations WHERE vaccine_preset_id = $1 AND deleted_at IS NULL', [id]);
	if ((rows[0]?.count ?? 0) > 0) throw new Error('vaccine_preset_in_use');

	await execute('DELETE FROM vaccine_presets WHERE id = $1', [id]);
}