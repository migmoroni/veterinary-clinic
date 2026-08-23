import type { TreatmentProtocol, TreatmentProtocolCatalogItem, TreatmentProtocolDose, TreatmentProtocolDoseInput, TreatmentProtocolId, TreatmentProtocolInput, TreatmentProtocolKind, TreatmentProtocolOrigin, TreatmentProtocolValidityUnit } from '@vet/types/domain/treatment/protocol.js';
import { parseTreatmentSpecies, stringifyTreatmentSpecies } from '@vet/types/domain/treatment/species.js';
import { canEditTreatmentProtocol, normalizeTreatmentProtocolName } from '@vet/types/domain/treatment/protocol.js';
import { PRODUCT_TYPES, productTypeForTreatmentKind, productTypeMatchesTreatmentKind, stringifyProductType } from '@vet/types/domain/product/catalog.js';
import { FIELD_LIMITS, assertTextLimit, nullableMultilineText } from '@vet/types/domain/shared/field-limits.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import type { TreatmentCatalogItemId } from '@vet/types/domain/treatment/treatment.js';
import { execute, selectMany, selectSystemMany } from '@vet/core-local/sqlite/client.js';

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
	created_at: string | null;
	removed_at: string | null;
	updated_at: string | null;
}

interface TreatmentProtocolItemRow {
	protocol_id: TreatmentProtocolId;
	catalog_item_id: TreatmentCatalogItemId;
	sort_order: number;
}

interface TreatmentProtocolCatalogItemRow {
	id: TreatmentCatalogItemId;
	name: string;
	normalized_name: string;
	species: string;
}

interface TreatmentProtocolDoseRow {
	id: string;
	protocol_id: TreatmentProtocolId;
	dose: string;
	validity_value: number;
	validity_unit: TreatmentProtocolValidityUnit;
	sort_order: number;
	created_at: string | null;
	updated_at: string | null;
}

const USER_PROTOCOL_COLUMNS = 'id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, created_at, removed_at, updated_at';
const SYSTEM_PROTOCOL_COLUMNS = 'id, kind, origin, name, normalized_name, species, observation, sort_order, hidden_at, NULL AS created_at, NULL AS removed_at, NULL AS updated_at';

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

function mapDose(row: TreatmentProtocolDoseRow): TreatmentProtocolDose {
	return {
		id: row.id,
		protocolId: row.protocol_id,
		dose: row.dose,
		validityValue: row.validity_value,
		validityUnit: row.validity_unit,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
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
		createdAt: row.created_at,
		removedAt: row.removed_at,
		updatedAt: row.updated_at,
		items,
		doses
	};
}

function placeholders(values: unknown[]): string {
	return values.map((_, index) => `$${index + 1}`).join(', ');
}

async function nextProtocolSortOrder(kind: TreatmentProtocolKind): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM treatment_protocols WHERE kind = $1 AND removed_at IS NULL', [kind]);
	return rows[0]?.next_order ?? 0;
}

async function nextDoseSortOrder(protocolId: TreatmentProtocolId): Promise<number> {
	const rows = await selectMany<{ next_order: number }>('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM treatment_protocol_doses WHERE protocol_id = $1 AND removed_at IS NULL', [protocolId]);
	return rows[0]?.next_order ?? 0;
}

async function protocolKind(protocolId: TreatmentProtocolId): Promise<TreatmentProtocolKind> {
	const row = await selectProtocolRowById(protocolId);
	if (!row) throw new Error('protocol_not_found');
	return row.kind;
}

async function assertTreatmentProtocolEditable(protocolId: TreatmentProtocolId): Promise<void> {
	const protocol = await selectProtocolRowById(protocolId);
	if (!protocol) throw new Error('protocol_not_found');
	if (!canEditTreatmentProtocol(protocol)) throw new Error('treatment_protocol_system_item');
}

async function loadProtocolDetails(rows: TreatmentProtocolRow[]): Promise<TreatmentProtocol[]> {
	if (rows.length === 0) return [];
	const ids = rows.map((row) => row.id);
	const idPlaceholders = placeholders(ids);
	const [userItemRows, referenceItemRows, userDoseRows, referenceDoseRows] = await Promise.all([
		selectMany<TreatmentProtocolItemRow>(
			`SELECT protocol_id, catalog_item_id, sort_order
			 FROM treatment_protocol_items
			 WHERE protocol_id IN (${idPlaceholders}) AND removed_at IS NULL`,
			ids
		),
		selectSystemMany<TreatmentProtocolItemRow>(
			`SELECT protocol_id, catalog_item_id, sort_order
			 FROM treatment_protocol_items
			 WHERE protocol_id IN (${idPlaceholders})`,
			ids
		),
		selectMany<TreatmentProtocolDoseRow>(
			`SELECT id, protocol_id, dose, validity_value, validity_unit, sort_order, created_at, updated_at
			 FROM treatment_protocol_doses
			 WHERE protocol_id IN (${idPlaceholders}) AND removed_at IS NULL`,
			ids
		),
		selectSystemMany<TreatmentProtocolDoseRow>(
			`SELECT id, protocol_id, dose, validity_value, validity_unit, sort_order, NULL AS created_at, NULL AS updated_at
			 FROM treatment_protocol_doses
			 WHERE protocol_id IN (${idPlaceholders})`,
			ids
		)
	]);
	const itemRows = [...referenceItemRows, ...userItemRows].sort((first, second) => first.protocol_id.localeCompare(second.protocol_id) || first.sort_order - second.sort_order || first.catalog_item_id.localeCompare(second.catalog_item_id));
	const doseRows = [...referenceDoseRows, ...userDoseRows].sort((first, second) => first.protocol_id.localeCompare(second.protocol_id) || first.sort_order - second.sort_order || first.id.localeCompare(second.id));

	const itemsByProtocol = new Map<TreatmentProtocolId, TreatmentProtocolCatalogItem[]>();
	for (const row of itemRows) {
		const catalogItem = await getTreatmentProtocolCatalogItemById(row.catalog_item_id);
		if (!catalogItem) continue;
		const items = itemsByProtocol.get(row.protocol_id) ?? [];
		items.push(catalogItem);
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

async function selectProtocolRowById(id: TreatmentProtocolId): Promise<TreatmentProtocolRow | null> {
	const userRows = await selectMany<TreatmentProtocolRow>(
		`SELECT ${USER_PROTOCOL_COLUMNS}
		 FROM treatment_protocols
		 WHERE id = $1 AND removed_at IS NULL
		 LIMIT 1`,
		[id]
	);
	if (userRows[0]) return userRows[0];
	const referenceRows = await selectSystemMany<TreatmentProtocolRow>(
		`SELECT ${SYSTEM_PROTOCOL_COLUMNS}
		 FROM treatment_protocols
		 WHERE id = $1
		 LIMIT 1`,
		[id]
	);
	return referenceRows[0] ?? null;
}

async function getTreatmentProtocolCatalogItemById(id: TreatmentCatalogItemId, allowedTypeValues: string[] | null = null): Promise<TreatmentProtocolCatalogItem | null> {
	const typeFilter = allowedTypeValues && allowedTypeValues.length > 0 ? `AND type IN (${allowedTypeValues.map((_, index) => `$${index + 2}`).join(', ')})` : '';
	const values = allowedTypeValues && allowedTypeValues.length > 0 ? [id, ...allowedTypeValues] : [id];
	const [userRows, referenceRows] = await Promise.all([
		selectMany<TreatmentProtocolCatalogItemRow>(
			`SELECT id, name, normalized_name, species
			 FROM user_product_catalog_items
			 WHERE id = $1 AND removed_at IS NULL ${typeFilter}
			 LIMIT 1`,
			values
		),
		selectSystemMany<TreatmentProtocolCatalogItemRow>(
			`SELECT id, name, normalized_name, species
			 FROM product_catalog_items
			 WHERE id = $1 ${typeFilter}
			 LIMIT 1`,
			values
		)
	]);
	const row = userRows[0] ?? referenceRows[0] ?? null;
	if (!row) return null;
	return { id: row.id, name: row.name, normalizedName: row.normalized_name, species: parseTreatmentSpecies(row.species) };
}

async function getProtocolById(id: TreatmentProtocolId): Promise<TreatmentProtocol> {
	const row = await selectProtocolRowById(id);
	const protocols = await loadProtocolDetails(row ? [row] : []);
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
	const allowedIds = new Set<TreatmentCatalogItemId>();
	for (const id of uniqueIds) {
		const item = await getTreatmentProtocolCatalogItemById(id, allowedTypeValues);
		if (item) allowedIds.add(id);
	}
	const filteredIds = uniqueIds.filter((id) => allowedIds.has(id));
	if (filteredIds.length === 0) throw new Error('protocol_item_required');

	return filteredIds;
}

async function saveProtocolItems(protocolId: TreatmentProtocolId, catalogItemIds: TreatmentCatalogItemId[]): Promise<void> {
	const removedAt = nowIso();
	await execute('UPDATE treatment_protocol_items SET removed_at = $2, updated_at = $2 WHERE protocol_id = $1 AND removed_at IS NULL', [protocolId, removedAt]);
	for (const [index, catalogItemId] of catalogItemIds.entries()) {
		const createdAt = nowIso();
		await execute(
			`INSERT INTO treatment_protocol_items (id, protocol_id, catalog_item_id, sort_order, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $5)
			 ON CONFLICT(protocol_id, catalog_item_id) DO UPDATE SET sort_order = excluded.sort_order, removed_at = NULL, updated_at = excluded.updated_at`,
			[createUuidV7(), protocolId, catalogItemId, index, createdAt]
		);
	}
}

export async function listTreatmentProtocols(kind?: TreatmentProtocolKind, includeHidden = false): Promise<TreatmentProtocol[]> {
	const userWhere = kind ? `kind = $1 AND removed_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}` : `removed_at IS NULL AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}`;
	const systemWhere = kind ? `kind = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}` : includeHidden ? '1 = 1' : 'hidden_at IS NULL';
	const values = kind ? [kind] : [];
	const [userRows, referenceRows] = await Promise.all([
		selectMany<TreatmentProtocolRow>(
			`SELECT ${USER_PROTOCOL_COLUMNS}
			 FROM treatment_protocols
			 WHERE ${userWhere}`,
			values
		),
		selectSystemMany<TreatmentProtocolRow>(
			`SELECT ${SYSTEM_PROTOCOL_COLUMNS}
			 FROM treatment_protocols
			 WHERE ${systemWhere}`,
			values
		)
	]);
	const rows = [...referenceRows, ...userRows].sort(
		(first, second) => first.kind.localeCompare(second.kind) || first.sort_order - second.sort_order || first.name.localeCompare(second.name)
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
				updated_at = $7
			 WHERE id = $1 AND removed_at IS NULL`,
			[protocolId, kind, name, normalizedName, species, observation, nowIso()]
		);
	} else {
		protocolId = createUuidV7();
		const createdAt = nowIso();
		await execute(
			`INSERT INTO treatment_protocols (id, kind, origin, name, normalized_name, species, observation, sort_order, created_at, updated_at)
			 VALUES ($1, $2, 'user', $3, $4, $5, $6, $7, $8, $8)`,
			[protocolId, kind, name, normalizedName, species, observation, await nextProtocolSortOrder(kind), createdAt]
		);
	}

	if (!protocolId) throw new Error('protocol_save_failed');
	await saveProtocolItems(protocolId, catalogItemIds);
	return getProtocolById(protocolId);
}

export async function setTreatmentProtocolHidden(id: TreatmentProtocolId, hidden: boolean): Promise<TreatmentProtocol> {
	await assertTreatmentProtocolEditable(id);
	const updatedAt = nowIso();
	await execute(
		`UPDATE treatment_protocols
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, $2)' : 'NULL'},
			updated_at = $2
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, updatedAt]
	);
	return getProtocolById(id);
}

export async function deleteTreatmentProtocol(id: TreatmentProtocolId): Promise<void> {
	await assertTreatmentProtocolEditable(id);
	const removedAt = nowIso();
	await execute(
		`UPDATE treatment_protocols
		 SET removed_at = COALESCE(removed_at, $2),
			updated_at = $2
		 WHERE id = $1`,
		[id, removedAt]
	);
}

export async function saveTreatmentProtocolDose(protocolId: TreatmentProtocolId, input: TreatmentProtocolDoseInput, id?: string): Promise<TreatmentProtocol> {
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
				updated_at = $6
			 WHERE id = $1 AND protocol_id = $2 AND removed_at IS NULL`,
			[id, protocolId, dose, validityValue, validityUnit, nowIso()]
		);
	} else {
		const createdAt = nowIso();
		await execute(
			`INSERT INTO treatment_protocol_doses (id, protocol_id, dose, validity_value, validity_unit, sort_order, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
			[createUuidV7(), protocolId, dose, validityValue, validityUnit, await nextDoseSortOrder(protocolId), createdAt]
		);
	}

	return getProtocolById(protocolId);
}

export async function deleteTreatmentProtocolDose(protocolId: TreatmentProtocolId, doseId: string): Promise<TreatmentProtocol> {
	await assertTreatmentProtocolEditable(protocolId);
	const removedAt = nowIso();
	await execute('UPDATE treatment_protocol_doses SET removed_at = $3, updated_at = $3 WHERE id = $1 AND protocol_id = $2 AND removed_at IS NULL', [doseId, protocolId, removedAt]);
	return getProtocolById(protocolId);
}
