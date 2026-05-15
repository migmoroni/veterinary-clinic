import type { PetVaccination, PetVaccinationInput, VaccinePreset, VaccinePresetDose, VaccinePresetInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
import { normalizeVaccineDoseLabel, normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetVaccinationRow {
	id: number;
	pet_id: number;
	applied_at: string;
	vaccine_preset_id: number;
	vaccine_preset_dose_id: number;
	vaccine_name: string;
	vaccine_dose_label: string;
	validity_ignored_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface VaccinePresetRow {
	id: number;
	name: string;
	normalized_name: string;
	updated_at: string | null;
}

interface VaccinePresetDoseRow {
	id: number;
	vaccine_preset_id: number;
	label: string;
	normalized_label: string;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
	sort_order: number;
	updated_at: string | null;
}

interface SelectedVaccineDoseRow {
	preset_id: number;
	preset_name: string;
	preset_normalized_name: string;
	preset_updated_at: string | null;
	dose_id: number;
	dose_label: string;
	dose_normalized_label: string;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
	dose_sort_order: number;
	dose_updated_at: string | null;
}

interface CountRow {
	count: number;
}

interface UsedPresetRow {
	vaccine_preset_id: number;
}

interface UsedPresetDoseRow {
	vaccine_preset_dose_id: number;
}

interface NormalizedDoseInput {
	id?: number;
	label: string;
	normalizedLabel: string;
	validityValue: number;
	validityUnit: VaccineValidityUnit;
	sortOrder: number;
}

function requiredText(value: string, error: string): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(error);
	return trimmed;
}

function normalizeValidityValue(value: number): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	return Math.max(0, normalized);
}

function normalizeValidityUnit(value: string): VaccineValidityUnit {
	if (value === 'days' || value === 'months') return value;
	throw new Error('vaccine_validity_required');
}

function requiredPresetId(value: number): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw new Error('vaccine_preset_required');
	return id;
}

function requiredDoseId(value: number): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw new Error('vaccine_dose_required');
	return id;
}

function mapVaccination(row: PetVaccinationRow): PetVaccination {
	return {
		id: row.id,
		petId: row.pet_id,
		appliedAt: row.applied_at,
		vaccinePresetId: row.vaccine_preset_id,
		vaccinePresetDoseId: row.vaccine_preset_dose_id,
		vaccineName: row.vaccine_name,
		vaccineDoseLabel: row.vaccine_dose_label,
		validityIgnoredAt: row.validity_ignored_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function getVaccinationRow(id: number): Promise<PetVaccinationRow | null> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_preset_dose_id, vaccine_name, vaccine_dose_label, validity_ignored_at, updated_at, deleted_at, purge_after
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

function mapDose(row: VaccinePresetDoseRow): VaccinePresetDose {
	return {
		id: row.id,
		vaccinePresetId: row.vaccine_preset_id,
		label: row.label,
		normalizedLabel: row.normalized_label,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		sortOrder: row.sort_order,
		updatedAt: row.updated_at
	};
}

function mapSelectedDose(row: SelectedVaccineDoseRow): { preset: VaccinePreset; dose: VaccinePresetDose } {
	const dose = mapDose({
		id: row.dose_id,
		vaccine_preset_id: row.preset_id,
		label: row.dose_label,
		normalized_label: row.dose_normalized_label,
		validity_value: row.validity_value,
		validity_unit: row.validity_unit,
		sort_order: row.dose_sort_order,
		updated_at: row.dose_updated_at
	});

	return {
		preset: {
			id: row.preset_id,
			name: row.preset_name,
			normalizedName: row.preset_normalized_name,
			doses: [dose],
			updatedAt: row.preset_updated_at
		},
		dose
	};
}

function mapPreset(row: VaccinePresetRow, doses: VaccinePresetDose[] = []): VaccinePreset {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		doses: [...doses].sort((first, second) => first.sortOrder - second.sortOrder || first.label.localeCompare(second.label)),
		updatedAt: row.updated_at
	};
}

function normalizeDoseInputs(doses: VaccinePresetInput['doses']): NormalizedDoseInput[] {
	if (doses.length === 0) throw new Error('vaccine_dose_required');

	const seenLabels = new Set<string>();
	return doses.map((dose, index) => {
		const label = requiredText(dose.label, 'vaccine_dose_required');
		const normalizedLabel = normalizeVaccineDoseLabel(label);
		if (seenLabels.has(normalizedLabel)) throw new Error('vaccine_dose_duplicate');
		seenLabels.add(normalizedLabel);

		const validityValue = normalizeValidityValue(Number(dose.validityValue));
		if (validityValue === 0) throw new Error('vaccine_validity_required');

		return {
			id: dose.id,
			label,
			normalizedLabel,
			validityValue,
			validityUnit: normalizeValidityUnit(dose.validityUnit),
			sortOrder: Number.isInteger(dose.sortOrder) ? Number(dose.sortOrder) : index
		};
	});
}

async function listDoseRowsByPresetIds(presetIds: number[]): Promise<VaccinePresetDoseRow[]> {
	if (presetIds.length === 0) return [];
	const placeholders = presetIds.map((_, index) => `$${index + 1}`).join(', ');
	return selectMany<VaccinePresetDoseRow>(
		`SELECT id, vaccine_preset_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at
		 FROM vaccine_preset_doses
		 WHERE vaccine_preset_id IN (${placeholders})
		 ORDER BY vaccine_preset_id, sort_order, label COLLATE NOCASE`,
		presetIds
	);
}

function mapPresetsWithDoses(presetRows: VaccinePresetRow[], doseRows: VaccinePresetDoseRow[]): VaccinePreset[] {
	const dosesByPresetId = new Map<number, VaccinePresetDose[]>();
	for (const row of doseRows) {
		const doses = dosesByPresetId.get(row.vaccine_preset_id) ?? [];
		doses.push(mapDose(row));
		dosesByPresetId.set(row.vaccine_preset_id, doses);
	}

	return presetRows.map((row) => mapPreset(row, dosesByPresetId.get(row.id) ?? []));
}

async function getPresetById(id: number): Promise<VaccinePreset | null> {
	const rows = await selectMany<VaccinePresetRow>(
		`SELECT id, name, normalized_name, updated_at
		 FROM vaccine_presets
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) return null;

	const doseRows = await listDoseRowsByPresetIds([row.id]);
	return mapPreset(row, doseRows.map(mapDose));
}

async function getSelectedVaccineDose(vaccinePresetId: number, vaccinePresetDoseId: number): Promise<{ preset: VaccinePreset; dose: VaccinePresetDose } | null> {
	const rows = await selectMany<SelectedVaccineDoseRow>(
		`SELECT vaccine_presets.id AS preset_id,
			vaccine_presets.name AS preset_name,
			vaccine_presets.normalized_name AS preset_normalized_name,
			vaccine_presets.updated_at AS preset_updated_at,
			vaccine_preset_doses.id AS dose_id,
			vaccine_preset_doses.label AS dose_label,
			vaccine_preset_doses.normalized_label AS dose_normalized_label,
			vaccine_preset_doses.validity_value,
			vaccine_preset_doses.validity_unit,
			vaccine_preset_doses.sort_order AS dose_sort_order,
			vaccine_preset_doses.updated_at AS dose_updated_at
		 FROM vaccine_presets
		 JOIN vaccine_preset_doses ON vaccine_preset_doses.vaccine_preset_id = vaccine_presets.id
		 WHERE vaccine_presets.id = $1 AND vaccine_preset_doses.id = $2
		 LIMIT 1`,
		[vaccinePresetId, vaccinePresetDoseId]
	);

	return rows[0] ? mapSelectedDose(rows[0]) : null;
}

export async function listVaccinationsByPet(petId: number, includeDeleted = false): Promise<PetVaccination[]> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_preset_dose_id, vaccine_name, vaccine_dose_label, validity_ignored_at, updated_at, deleted_at, purge_after
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
		const vaccinePresetDoseId = requiredDoseId(input.vaccinePresetDoseId);
		const selection = await getSelectedVaccineDose(vaccinePresetId, vaccinePresetDoseId);
		if (!selection) throw new Error('vaccine_dose_required');

		const result = await execute(
			`INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_preset_id, vaccine_preset_dose_id, vaccine_name, vaccine_dose_label, updated_at)
			 VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
			[petId, requiredText(input.appliedAt, 'date_invalid'), selection.preset.id, selection.dose.id, selection.preset.name, selection.dose.label]
		);
		createdIds.push(Number(result.lastInsertId));
		affectedPresetIds.add(selection.preset.id);
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
		`SELECT id, name, normalized_name, updated_at
		 FROM vaccine_presets
		 ORDER BY name COLLATE NOCASE`
	);
	const doseRows = await listDoseRowsByPresetIds(rows.map((row) => row.id));

	return mapPresetsWithDoses(rows, doseRows);
}

export async function listUsedVaccinePresetIds(): Promise<number[]> {
	const rows = await selectMany<UsedPresetRow>(
		`SELECT DISTINCT vaccine_preset_id
		 FROM pet_vaccinations
		 WHERE deleted_at IS NULL`
	);

	return rows.map((row) => row.vaccine_preset_id);
}

export async function listUsedVaccinePresetDoseIds(): Promise<number[]> {
	const rows = await selectMany<UsedPresetDoseRow>(
		`SELECT DISTINCT vaccine_preset_dose_id
		 FROM pet_vaccinations
		 WHERE deleted_at IS NULL`
	);

	return rows.map((row) => row.vaccine_preset_dose_id);
}

export async function saveVaccinePreset(input: VaccinePresetInput, id?: number): Promise<VaccinePreset> {
	const name = requiredText(input.name, 'vaccine_name_required');
	const normalizedName = normalizeVaccineName(name);
	const doses = normalizeDoseInputs(input.doses);
	let presetId = id;

	if (presetId) {
		await execute(
			`UPDATE vaccine_presets
			 SET name = $2,
				normalized_name = $3,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[presetId, name, normalizedName]
		);
	} else {
		await execute(
			`INSERT INTO vaccine_presets (name, normalized_name, updated_at)
			 VALUES ($1, $2, CURRENT_TIMESTAMP)
			 ON CONFLICT(normalized_name) DO UPDATE SET
				name = excluded.name,
				updated_at = CURRENT_TIMESTAMP`,
			[name, normalizedName]
		);

		const rows = await selectMany<VaccinePresetRow>(
			`SELECT id, name, normalized_name, updated_at
			 FROM vaccine_presets
			 WHERE normalized_name = $1
			 LIMIT 1`,
			[normalizedName]
		);
		presetId = rows[0]?.id;
	}
	if (!presetId) throw new Error('vaccine_preset_save_failed');

	await syncVaccinePresetDoses(presetId, doses);

	const preset = await getPresetById(presetId);
	if (!preset) throw new Error('vaccine_preset_save_failed');
	return preset;
}


async function syncVaccinePresetDoses(presetId: number, doses: NormalizedDoseInput[]): Promise<void> {
	const existingRows = await selectMany<{ id: number }>(
		`SELECT id
		 FROM vaccine_preset_doses
		 WHERE vaccine_preset_id = $1`,
		[presetId]
	);
	const existingIds = new Set(existingRows.map((row) => row.id));
	const keptExistingIds = new Set(doses.map((dose) => dose.id).filter((doseId): doseId is number => typeof doseId === 'number' && Number.isInteger(doseId) && doseId > 0));

	for (const doseId of keptExistingIds) {
		if (!existingIds.has(doseId)) throw new Error('vaccine_dose_required');
	}

	const removedDoseIds = existingRows.map((row) => row.id).filter((doseId) => !keptExistingIds.has(doseId));
	if (removedDoseIds.length > 0) {
		const placeholders = removedDoseIds.map((_, index) => `$${index + 1}`).join(', ');
		const rows = await selectMany<CountRow>(
			`SELECT COUNT(*) AS count
			 FROM pet_vaccinations
			 WHERE vaccine_preset_dose_id IN (${placeholders}) AND deleted_at IS NULL`,
			removedDoseIds
		);
		if ((rows[0]?.count ?? 0) > 0) throw new Error('vaccine_dose_in_use');

		await execute(`DELETE FROM vaccine_preset_doses WHERE id IN (${placeholders})`, removedDoseIds);
	}

	for (const dose of doses) {
		if (dose.id) {
			await execute(
				`UPDATE vaccine_preset_doses
				 SET label = $3,
					normalized_label = $4,
					validity_value = $5,
					validity_unit = $6,
					sort_order = $7,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1 AND vaccine_preset_id = $2`,
				[dose.id, presetId, dose.label, dose.normalizedLabel, dose.validityValue, dose.validityUnit, dose.sortOrder]
			);
		} else {
			await execute(
				`INSERT INTO vaccine_preset_doses (vaccine_preset_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
				 ON CONFLICT(vaccine_preset_id, normalized_label) DO UPDATE SET
					label = excluded.label,
					validity_value = excluded.validity_value,
					validity_unit = excluded.validity_unit,
					sort_order = excluded.sort_order,
					updated_at = CURRENT_TIMESTAMP`,
				[presetId, dose.label, dose.normalizedLabel, dose.validityValue, dose.validityUnit, dose.sortOrder]
			);
		}
	}
}

export async function deleteVaccinePreset(id: number): Promise<void> {
	const rows = await selectMany<CountRow>('SELECT COUNT(*) AS count FROM pet_vaccinations WHERE vaccine_preset_id = $1 AND deleted_at IS NULL', [id]);
	if ((rows[0]?.count ?? 0) > 0) throw new Error('vaccine_preset_in_use');

	await execute('DELETE FROM vaccine_presets WHERE id = $1', [id]);
}