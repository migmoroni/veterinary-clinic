import type { TreatmentProtocol, TreatmentProtocolCatalogItem, TreatmentProtocolDose, TreatmentProtocolDoseInput, TreatmentProtocolId, TreatmentProtocolInput, TreatmentProtocolKind, TreatmentProtocolOrigin, TreatmentProtocolValidityUnit } from '$lib/domain/treatment/protocol.js';
import { parseTreatmentSpecies, stringifyTreatmentSpecies } from '$lib/domain/treatment/species.js';
import { canEditTreatmentProtocol, normalizeTreatmentProtocolName } from '$lib/domain/treatment/protocol.js';
import { PRODUCT_TYPES, productTypeForTreatmentKind, productTypeMatchesTreatmentKind, stringifyProductType } from '$lib/domain/product/catalog.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { createUuidV4 } from '$lib/domain/shared/uuid.js';
import type { TreatmentCatalogItemId } from '$lib/domain/treatment/treatment.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface TreatmentProtocolRow {
	id: TreatmentProtocolId;
	kind: TreatmentProtocolKind;
	origin: TreatmentProtocolOrigin;
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

interface TreatmentProtocolItemRow {
	protocol_id: TreatmentProtocolId;
	id: TreatmentCatalogItemId;
	name: string;
	normalized_name: string;
	species: string;
}

interface TreatmentProtocolDoseRow {
	id: number;
	protocol_id: TreatmentProtocolId;
	dose: string;
	validity_value: number;
	validity_unit: TreatmentProtocolValidityUnit;
	sort_order: number;
	updated_at: string | null;
}

function normalizeKind(value: string): TreatmentProtocolKind {
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
	const name = requiredText(value, 'protocol_name_required', FIELD_LIMITS.treatmentProtocolName);
	const normalizedName = normalizeTreatmentProtocolName(name);
	if (!normalizedName) throw new Error('protocol_name_required');
	assertTextLimit(normalizedName, FIELD_LIMITS.treatmentProtocolNormalizedName);
	return { name, normalizedName };
}

function normalizeValidityUnit(value: string): TreatmentProtocolValidityUnit {
	if (value === 'days' || value === 'months' || value === 'years') return value;
	throw new Error('protocol_validity_required');
}

function normalizeValidityValue(value: number, unit: TreatmentProtocolValidityUnit): number {
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

function mapItem(row: TreatmentProtocolItemRow): TreatmentProtocolCatalogItem {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseTreatmentSpecies(row.species)
	};
}

function mapDose(row: TreatmentProtocolDoseRow): TreatmentProtocolDose {
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

function mapProtocol(row: TreatmentProtocolRow, items: TreatmentProtocolCatalogItem[], doses: TreatmentProtocolDose[]): TreatmentProtocol {
	return {
		id: row.id,
		kind: row.kind,
		origin: row.origin,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseTreatmentSpecies(row.species),
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

async function nextProtocolSortOrder(kind: TreatmentProtocolKind): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM treatment_protocols WHERE kind = $1 AND deleted_at IS NULL', [kind]);
	return rows[0]?.next_order ?? 0;
}

async function nextDoseSortOrder(protocolId: TreatmentProtocolId): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM treatment_protocol_doses WHERE protocol_id = $1', [protocolId]);
	return rows[0]?.next_order ?? 0;
}

async function protocolKind(protocolId: TreatmentProtocolId): Promise<TreatmentProtocolKind> {
	const rows = await selectMany<{ kind: TreatmentProtocolKind }>('SELECT kind FROM treatment_protocols WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [protocolId]);
	if (!rows[0]) throw new Error('protocol_not_found');
	return rows[0].kind;
}

async function assertTreatmentProtocolEditable(protocolId: TreatmentProtocolId): Promise<void> {
	const rows = await selectMany<{ origin: TreatmentProtocolOrigin }>('SELECT origin FROM treatment_protocols WHERE id = $1 AND deleted_at IS NULL LIMIT 1', [protocolId]);
	const protocol = rows[0];
	if (!protocol) throw new Error('protocol_not_found');
	if (!canEditTreatmentProtocol(protocol)) throw new Error('treatment_protocol_system_item');
}

async function loadProtocolDetails(rows: TreatmentProtocolRow[]): Promise<TreatmentProtocol[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((row) => row.id);
	const idPlaceholders = placeholders(ids);
	const itemRows = await selectMany<TreatmentProtocolItemRow>(
		`SELECT treatment_protocol_items.protocol_id,
			product_catalog_items.id,
			product_catalog_items.name,
			product_catalog_items.normalized_name,
			product_catalog_items.species
		 FROM treatment_protocol_items
		 JOIN product_catalog_items ON product_catalog_items.id = treatment_protocol_items.catalog_item_id
		 WHERE treatment_protocol_items.protocol_id IN (${idPlaceholders})
		 ORDER BY treatment_protocol_items.protocol_id, treatment_protocol_items.sort_order, product_catalog_items.name COLLATE NOCASE`,
		ids
	);
	const doseRows = await selectMany<TreatmentProtocolDoseRow>(
		`SELECT id, protocol_id, dose, validity_value, validity_unit, sort_order, updated_at
		 FROM treatment_protocol_doses
		 WHERE protocol_id IN (${idPlaceholders})
		 ORDER BY protocol_id, sort_order, id`,
		ids
	);

	const itemsByProtocol = new Map<TreatmentProtocolId, TreatmentProtocolCatalogItem[]>();
	for (const row of itemRows) {
		const items = itemsByProtocol.get(row.protocol_id) ?? [];
		items.push(mapItem(row));
		itemsByProtocol.set(row.protocol_id, items);
	}

	const dosesByProtocol = new Map<TreatmentProtocolId, TreatmentProtocolDose[]>();
	for (const row of doseRows) {
		const doses = dosesByProtocol.get(row.protocol_id) ?? [];
		doses.push(mapDose(row));
		dosesByProtocol.set(row.protocol_id, doses);
	}

	return rows.map((row) => mapProtocol(row, itemsByProtocol.get(row.id) ?? [], dosesByProtocol.get(row.id) ?? []));
}

async function getProtocolById(id: TreatmentProtocolId): Promise<TreatmentProtocol> {
	const rows = await selectMany<TreatmentProtocolRow>(
		`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
		 FROM treatment_protocols
		 WHERE id = $1 AND deleted_at IS NULL
		 LIMIT 1`,
		[id]
	);
	const protocols = await loadProtocolDetails(rows);
	if (!protocols[0]) throw new Error('protocol_not_found');
	return protocols[0];
}

async function resolveProtocolItemIds(kind: TreatmentProtocolKind, catalogItemIds: TreatmentCatalogItemId[]): Promise<TreatmentCatalogItemId[]> {
	const uniqueIds = [...new Set(catalogItemIds.map((id) => id.trim()).filter(Boolean))];
	if (uniqueIds.length === 0) throw new Error('protocol_item_required');

	const allowedTypeValues = [
		stringifyProductType(productTypeForTreatmentKind(kind)),
		...PRODUCT_TYPES.filter((type) => productTypeMatchesTreatmentKind(type, kind)).map(stringifyProductType)
	].filter((value, index, values) => values.indexOf(value) === index);
	const typePlaceholders = allowedTypeValues.map((_, index) => `$${index + 1}`).join(', ');
	const idPlaceholders = uniqueIds.map((_, index) => `$${allowedTypeValues.length + index + 1}`).join(', ');
	const allowedRows = await selectMany<{ id: TreatmentCatalogItemId }>(
		`SELECT id FROM product_catalog_items WHERE type IN (${typePlaceholders}) AND id IN (${idPlaceholders})`,
		[...allowedTypeValues, ...uniqueIds]
	);
	const allowedIds = new Set(allowedRows.map((row) => row.id));
	const filteredIds = uniqueIds.filter((id) => allowedIds.has(id));
	if (filteredIds.length === 0) throw new Error('protocol_item_required');

	return filteredIds;
}

async function saveProtocolItems(protocolId: TreatmentProtocolId, catalogItemIds: TreatmentCatalogItemId[]): Promise<void> {
	await execute('DELETE FROM treatment_protocol_items WHERE protocol_id = $1', [protocolId]);
	for (const [index, catalogItemId] of catalogItemIds.entries()) {
		await execute(
			`INSERT INTO treatment_protocol_items (protocol_id, catalog_item_id, sort_order, updated_at)
			 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
			[protocolId, catalogItemId, index]
		);
	}
}

export async function listTreatmentProtocols(kind?: TreatmentProtocolKind, includeHidden = false): Promise<TreatmentProtocol[]> {
	const rows = kind
		? await selectMany<TreatmentProtocolRow>(
				`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
				 FROM treatment_protocols
				 WHERE kind = $1 AND deleted_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
				 ORDER BY sort_order, name COLLATE NOCASE`,
				[kind]
			)
		: await selectMany<TreatmentProtocolRow>(
				`SELECT id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, deleted_at, purge_after, updated_at
				 FROM treatment_protocols
				 WHERE deleted_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
				 ORDER BY kind, sort_order, name COLLATE NOCASE`
			);

	return loadProtocolDetails(rows);
}

export async function saveTreatmentProtocol(input: TreatmentProtocolInput, id?: TreatmentProtocolId): Promise<TreatmentProtocol> {
	const kind = normalizeKind(input.kind);
	const { name, normalizedName } = normalizeName(input.name);
	const species = stringifyTreatmentSpecies(input.species);
	assertTextLimit(species, FIELD_LIMITS.productSpeciesJson);
	const observation = nullableMultilineText(input.observation, FIELD_LIMITS.treatmentObservation);
	const catalogItemIds = await resolveProtocolItemIds(kind, input.catalogItemIds);

	let protocolId = id ?? '';
	if (protocolId) {
		await assertTreatmentProtocolEditable(protocolId);
		await execute(
			`UPDATE treatment_protocols
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
		protocolId = createUuidV4();
		await execute(
			`INSERT INTO treatment_protocols (id, kind, origin, name, normalized_name, species, observation, sort_order, updated_at)
			 VALUES ($1, $2, 'user', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
			[protocolId, kind, name, normalizedName, species, observation, await nextProtocolSortOrder(kind)]
		);
	}

	if (!protocolId) throw new Error('protocol_save_failed');
	await saveProtocolItems(protocolId, catalogItemIds);
	return getProtocolById(protocolId);
}

export async function setTreatmentProtocolHidden(id: TreatmentProtocolId, hidden: boolean): Promise<TreatmentProtocol> {
	await execute(
		`UPDATE treatment_protocols
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id]
	);
	return getProtocolById(id);
}

export async function deleteTreatmentProtocol(id: TreatmentProtocolId): Promise<void> {
	await assertTreatmentProtocolEditable(id);
	const deletedAt = nowIso();
	await execute(
		`UPDATE treatment_protocols
		 SET deleted_at = COALESCE(deleted_at, $2),
			purge_after = COALESCE(purge_after, $3),
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function saveTreatmentProtocolDose(protocolId: TreatmentProtocolId, input: TreatmentProtocolDoseInput, id?: number): Promise<TreatmentProtocol> {
	await protocolKind(protocolId);
	await assertTreatmentProtocolEditable(protocolId);
	const dose = requiredText(input.dose, 'protocol_dose_required', FIELD_LIMITS.treatmentDose);
	const validityUnit = normalizeValidityUnit(input.validityUnit);
	const validityValue = normalizeValidityValue(Number(input.validityValue), validityUnit);

	if (id) {
		await execute(
			`UPDATE treatment_protocol_doses
			 SET dose = $3,
				validity_value = $4,
				validity_unit = $5,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND protocol_id = $2`,
			[id, protocolId, dose, validityValue, validityUnit]
		);
	} else {
		await execute(
			`INSERT INTO treatment_protocol_doses (protocol_id, dose, validity_value, validity_unit, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
			[protocolId, dose, validityValue, validityUnit, await nextDoseSortOrder(protocolId)]
		);
	}

	return getProtocolById(protocolId);
}

export async function deleteTreatmentProtocolDose(protocolId: TreatmentProtocolId, doseId: number): Promise<TreatmentProtocol> {
	await assertTreatmentProtocolEditable(protocolId);
	await execute('DELETE FROM treatment_protocol_doses WHERE id = $1 AND protocol_id = $2', [doseId, protocolId]);
	return getProtocolById(protocolId);
}
