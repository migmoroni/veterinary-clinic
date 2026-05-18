import type { PetVaccination, PetVaccinationInput, VaccinePreset, VaccinePresetDose, VaccinePresetDoseInput, VaccinePresetInput, VaccineProtocol, VaccineProtocolInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
import { normalizeVaccineDoseLabel, normalizeVaccineName, normalizeVaccineProtocolName } from '$lib/domain/vaccine/vaccine.js';
import { FIELD_LIMITS, assertTextLimit } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetVaccinationRow {
	id: number;
	pet_id: number;
	applied_at: string;
	vaccine_preset_id: number;
	vaccine_protocol_id: number;
	vaccine_preset_dose_id: number;
	vaccine_name: string;
	vaccine_protocol_name: string;
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
	default_protocol_id: number | null;
	hidden_at: string | null;
	updated_at: string | null;
}

interface VaccineProtocolRow {
	id: number;
	vaccine_preset_id: number;
	name: string;
	normalized_name: string;
	sort_order: number;
	updated_at: string | null;
}

interface VaccinePresetDoseRow {
	id: number;
	vaccine_preset_id: number;
	vaccine_protocol_id: number;
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
	preset_default_protocol_id: number | null;
	preset_hidden_at: string | null;
	preset_updated_at: string | null;
	protocol_id: number;
	protocol_name: string;
	protocol_normalized_name: string;
	protocol_sort_order: number;
	protocol_updated_at: string | null;
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

interface UsedProtocolRow {
	vaccine_protocol_id: number;
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

interface NormalizedProtocolInput {
	id?: number;
	name: string;
	normalizedName: string;
	doses: NormalizedDoseInput[];
	isDefault: boolean;
	sortOrder: number;
}

function requiredText(value: string, error: string, maxLength?: number): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(error);
	if (maxLength !== undefined) assertTextLimit(trimmed, maxLength);
	return trimmed;
}

function normalizeValidityValue(value: number, unit: VaccineValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max = unit === 'days' ? FIELD_LIMITS.vaccineValidityDays : FIELD_LIMITS.vaccineValidityMonths;
	if (normalized <= 0 || normalized > max) throw new Error('vaccine_validity_required');
	return normalized;
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

function requiredProtocolId(value: number): number {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) throw new Error('vaccine_protocol_required');
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
		vaccineProtocolId: row.vaccine_protocol_id,
		vaccinePresetDoseId: row.vaccine_preset_dose_id,
		vaccineName: row.vaccine_name,
		vaccineProtocolName: row.vaccine_protocol_name,
		vaccineDoseLabel: row.vaccine_dose_label,
		validityIgnoredAt: row.validity_ignored_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function getVaccinationRow(id: number): Promise<PetVaccinationRow | null> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_protocol_id, vaccine_preset_dose_id, vaccine_name, vaccine_protocol_name, vaccine_dose_label, validity_ignored_at, updated_at, deleted_at, purge_after
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
		vaccineProtocolId: row.vaccine_protocol_id,
		label: row.label,
		normalizedLabel: row.normalized_label,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		sortOrder: row.sort_order,
		updatedAt: row.updated_at
	};
}

function mapProtocol(row: VaccineProtocolRow, defaultProtocolId: number | null, doses: VaccinePresetDose[] = []): VaccineProtocol {
	return {
		id: row.id,
		vaccinePresetId: row.vaccine_preset_id,
		name: row.name,
		normalizedName: row.normalized_name,
		doses: [...doses].sort((first, second) => first.sortOrder - second.sortOrder || first.label.localeCompare(second.label)),
		isDefault: row.id === defaultProtocolId,
		sortOrder: row.sort_order,
		updatedAt: row.updated_at
	};
}

function mapPreset(row: VaccinePresetRow, protocols: VaccineProtocol[] = []): VaccinePreset {
	const sortedProtocols = [...protocols].sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
	const defaultProtocol = sortedProtocols.find((protocol) => protocol.id === row.default_protocol_id) ?? sortedProtocols[0] ?? null;
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		defaultProtocolId: defaultProtocol?.id ?? row.default_protocol_id,
		protocols: sortedProtocols.map((protocol) => ({ ...protocol, isDefault: defaultProtocol ? protocol.id === defaultProtocol.id : protocol.isDefault })),
		doses: defaultProtocol?.doses ?? [],
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

function mapSelectedDose(row: SelectedVaccineDoseRow): { preset: VaccinePreset; protocol: VaccineProtocol; dose: VaccinePresetDose } {
	const dose = mapDose({
		id: row.dose_id,
		vaccine_preset_id: row.preset_id,
		vaccine_protocol_id: row.protocol_id,
		label: row.dose_label,
		normalized_label: row.dose_normalized_label,
		validity_value: row.validity_value,
		validity_unit: row.validity_unit,
		sort_order: row.dose_sort_order,
		updated_at: row.dose_updated_at
	});
	const protocol = mapProtocol(
		{
			id: row.protocol_id,
			vaccine_preset_id: row.preset_id,
			name: row.protocol_name,
			normalized_name: row.protocol_normalized_name,
			sort_order: row.protocol_sort_order,
			updated_at: row.protocol_updated_at
		},
		row.preset_default_protocol_id,
		[dose]
	);

	return {
		preset: mapPreset(
			{
				id: row.preset_id,
				name: row.preset_name,
				normalized_name: row.preset_normalized_name,
				default_protocol_id: row.preset_default_protocol_id,
				hidden_at: row.preset_hidden_at,
				updated_at: row.preset_updated_at
			},
			[protocol]
		),
		protocol,
		dose
	};
}

function normalizeDoseInputs(doses: VaccinePresetDoseInput[]): NormalizedDoseInput[] {
	if (doses.length === 0) throw new Error('vaccine_dose_required');

	const seenLabels = new Set<string>();
	return doses.map((dose, index) => {
		const label = requiredText(dose.label, 'vaccine_dose_required', FIELD_LIMITS.vaccineDoseLabel);
		const normalizedLabel = normalizeVaccineDoseLabel(label);
		if (!normalizedLabel) throw new Error('vaccine_dose_required');
		assertTextLimit(normalizedLabel, FIELD_LIMITS.vaccineNormalizedDoseLabel);
		if (seenLabels.has(normalizedLabel)) throw new Error('vaccine_dose_duplicate');
		seenLabels.add(normalizedLabel);

		const validityUnit = normalizeValidityUnit(dose.validityUnit);
		const validityValue = normalizeValidityValue(Number(dose.validityValue), validityUnit);

		return {
			id: dose.id,
			label,
			normalizedLabel,
			validityValue,
			validityUnit,
			sortOrder: Number.isInteger(dose.sortOrder) ? Number(dose.sortOrder) : index
		};
	});
}

function normalizeProtocolInputs(protocols: VaccineProtocolInput[]): NormalizedProtocolInput[] {
	if (protocols.length === 0) throw new Error('vaccine_protocol_required');

	const seenNames = new Set<string>();
	const defaultCandidateIndex = protocols.findIndex((protocol) => protocol.isDefault);
	const defaultIndex = defaultCandidateIndex >= 0 ? defaultCandidateIndex : 0;
	return protocols.map((protocol, index) => {
		const name = requiredText(protocol.name, 'vaccine_protocol_required', FIELD_LIMITS.vaccineProtocolName);
		const normalizedName = normalizeVaccineProtocolName(name);
		if (!normalizedName) throw new Error('vaccine_protocol_required');
		assertTextLimit(normalizedName, FIELD_LIMITS.vaccineNormalizedProtocolName);
		if (seenNames.has(normalizedName)) throw new Error('vaccine_protocol_duplicate');
		seenNames.add(normalizedName);

		return {
			id: protocol.id,
			name,
			normalizedName,
			doses: normalizeDoseInputs(protocol.doses),
			isDefault: index === defaultIndex,
			sortOrder: Number.isInteger(protocol.sortOrder) ? Number(protocol.sortOrder) : index
		};
	});
}

async function listProtocolRowsByPresetIds(presetIds: number[]): Promise<VaccineProtocolRow[]> {
	if (presetIds.length === 0) return [];
	const placeholders = presetIds.map((_, index) => `$${index + 1}`).join(', ');
	return selectMany<VaccineProtocolRow>(
		`SELECT id, vaccine_preset_id, name, normalized_name, sort_order, updated_at
		 FROM vaccine_protocols
		 WHERE vaccine_preset_id IN (${placeholders})
		 ORDER BY vaccine_preset_id, sort_order, name COLLATE NOCASE`,
		presetIds
	);
}

async function listDoseRowsByProtocolIds(protocolIds: number[]): Promise<VaccinePresetDoseRow[]> {
	if (protocolIds.length === 0) return [];
	const placeholders = protocolIds.map((_, index) => `$${index + 1}`).join(', ');
	return selectMany<VaccinePresetDoseRow>(
		`SELECT id, vaccine_preset_id, vaccine_protocol_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at
		 FROM vaccine_preset_doses
		 WHERE vaccine_protocol_id IN (${placeholders})
		 ORDER BY vaccine_protocol_id, sort_order, label COLLATE NOCASE`,
		protocolIds
	);
}

function mapPresetsWithProtocols(presetRows: VaccinePresetRow[], protocolRows: VaccineProtocolRow[], doseRows: VaccinePresetDoseRow[]): VaccinePreset[] {
	const dosesByProtocolId = new Map<number, VaccinePresetDose[]>();
	for (const row of doseRows) {
		const doses = dosesByProtocolId.get(row.vaccine_protocol_id) ?? [];
		doses.push(mapDose(row));
		dosesByProtocolId.set(row.vaccine_protocol_id, doses);
	}

	const presetRowsById = new Map(presetRows.map((row) => [row.id, row]));
	const protocolsByPresetId = new Map<number, VaccineProtocol[]>();
	for (const row of protocolRows) {
		const preset = presetRowsById.get(row.vaccine_preset_id);
		const protocols = protocolsByPresetId.get(row.vaccine_preset_id) ?? [];
		protocols.push(mapProtocol(row, preset?.default_protocol_id ?? null, dosesByProtocolId.get(row.id) ?? []));
		protocolsByPresetId.set(row.vaccine_preset_id, protocols);
	}

	return presetRows.map((row) => mapPreset(row, protocolsByPresetId.get(row.id) ?? []));
}

async function getPresetById(id: number): Promise<VaccinePreset | null> {
	const rows = await selectMany<VaccinePresetRow>(
		`SELECT id, name, normalized_name, default_protocol_id, hidden_at, updated_at
		 FROM vaccine_presets
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	const row = rows[0];
	if (!row) return null;

	const protocolRows = await listProtocolRowsByPresetIds([row.id]);
	const doseRows = await listDoseRowsByProtocolIds(protocolRows.map((protocol) => protocol.id));
	return mapPresetsWithProtocols([row], protocolRows, doseRows)[0] ?? null;
}

async function getSelectedVaccineDose(vaccinePresetId: number, vaccineProtocolId: number, vaccinePresetDoseId: number): Promise<{ preset: VaccinePreset; protocol: VaccineProtocol; dose: VaccinePresetDose } | null> {
	const rows = await selectMany<SelectedVaccineDoseRow>(
		`SELECT vaccine_presets.id AS preset_id,
			vaccine_presets.name AS preset_name,
			vaccine_presets.normalized_name AS preset_normalized_name,
			vaccine_presets.default_protocol_id AS preset_default_protocol_id,
			vaccine_presets.hidden_at AS preset_hidden_at,
			vaccine_presets.updated_at AS preset_updated_at,
			vaccine_protocols.id AS protocol_id,
			vaccine_protocols.name AS protocol_name,
			vaccine_protocols.normalized_name AS protocol_normalized_name,
			vaccine_protocols.sort_order AS protocol_sort_order,
			vaccine_protocols.updated_at AS protocol_updated_at,
			vaccine_preset_doses.id AS dose_id,
			vaccine_preset_doses.label AS dose_label,
			vaccine_preset_doses.normalized_label AS dose_normalized_label,
			vaccine_preset_doses.validity_value,
			vaccine_preset_doses.validity_unit,
			vaccine_preset_doses.sort_order AS dose_sort_order,
			vaccine_preset_doses.updated_at AS dose_updated_at
		 FROM vaccine_presets
		 JOIN vaccine_protocols ON vaccine_protocols.vaccine_preset_id = vaccine_presets.id
		 JOIN vaccine_preset_doses ON vaccine_preset_doses.vaccine_preset_id = vaccine_presets.id AND vaccine_preset_doses.vaccine_protocol_id = vaccine_protocols.id
		 WHERE vaccine_presets.id = $1 AND vaccine_protocols.id = $2 AND vaccine_preset_doses.id = $3
		 LIMIT 1`,
		[vaccinePresetId, vaccineProtocolId, vaccinePresetDoseId]
	);

	return rows[0] ? mapSelectedDose(rows[0]) : null;
}

export async function listVaccinationsByPet(petId: number, includeDeleted = false): Promise<PetVaccination[]> {
	const rows = await selectMany<PetVaccinationRow>(
		`SELECT id, pet_id, applied_at, vaccine_preset_id, vaccine_protocol_id, vaccine_preset_dose_id, vaccine_name, vaccine_protocol_name, vaccine_dose_label, validity_ignored_at, updated_at, deleted_at, purge_after
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
		const vaccineProtocolId = requiredProtocolId(input.vaccineProtocolId);
		const vaccinePresetDoseId = requiredDoseId(input.vaccinePresetDoseId);
		const selection = await getSelectedVaccineDose(vaccinePresetId, vaccineProtocolId, vaccinePresetDoseId);
		if (!selection) throw new Error('vaccine_dose_required');
		if (selection.preset.hiddenAt) throw new Error('vaccine_preset_hidden');

		const result = await execute(
			`INSERT INTO pet_vaccinations (pet_id, applied_at, vaccine_preset_id, vaccine_protocol_id, vaccine_preset_dose_id, vaccine_name, vaccine_protocol_name, vaccine_dose_label, updated_at)
			 VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
			[petId, requiredText(input.appliedAt, 'date_invalid', FIELD_LIMITS.isoDate), selection.preset.id, selection.protocol.id, selection.dose.id, selection.preset.name, selection.protocol.name, selection.dose.label]
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
		`SELECT id, name, normalized_name, default_protocol_id, hidden_at, updated_at
		 FROM vaccine_presets
		 ORDER BY name COLLATE NOCASE`
	);
	const protocolRows = await listProtocolRowsByPresetIds(rows.map((row) => row.id));
	const doseRows = await listDoseRowsByProtocolIds(protocolRows.map((row) => row.id));

	return mapPresetsWithProtocols(rows, protocolRows, doseRows);
}

export async function listUsedVaccinePresetIds(): Promise<number[]> {
	const rows = await selectMany<UsedPresetRow>(
		`SELECT DISTINCT vaccine_preset_id
		 FROM pet_vaccinations
		 WHERE deleted_at IS NULL`
	);

	return rows.map((row) => row.vaccine_preset_id);
}

export async function listUsedVaccineProtocolIds(): Promise<number[]> {
	const rows = await selectMany<UsedProtocolRow>(
		`SELECT DISTINCT vaccine_protocol_id
		 FROM pet_vaccinations
		 WHERE deleted_at IS NULL`
	);

	return rows.map((row) => row.vaccine_protocol_id);
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
	const name = requiredText(input.name, 'vaccine_name_required', FIELD_LIMITS.vaccinePresetName);
	const normalizedName = normalizeVaccineName(name);
	if (!normalizedName) throw new Error('vaccine_name_required');
	assertTextLimit(normalizedName, FIELD_LIMITS.vaccineNormalizedName);
	const protocols = normalizeProtocolInputs(input.protocols);
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
			`SELECT id, name, normalized_name, default_protocol_id, hidden_at, updated_at
			 FROM vaccine_presets
			 WHERE normalized_name = $1
			 LIMIT 1`,
			[normalizedName]
		);
		presetId = rows[0]?.id;
	}
	if (!presetId) throw new Error('vaccine_preset_save_failed');

	await syncVaccinePresetProtocols(presetId, protocols);

	const preset = await getPresetById(presetId);
	if (!preset) throw new Error('vaccine_preset_save_failed');
	return preset;
}

export async function setVaccinePresetHidden(id: number, hidden: boolean): Promise<VaccinePreset> {
	await execute(
		`UPDATE vaccine_presets
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);

	const preset = await getPresetById(id);
	if (!preset) throw new Error('vaccine_preset_save_failed');
	return preset;
}

async function syncVaccinePresetProtocols(presetId: number, protocols: NormalizedProtocolInput[]): Promise<void> {
	const existingRows = await selectMany<{ id: number }>(
		`SELECT id
		 FROM vaccine_protocols
		 WHERE vaccine_preset_id = $1`,
		[presetId]
	);
	const existingIds = new Set(existingRows.map((row) => row.id));
	const keptExistingIds = new Set(protocols.map((protocol) => protocol.id).filter((protocolId): protocolId is number => typeof protocolId === 'number' && Number.isInteger(protocolId) && protocolId > 0));

	for (const protocolId of keptExistingIds) {
		if (!existingIds.has(protocolId)) throw new Error('vaccine_protocol_required');
	}

	const removedProtocolIds = existingRows.map((row) => row.id).filter((protocolId) => !keptExistingIds.has(protocolId));
	if (removedProtocolIds.length > 0) {
		const placeholders = removedProtocolIds.map((_, index) => `$${index + 1}`).join(', ');
		const rows = await selectMany<CountRow>(
			`SELECT COUNT(*) AS count
			 FROM pet_vaccinations
			 WHERE vaccine_protocol_id IN (${placeholders}) AND deleted_at IS NULL`,
			removedProtocolIds
		);
		if ((rows[0]?.count ?? 0) > 0) throw new Error('vaccine_protocol_in_use');

		await execute(`DELETE FROM vaccine_protocols WHERE id IN (${placeholders})`, removedProtocolIds);
	}

	let defaultProtocolId: number | null = null;
	let firstProtocolId: number | null = null;
	for (const protocol of protocols) {
		let protocolId = protocol.id;
		if (protocolId) {
			await execute(
				`UPDATE vaccine_protocols
				 SET name = $3,
					normalized_name = $4,
					sort_order = $5,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1 AND vaccine_preset_id = $2`,
				[protocolId, presetId, protocol.name, protocol.normalizedName, protocol.sortOrder]
			);
		} else {
			await execute(
				`INSERT INTO vaccine_protocols (vaccine_preset_id, name, normalized_name, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
				 ON CONFLICT(vaccine_preset_id, normalized_name) DO UPDATE SET
					name = excluded.name,
					sort_order = excluded.sort_order,
					updated_at = CURRENT_TIMESTAMP`,
				[presetId, protocol.name, protocol.normalizedName, protocol.sortOrder]
			);

			const rows = await selectMany<{ id: number }>(
				`SELECT id
				 FROM vaccine_protocols
				 WHERE vaccine_preset_id = $1 AND normalized_name = $2
				 LIMIT 1`,
				[presetId, protocol.normalizedName]
			);
			protocolId = rows[0]?.id;
		}

		if (!protocolId) throw new Error('vaccine_preset_save_failed');
		firstProtocolId ??= protocolId;
		await syncVaccineProtocolDoses(presetId, protocolId, protocol.doses);
		if (protocol.isDefault) defaultProtocolId = protocolId;
	}

	await execute(
		`UPDATE vaccine_presets
		 SET default_protocol_id = $2,
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[presetId, defaultProtocolId ?? firstProtocolId]
	);
}

async function syncVaccineProtocolDoses(presetId: number, protocolId: number, doses: NormalizedDoseInput[]): Promise<void> {
	const existingRows = await selectMany<{ id: number }>(
		`SELECT id
		 FROM vaccine_preset_doses
		 WHERE vaccine_protocol_id = $1`,
		[protocolId]
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
				 SET label = $4,
					normalized_label = $5,
					validity_value = $6,
					validity_unit = $7,
					sort_order = $8,
					updated_at = CURRENT_TIMESTAMP
				 WHERE id = $1 AND vaccine_preset_id = $2 AND vaccine_protocol_id = $3`,
				[dose.id, presetId, protocolId, dose.label, dose.normalizedLabel, dose.validityValue, dose.validityUnit, dose.sortOrder]
			);
		} else {
			await execute(
				`INSERT INTO vaccine_preset_doses (vaccine_preset_id, vaccine_protocol_id, label, normalized_label, validity_value, validity_unit, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
				 ON CONFLICT(vaccine_protocol_id, normalized_label) DO UPDATE SET
					label = excluded.label,
					validity_value = excluded.validity_value,
					validity_unit = excluded.validity_unit,
					sort_order = excluded.sort_order,
					updated_at = CURRENT_TIMESTAMP`,
				[presetId, protocolId, dose.label, dose.normalizedLabel, dose.validityValue, dose.validityUnit, dose.sortOrder]
			);
		}
	}
}

export async function deleteVaccinePreset(id: number): Promise<void> {
	const rows = await selectMany<CountRow>('SELECT COUNT(*) AS count FROM pet_vaccinations WHERE vaccine_preset_id = $1 AND deleted_at IS NULL', [id]);
	if ((rows[0]?.count ?? 0) > 0) throw new Error('vaccine_preset_in_use');

	await execute('DELETE FROM vaccine_presets WHERE id = $1', [id]);
}
