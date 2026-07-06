import type { MedicationProtocol, MedicationProtocolCatalogItem, MedicationProtocolDose, MedicationProtocolDoseInput, MedicationProtocolInput, MedicationProtocolKind, MedicationProtocolOrigin, MedicationValidityUnit } from '$lib/domain/medication/protocol.js';
import { parseMedicationSpecies, stringifyMedicationSpecies } from '$lib/domain/medication/catalog.js';
import { canEditMedicationProtocol, normalizeMedicationProtocolName } from '$lib/domain/medication/protocol.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface MedicationProtocolRow {
	id: number;
	kind: MedicationProtocolKind;
	origin: MedicationProtocolOrigin;
	name: string;
	normalized_name: string;
	species: string;
	observation: string | null;
	sort_order: number;
	hidden_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
	updated_at: string | null;
}

interface MedicationProtocolItemRow {
	protocol_id: number;
	id: number;
	name: string;
	normalized_name: string;
	species: string;
}

interface MedicationProtocolDoseRow {
	id: number;
	protocol_id: number;
	dose: string;
	validity_value: number;
	validity_unit: MedicationValidityUnit;
	sort_order: number;
	updated_at: string | null;
}

function normalizeKind(value: string): MedicationProtocolKind {
	if (value === 'vaccine' || value === 'antiparasitic') return value;
	throw new Error('protocol_kind_required');
}

function requiredText(value: string, error: string, maxLength: number): string {
	const trimmed = value.trim();
	if (!trimmed) throw new Error(error);
	assertTextLimit(trimmed, maxLength);
	return trimmed;
}

function normalizeName(value: string): { name: string; normalizedName: string } {
	const name = requiredText(value, 'protocol_name_required', FIELD_LIMITS.medicationProtocolName);
	const normalizedName = normalizeMedicationProtocolName(name);
	if (!normalizedName) throw new Error('protocol_name_required');
	assertTextLimit(normalizedName, FIELD_LIMITS.medicationProtocolNormalizedName);
	return { name, normalizedName };
}

function normalizeValidityUnit(value: string): MedicationValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('protocol_validity_required');
}

function normalizeValidityValue(value: number, unit: MedicationValidityUnit): number {
	const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
	const max =
		unit === 'days'
			? FIELD_LIMITS.treatmentValidityDays
			: unit === 'months'
				? FIELD_LIMITS.treatmentValidityMonths
				: FIELD_LIMITS.treatmentValidityYears;
	if (normalized <= 0 || normalized > max) throw new Error('protocol_validity_required');
	return normalized;
}

function mapItem(row: MedicationProtocolItemRow): MedicationProtocolCatalogItem {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseMedicationSpecies(row.species)
	};
}

function mapDose(row: MedicationProtocolDoseRow): MedicationProtocolDose {
	return {
		id: row.id,
		protocolId: row.protocol_id,
		dose: row.dose,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		sortOrder: row.sort_order,
		updatedAt: row.updated_at
	};
}

function mapProtocol(row: MedicationProtocolRow, items: MedicationProtocolCatalogItem[], doses: MedicationProtocolDose[]): MedicationProtocol {
	return {
		id: row.id,
		kind: row.kind,
		origin: row.origin,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseMedicationSpecies(row.species),
		observation: row.observation,
		sortOrder: row.sort_order,
		hiddenAt: row.hidden_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after,
		updatedAt: row.updated_at,
		items,
		doses
	};
}

function placeholders(values: unknown[]): string {
	return values.map((_, index) => `$${index + 1}`).join(', ');
}

async function nextProtocolSortOrder(kind: MedicationProtocolKind): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM medication_protocols WHERE kind = $1 AND deleted_at IS NULL', [kind]);
	return rows[0]?.next_order ?? 0;
}

async function nextDoseSortOrder(protocolId: number): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM medication_protocol_doses WHERE protocol_id = $1', [protocolId]);
	return rows[0]?.next_order ?? 0;
}

async function protocolKind(protocolId: number): Promise<MedicationProtocolKind> {
	const rows = await selectMany<{ kind: MedicationProtocolKind }>('SELECT kind FROM medication_protocols WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [protocolId]);
	if (!rows[0]) throw new Error('protocol_not_found');
	return rows[0].kind;
}

async function assertMedicationProtocolEditable(protocolId: number): Promise<void> {
	const rows = await selectMany<{ origin: MedicationProtocolOrigin }>('SELECT origin FROM medication_protocols WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [protocolId]);
	const protocol = rows[0];
	if (!protocol) throw new Error('protocol_not_found');
	if (!canEditMedicationProtocol(protocol)) throw new Error('medication_protocol_system_item');
}

async function loadProtocolDetails(rows: MedicationProtocolRow[]): Promise<MedicationProtocol[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((row) => row.id);
	const idPlaceholders = placeholders(ids);
	const itemRows = await selectMany<MedicationProtocolItemRow>(
		`SELECT medication_protocol_items.protocol_id,
			medication_catalog_items.id,
			medication_catalog_items.name,
			medication_catalog_items.normalized_name,
			medication_catalog_items.species
		 FROM medication_protocol_items
		 JOIN medication_catalog_items ON medication_catalog_items.id = medication_protocol_items.catalog_item_id
		 WHERE medication_protocol_items.protocol_id IN (${idPlaceholders})
		 ORDER BY medication_protocol_items.protocol_id, medication_protocol_items.sort_order, medication_catalog_items.name COLLATE NOCASE`,
		ids
	);
	const doseRows = await selectMany<MedicationProtocolDoseRow>(
		`SELECT id, protocol_id, dose, validity_value, validity_unit, sort_order, updated_at
		 FROM medication_protocol_doses
		 WHERE protocol_id IN (${idPlaceholders})
		 ORDER BY protocol_id, sort_order, id`,
		ids
	);

	const itemsByProtocol = new Map<number, MedicationProtocolCatalogItem[]>();
	for (const row of itemRows) {
		const items = itemsByProtocol.get(row.protocol_id) ?? [];
		items.push(mapItem(row));
		itemsByProtocol.set(row.protocol_id, items);
	}

	const dosesByProtocol = new Map<number, MedicationProtocolDose[]>();
	for (const row of doseRows) {
		const doses = dosesByProtocol.get(row.protocol_id) ?? [];
		doses.push(mapDose(row));
		dosesByProtocol.set(row.protocol_id, doses);
	}

	return rows.map((row) => mapProtocol(row, itemsByProtocol.get(row.id) ?? [], dosesByProtocol.get(row.id) ?? []));
}

async function getProtocolById(id: number): Promise<MedicationProtocol> {
	const rows = await selectMany<MedicationProtocolRow>(
		`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
		 FROM medication_protocols
		 WHERE id = $1 AND deleted_at IS NULL
		 LIMIT 1`,
		[id]
	);
	const protocols = await loadProtocolDetails(rows);
	if (!protocols[0]) throw new Error('protocol_not_found');
	return protocols[0];
}

async function resolveProtocolItemIds(kind: MedicationProtocolKind, catalogItemIds: number[]): Promise<number[]> {
	const uniqueIds = [...new Set(catalogItemIds.map((id) => Math.trunc(Number(id))).filter((id) => Number.isInteger(id) && id > 0))];
	if (uniqueIds.length === 0) throw new Error('protocol_item_required');

	const allowedRows = await selectMany<{ id: number }>(`SELECT id FROM medication_catalog_items WHERE kind = $1 AND id IN (${uniqueIds.map((_, index) => `$${index + 2}`).join(', ')})`, [kind, ...uniqueIds]);
	const allowedIds = new Set(allowedRows.map((row) => row.id));
	const filteredIds = uniqueIds.filter((id) => allowedIds.has(id));
	if (filteredIds.length === 0) throw new Error('protocol_item_required');

	return filteredIds;
}

async function saveProtocolItems(protocolId: number, catalogItemIds: number[]): Promise<void> {
	await execute('DELETE FROM medication_protocol_items WHERE protocol_id = $1', [protocolId]);
	for (const [index, catalogItemId] of catalogItemIds.entries()) {
		await execute(
			`INSERT INTO medication_protocol_items (protocol_id, catalog_item_id, sort_order, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
			[protocolId, catalogItemId, index]
		);
	}
}

export async function listMedicationProtocols(kind?: MedicationProtocolKind, includeHidden = false): Promise<MedicationProtocol[]> {
	const rows = kind
		? await selectMany<MedicationProtocolRow>(
				`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
				 FROM medication_protocols
				 WHERE kind = $1 AND deleted_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
				 ORDER BY sort_order, name COLLATE NOCASE`,
				[kind]
			)
		: await selectMany<MedicationProtocolRow>(
				`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
				 FROM medication_protocols
				 WHERE deleted_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
				 ORDER BY kind, sort_order, name COLLATE NOCASE`
			);

	return loadProtocolDetails(rows);
}

export async function saveMedicationProtocol(input: MedicationProtocolInput, id?: number): Promise<MedicationProtocol> {
	const kind = normalizeKind(input.kind);
	const { name, normalizedName } = normalizeName(input.name);
	const species = stringifyMedicationSpecies(input.species);
	assertTextLimit(species, FIELD_LIMITS.medicationSpeciesJson);
	const observation = nullableMultilineText(input.observation, FIELD_LIMITS.treatmentObservation);
	const catalogItemIds = await resolveProtocolItemIds(kind, input.catalogItemIds);

	let protocolId = id ?? 0;
	if (protocolId) {
		await assertMedicationProtocolEditable(protocolId);
		await execute(
			`UPDATE medication_protocols
			 SET kind = $2,
				name = $3,
				normalized_name = $4,
				species = $5,
				observation = $6,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND deleted_at IS NULL`,
			[protocolId, kind, name, normalizedName, species, observation]
		);
	} else {
		const existingRows = await selectMany<{ id: number; origin: MedicationProtocolOrigin }>(
			'SELECT id, origin FROM medication_protocols WHERE kind = $1 AND normalized_name = $2 LIMIT 1',
			[kind, normalizedName]
		);
		if (existingRows[0] && !canEditMedicationProtocol(existingRows[0])) throw new Error('medication_protocol_system_item');

		await execute(
			`INSERT INTO medication_protocols (kind, origin, name, normalized_name, species, observation, sort_order, updated_at)
			 VALUES ($1, 'user', $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
			 ON CONFLICT(kind, normalized_name) DO UPDATE SET
				name = excluded.name,
				species = excluded.species,
				observation = excluded.observation,
				deleted_at = NULL,
				purge_after = NULL,
				updated_at = CURRENT_TIMESTAMP`,
			[kind, name, normalizedName, species, observation, await nextProtocolSortOrder(kind)]
		);

		const rows = await selectMany<{ id: number }>('SELECT id FROM medication_protocols WHERE kind = $1 AND normalized_name = $2 AND deleted_at IS NULL LIMIT 1', [kind, normalizedName]);
		protocolId = rows[0]?.id ?? 0;
	}

	if (!protocolId) throw new Error('protocol_save_failed');
	await saveProtocolItems(protocolId, catalogItemIds);
	return getProtocolById(protocolId);
}

export async function setMedicationProtocolHidden(id: number, hidden: boolean): Promise<MedicationProtocol> {
	await execute(
		`UPDATE medication_protocols
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);
	return getProtocolById(id);
}

export async function deleteMedicationProtocol(id: number): Promise<void> {
	await assertMedicationProtocolEditable(id);
	const deletedAt = nowIso();
	await execute(
		`UPDATE medication_protocols
		 SET deleted_at = COALESCE(deleted_at, $2),
			purge_after = COALESCE(purge_after, $3),
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function saveMedicationProtocolDose(protocolId: number, input: MedicationProtocolDoseInput, id?: number): Promise<MedicationProtocol> {
	await protocolKind(protocolId);
	await assertMedicationProtocolEditable(protocolId);
	const dose = requiredText(input.dose, 'protocol_dose_required', FIELD_LIMITS.treatmentDose);
	const validityUnit = normalizeValidityUnit(input.validityUnit);
	const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);

	if (id) {
		await execute(
			`UPDATE medication_protocol_doses
			 SET dose = $3,
				validity_value = $4,
				validity_unit = $5,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND protocol_id = $2`,
			[id, protocolId, dose, validityValue, validityUnit]
		);
	} else {
		await execute(
			`INSERT INTO medication_protocol_doses (protocol_id, dose, validity_value, validity_unit, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
			[protocolId, dose, validityValue, validityUnit, await nextDoseSortOrder(protocolId)]
		);
	}

	return getProtocolById(protocolId);
}

export async function deleteMedicationProtocolDose(protocolId: number, doseId: number): Promise<MedicationProtocol> {
	await assertMedicationProtocolEditable(protocolId);
	await execute('DELETE FROM medication_protocol_doses WHERE id = $1 AND protocol_id = $2', [doseId, protocolId]);
	return getProtocolById(protocolId);
}
