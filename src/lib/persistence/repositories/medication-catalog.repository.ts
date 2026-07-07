import { canEditMedicationCatalogItem, parseMedicationAliases, parseMedicationRegions, parseMedicationSpecies, stringifyMedicationAliases, stringifyMedicationRegions, stringifyMedicationSpecies, type MedicationCatalogOrigin } from '$lib/domain/medication/catalog.js';
import type { ImageCollectionItem, ImageCollectionItemInput, ImageCollectionPolicy } from '$lib/domain/image-collection/image-collection.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText } from '$lib/domain/shared/field-limits.js';
import type { TreatmentCatalogItem, TreatmentCatalogItemInput, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { normalizeTreatmentName } from '$lib/domain/treatment/treatment.js';
import { deleteImageCollection, getImageCollection, replaceImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type MedicationCatalogKind = TreatmentKind;
export type MedicationCatalogItem = TreatmentCatalogItem;

interface MedicationCatalogItemRow {
	id: number;
	kind: MedicationCatalogKind;
	name: string;
	normalized_name: string;
	species: string;
	aliases: string;
	manufacturer: string | null;
	origin: MedicationCatalogOrigin;
	regions: string;
	hidden_at: string | null;
	updated_at: string | null;
}

interface MedicationCatalogConfig {
	nameLimit: number;
	normalizedNameLimit: number;
	requiredError: string;
	saveFailedError: string;
	normalize: (value: string) => string;
}

const treatmentCatalogConfig: MedicationCatalogConfig = {
	nameLimit: FIELD_LIMITS.treatmentName,
	normalizedNameLimit: FIELD_LIMITS.treatmentNormalizedName,
	requiredError: 'treatment_name_required',
	saveFailedError: 'treatment_save_failed',
	normalize: normalizeTreatmentName
};

export const MEDICATION_CATALOG_IMAGE_COLLECTION_TYPE = 'medication_catalog_item';
export const MEDICATION_CATALOG_IMAGE_POLICY: ImageCollectionPolicy = {
	primaryRequired: true,
	maxItems: 9
};

const catalogConfigs: Record<MedicationCatalogKind, MedicationCatalogConfig> = {
	vaccine: treatmentCatalogConfig,
	antiparasitic: treatmentCatalogConfig
};

function configFor(kind: MedicationCatalogKind): MedicationCatalogConfig {
	return catalogConfigs[kind];
}

function primaryImage(images: ImageCollectionItem[]): ImageCollectionItem | null {
	return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

function mapCatalogItem(row: MedicationCatalogItemRow, images: ImageCollectionItem[] = []): MedicationCatalogItem {
	const config = configFor(row.kind);
	return {
		id: row.id,
		kind: row.kind,
		name: row.name,
		normalizedName: row.normalized_name,
		species: parseMedicationSpecies(row.species),
		aliases: parseMedicationAliases(row.aliases, FIELD_LIMITS.medicationAlias, config.normalize, row.normalized_name),
		manufacturer: row.manufacturer,
		images,
		primaryImage: primaryImage(images),
		origin: row.origin,
		regions: parseMedicationRegions(row.regions),
		hiddenAt: row.hidden_at,
		updatedAt: row.updated_at
	};
}

async function loadCatalogItemImages(id: number): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(MEDICATION_CATALOG_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

async function mapCatalogItemWithImages(row: MedicationCatalogItemRow): Promise<MedicationCatalogItem> {
	return mapCatalogItem(row, await loadCatalogItemImages(row.id));
}

function normalizeMedicationCatalogMetadata(
	kind: MedicationCatalogKind,
	input: Pick<TreatmentCatalogItemInput, 'species' | 'aliases' | 'manufacturer' | 'regions'>,
	normalizedName: string
): { species: string; aliases: string; manufacturer: string | null; regions: string } {
	const config = configFor(kind);
	const species = stringifyMedicationSpecies(input.species);
	const aliases = stringifyMedicationAliases(input.aliases, FIELD_LIMITS.medicationAlias, config.normalize, normalizedName);
	const manufacturer = nullableLimitedText(input.manufacturer, FIELD_LIMITS.medicationManufacturer);
	const regions = stringifyMedicationRegions(input.regions);
	assertTextLimit(species, FIELD_LIMITS.medicationSpeciesJson);
	assertTextLimit(aliases, FIELD_LIMITS.medicationAliasesJson);
	assertTextLimit(regions, FIELD_LIMITS.medicationRegionsJson);
	return { species, aliases, manufacturer, regions };
}

export function normalizeMedicationCatalogInput(kind: MedicationCatalogKind, value: string): { name: string; normalizedName: string } {
	const config = configFor(kind);
	const name = value.trim();
	if (!name) throw new Error(config.requiredError);
	assertTextLimit(name, config.nameLimit);

	const normalizedName = config.normalize(name);
	if (!normalizedName) throw new Error(config.requiredError);
	assertTextLimit(normalizedName, config.normalizedNameLimit);

	return { name, normalizedName };
}

async function getMedicationCatalogItemByNormalizedName(kind: MedicationCatalogKind, normalizedName: string): Promise<MedicationCatalogItem | null> {
	const rows = await selectMany<MedicationCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, hidden_at, updated_at
		 FROM medication_catalog_items
		 WHERE kind = $1 AND normalized_name = $2
		 LIMIT 1`,
		[kind, normalizedName]
	);

	return rows[0] ? mapCatalogItemWithImages(rows[0]) : null;
}

async function assertMedicationCatalogItemEditable(kind: MedicationCatalogKind, id: number): Promise<void> {
	const rows = await selectMany<Pick<MedicationCatalogItemRow, 'origin'>>(
		`SELECT origin
		 FROM medication_catalog_items
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);
	if (rows[0] && !canEditMedicationCatalogItem(rows[0])) throw new Error('medication_catalog_system_item');
}

export async function ensureMedicationCatalogItem(kind: MedicationCatalogKind, name: string, normalizedName: string): Promise<MedicationCatalogItem> {
	const existingItem = await getMedicationCatalogItemByNormalizedName(kind, normalizedName);
	if (existingItem?.origin === 'system') return existingItem;

	const metadata = normalizeMedicationCatalogMetadata(kind, {}, normalizedName);
	await execute(
		`INSERT INTO medication_catalog_items (kind, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'user', $7, CURRENT_TIMESTAMP)
		 ON CONFLICT(kind, normalized_name) DO UPDATE SET
			name = excluded.name,
			updated_at = CURRENT_TIMESTAMP`,
		[kind, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
	);

	const item = await getMedicationCatalogItemByNormalizedName(kind, normalizedName);
	if (!item) throw new Error(configFor(kind).saveFailedError);
	return item;
}

export async function listMedicationCatalogItems(kind: MedicationCatalogKind, includeHidden = false): Promise<MedicationCatalogItem[]> {
	const rows = await selectMany<MedicationCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, hidden_at, updated_at
		 FROM medication_catalog_items
		 WHERE kind = $1 AND ${includeHidden ? '1 = 1' : 'hidden_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`,
		[kind]
	);

	const imagesByIndex = await Promise.all(rows.map((row) => loadCatalogItemImages(row.id)));
	return rows.map((row, index) => mapCatalogItem(row, imagesByIndex[index] ?? []));
}

export async function saveMedicationCatalogItem(kind: MedicationCatalogKind, input: TreatmentCatalogItemInput, id?: number): Promise<MedicationCatalogItem> {
	const { name, normalizedName } = normalizeMedicationCatalogInput(kind, input.name);
	const metadata = normalizeMedicationCatalogMetadata(kind, input, normalizedName);

	if (id) {
		await assertMedicationCatalogItemEditable(kind, id);
		await execute(
			`UPDATE medication_catalog_items
			 SET name = $3,
				normalized_name = $4,
				species = $5,
				aliases = $6,
				manufacturer = $7,
				regions = $8,
				updated_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND kind = $2`,
			[id, kind, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
		);

		const rows = await selectMany<MedicationCatalogItemRow>(
			`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, hidden_at, updated_at
			 FROM medication_catalog_items
			 WHERE id = $1 AND kind = $2
			 LIMIT 1`,
			[id, kind]
		);
		if (rows[0]) return mapCatalogItemWithImages(rows[0]);
		throw new Error(configFor(kind).saveFailedError);
	}

	const existingItem = await getMedicationCatalogItemByNormalizedName(kind, normalizedName);
	if (existingItem && !canEditMedicationCatalogItem(existingItem)) throw new Error('medication_catalog_system_item');

	await execute(
		`INSERT INTO medication_catalog_items (kind, name, normalized_name, species, aliases, manufacturer, origin, regions, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'user', $7, CURRENT_TIMESTAMP)
		 ON CONFLICT(kind, normalized_name) DO UPDATE SET
			name = excluded.name,
			species = excluded.species,
			aliases = excluded.aliases,
			manufacturer = excluded.manufacturer,
			regions = excluded.regions,
			hidden_at = NULL,
			updated_at = CURRENT_TIMESTAMP`,
		[kind, name, normalizedName, metadata.species, metadata.aliases, metadata.manufacturer, metadata.regions]
	);

	const item = await getMedicationCatalogItemByNormalizedName(kind, normalizedName);
	if (!item) throw new Error(configFor(kind).saveFailedError);
	return item;
}

export async function setMedicationCatalogItemHidden(kind: MedicationCatalogKind, id: number, hidden: boolean): Promise<MedicationCatalogItem> {
	await execute(
		`UPDATE medication_catalog_items
		 SET hidden_at = ${hidden ? 'COALESCE(hidden_at, CURRENT_TIMESTAMP)' : 'NULL'},
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND kind = $2`,
		[id, kind]
	);

	const rows = await selectMany<MedicationCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, hidden_at, updated_at
		 FROM medication_catalog_items
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);
	if (!rows[0]) throw new Error(configFor(kind).saveFailedError);
	return mapCatalogItemWithImages(rows[0]);
}

export async function deleteMedicationCatalogItem(kind: MedicationCatalogKind, id: number): Promise<void> {
	await assertMedicationCatalogItemEditable(kind, id);
	await deleteImageCollection(MEDICATION_CATALOG_IMAGE_COLLECTION_TYPE, id);
	await execute('DELETE FROM medication_catalog_items WHERE id = $1 AND kind = $2', [id, kind]);
}

export async function saveMedicationCatalogItemImages(kind: MedicationCatalogKind, id: number, images: ImageCollectionItemInput[]): Promise<MedicationCatalogItem> {
	const rows = await selectMany<MedicationCatalogItemRow>(
		`SELECT id, kind, name, normalized_name, species, aliases, manufacturer, origin, regions, hidden_at, updated_at
		 FROM medication_catalog_items
		 WHERE id = $1 AND kind = $2
		 LIMIT 1`,
		[id, kind]
	);
	const row = rows[0];
	if (!row) throw new Error(configFor(kind).saveFailedError);
	if (!canEditMedicationCatalogItem(row)) throw new Error('medication_catalog_system_item');

	const collection = await replaceImageCollection(MEDICATION_CATALOG_IMAGE_COLLECTION_TYPE, id, images, MEDICATION_CATALOG_IMAGE_POLICY);
	return mapCatalogItem(row, collection.items);
}
