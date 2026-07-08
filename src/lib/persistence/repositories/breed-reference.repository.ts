import type { ImageCollectionItem } from '$lib/domain/image-collection/image-collection.js';
import {
	buildBreedReferenceProfile,
	parseBreedReferenceExtension,
	parseBreedSexRange,
	type BreedReferenceProfile,
	type BreedReferenceSpecies,
	type BreedSizeCategory
} from '$lib/domain/pet/breed-reference.js';
import type { TranslationKey } from '$lib/i18n/index.js';
import { getImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';

export const BREED_REFERENCE_IMAGE_COLLECTION_TYPE = 'breed_reference_item';

interface BreedReferenceRow {
	id: number;
	breed_id: string;
	species: BreedReferenceSpecies;
	label_key: string;
	origin_id: string;
	origin_label_key: string | null;
	origin_country_code: string | null;
	origin_latitude: number | null;
	origin_longitude: number | null;
	size_category: BreedSizeCategory;
	average_weight_kg: string;
	average_height_cm: string;
	extension: string;
	updated_at: string | null;
}

const BREED_REFERENCE_COLUMNS = [
	'id',
	'breed_id',
	'species',
	'label_key',
	'origin_id',
	'origin_label_key',
	'origin_country_code',
	'origin_latitude',
	'origin_longitude',
	'size_category',
	'average_weight_kg',
	'average_height_cm',
	'extension',
	'updated_at'
].join(', ');

function primaryImage(images: ImageCollectionItem[]): ImageCollectionItem | null {
	return images.find((image) => image.isPrimary) ?? images[0] ?? null;
}

async function loadBreedReferenceImages(id: number): Promise<ImageCollectionItem[]> {
	const collection = await getImageCollection(BREED_REFERENCE_IMAGE_COLLECTION_TYPE, id);
	return collection?.items ?? [];
}

function mapBreedReference(row: BreedReferenceRow, images: ImageCollectionItem[] = []): BreedReferenceProfile {
	const primary = primaryImage(images);
	return buildBreedReferenceProfile({
		id: row.id,
		breedId: row.breed_id,
		species: row.species,
		labelKey: row.label_key as TranslationKey,
		origin: {
			id: row.origin_id,
			labelKey: (row.origin_label_key as TranslationKey | null) ?? undefined,
			countryCode: row.origin_country_code ?? undefined,
			latitude: row.origin_latitude,
			longitude: row.origin_longitude
		},
		sizeCategory: row.size_category,
		averageWeightKg: parseBreedSexRange(row.average_weight_kg),
		averageHeightCm: parseBreedSexRange(row.average_height_cm),
		images,
		primaryImage: primary,
		extension: parseBreedReferenceExtension(row.extension),
		updatedAt: row.updated_at
	});
}

export async function listBreedReferences(includeImages = true): Promise<BreedReferenceProfile[]> {
	const rows = await selectMany<BreedReferenceRow>(
		`SELECT ${BREED_REFERENCE_COLUMNS}
		 FROM breed_reference_items
		 ORDER BY species, label_key COLLATE NOCASE, breed_id`
	);

	if (!includeImages) return rows.map((row) => mapBreedReference(row));

	const imagesByIndex = await Promise.all(rows.map((row) => loadBreedReferenceImages(row.id)));
	return rows.map((row, index) => mapBreedReference(row, imagesByIndex[index] ?? []));
}

export async function getBreedReferenceByBreedId(breedId: string): Promise<BreedReferenceProfile | null> {
	const rows = await selectMany<BreedReferenceRow>(
		`SELECT ${BREED_REFERENCE_COLUMNS}
		 FROM breed_reference_items
		 WHERE breed_id = $1
		 LIMIT 1`,
		[breedId]
	);

	const row = rows[0];
	if (!row) return null;
	return mapBreedReference(row, await loadBreedReferenceImages(row.id));
}
