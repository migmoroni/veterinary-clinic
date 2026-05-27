import type { Dewormer } from '$lib/domain/deworming/deworming.js';
import { normalizeDewormerName } from '$lib/domain/deworming/deworming.js';
import { FIELD_LIMITS, assertTextLimit } from '$lib/domain/shared/field-limits.js';
import type { Vaccine } from '$lib/domain/vaccine/vaccine.js';
import { normalizeVaccineName } from '$lib/domain/vaccine/vaccine.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type PreventiveCatalogKind = 'vaccine' | 'dewormer';
export type PreventiveCatalogItem = Vaccine | Dewormer;

interface PreventiveCatalogItemRow {
	id: number;
	kind: PreventiveCatalogKind;
	name: string;
	normalized_name: string;
	hidden_at: string | null;
	updated_at: string | null;
}

interface PreventiveCatalogConfig {
	nameLimit: number;
	normalizedNameLimit: number;
	requiredError: string;
	saveFailedError: string;
	normalize: (value: string) => string;
}

const catalogConfigs: Record<PreventiveCatalogKind, PreventiveCatalogConfig> = {
	vaccine: {
		nameLimit: FIELD_LIMITS.vaccineName,
		normalizedNameLimit: FIELD_LIMITS.vaccineNormalizedName,
		requiredError: 'vaccine_name_required',
		saveFailedError: 'vaccine_save_failed',
		normalize: normalizeVaccineName
	},
	dewormer: {
		nameLimit: FIELD_LIMITS.dewormerName,
		normalizedNameLimit: FIELD_LIMITS.dewormerNormalizedName,
		requiredError: 'deworming_name_required',
		saveFailedError: 'deworming_save_failed',
		normalize: normalizeDewormerName
	}
};

function configFor(kind: PreventiveCatalogKind): PreventiveCatalogConfig {
	return catalogConfigs[kind];
}

function mapCatalogItem(row: PreventiveCatalogItemRow): PreventiveCatalogItem {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

export function normalizePreventiveCatalogInput(kind: PreventiveCatalogKind, value: string): { name: string; normalizedName: string } {
	const config = configFor(kind);
	const name = value.trim();
	if (!name) throw new Error(config.requiredError);
	assertTextLimit(name, config.nameLimit);

	const normalizedName = config.normalize(name);
	if (!normalizedName) throw new Error(config.requiredError);
	assertTextLimit(normalizedName, config.normalizedNameLimit);

	return { name, normalizedName };
}

async function getPreventiveCatalogItemByNormalizedName(kind: PreventiveCatalogKind, normalizedName: string): Promise<PreventiveCatalogItem | null> {
	const rows = await selectMany<PreventiveCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, hidden_at, updated_at
		 FROM preventive_catalog_items
		 WHERE kind = $1 AND normalized_name = $2
		 LIMIT 1`,
		[kind, normalizedName]
	);

	return rows[0] ? mapCatalogItem(rows[0]) : null;
}

export async function ensurePreventiveCatalogItem(kind: PreventiveCatalogKind, name: string, normalizedName: string): Promise<PreventiveCatalogItem> {
	await execute(
		`INSERT INTO preventive_catalog_items (kind, name, normalized_name, updated_at)
		 VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		 ON CONFLICT(kind, normalized_name) DO UPDATE SET
			name = excluded.name,
			updated_at = CURRENT_TIMESTAMP`,
		[kind, name, normalizedName]
	);

	const item = await getPreventiveCatalogItemByNormalizedName(kind, normalizedName);
	if (!item) throw new Error(configFor(kind).saveFailedError);
	return item;
}

export async function listPreventiveCatalogItems(kind: PreventiveCatalogKind, includeHidden = false): Promise<PreventiveCatalogItem[]> {
	const rows = await selectMany<PreventiveCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, hidden_at, updated_at
		 FROM preventive_catalog_items
		 WHERE kind = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`,
		[kind]
	);

	return rows.map(mapCatalogItem);
}

export async function savePreventiveCatalogItem(kind: PreventiveCatalogKind, input: { name: string }, id?: number): Promise<PreventiveCatalogItem> {
	const { name, normalizedName } = normalizePreventiveCatalogInput(kind, input.name);

	if (id) {
		await execute(
			`UPDATE preventive_catalog_items
			 SET name = $3,
				normalized_name = $4,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND kind = $2`,
			[id, kind, name, normalizedName]
		);

		const rows = await selectMany<PreventiveCatalogItemRow>(
			`SELECT id, kind, name, normalized_name, hidden_at, updated_at
			 FROM preventive_catalog_items
			 WHERE id = $1 AND kind = $2
			 LIMIT 1`,
			[id, kind]
		);
		if (rows[0]) return mapCatalogItem(rows[0]);
		throw new Error(configFor(kind).saveFailedError);
	}

	return ensurePreventiveCatalogItem(kind, name, normalizedName);
}

export async function setPreventiveCatalogItemHidden(kind: PreventiveCatalogKind, id: number, hidden: boolean): Promise<PreventiveCatalogItem> {
	await execute(
		`UPDATE preventive_catalog_items
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = $2`,
		[id, kind]
	);

	const rows = await selectMany<PreventiveCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, hidden_at, updated_at
		 FROM preventive_catalog_items
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);
	if (!rows[0]) throw new Error(configFor(kind).saveFailedError);
	return mapCatalogItem(rows[0]);
}

export async function deletePreventiveCatalogItem(kind: PreventiveCatalogKind, id: number): Promise<void> {
	await execute('DELETE FROM preventive_catalog_items WHERE id = $1 AND kind = $2', [id, kind]);
}
