import {
	validateImageCollectionItems,
	type ImageCollection,
	type ImageCollectionItem,
	type ImageCollectionItemInput,
	type ImageCollectionPolicy
} from '$lib/domain/image-collection/image-collection.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { FIELD_LIMITS, nullableMultilineText, requireLimitedText } from '$lib/domain/shared/field-limits.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';

interface ImageCollectionRow {
	id: number;
	entity_type: string;
	entity_id: number;
	primary_required: number;
	max_items: number | null;
	created_at: string | null;
	updated_at: string | null;
}

interface ImageCollectionItemRow {
	id: number;
	image_blob: unknown;
	original_image_blob: unknown;
	description: string | null;
	is_primary: number;
	sort_order: number;
	created_at: string | null;
	updated_at: string | null;
}

function bytesToSqlLiteral(value: Uint8Array): string {
	if (value.length === 0) throw new Error('image_required');
	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

function mapItem(row: ImageCollectionItemRow): ImageCollectionItem {
	const imageBytes = normalizeByteArray(row.image_blob);
	const originalImageBytes = normalizeByteArray(row.original_image_blob);
	if (!imageBytes || !originalImageBytes) throw new Error('image_collection_invalid');
	return {
		id: row.id,
		imageBytes,
		originalImageBytes,
		description: row.description,
		isPrimary: row.is_primary === 1,
		sortOrder: row.sort_order,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function normalizeItems(items: ImageCollectionItemInput[], policy: ImageCollectionPolicy): ImageCollectionItemInput[] {
	validateImageCollectionItems(items, policy);

	return items.map((item) => ({
		clientId: item.clientId,
		imageBytes: item.imageBytes,
		originalImageBytes: item.originalImageBytes,
		description: nullableMultilineText(item.description, FIELD_LIMITS.imageDescription) ?? '',
		isPrimary: item.isPrimary
	}));
}

export async function getImageCollection(entityType: string, entityId: number): Promise<ImageCollection | null> {
	const normalizedEntityType = requireLimitedText(entityType, FIELD_LIMITS.imageCollectionEntityType);
	const collection = await selectOne<ImageCollectionRow>(
		`SELECT id, entity_type, entity_id, primary_required, max_items, created_at, updated_at
		 FROM image_collections
		 WHERE entity_type = $1 AND entity_id = $2`,
		[normalizedEntityType, entityId]
	);
	if (!collection) return null;

	const items = await selectMany<ImageCollectionItemRow>(
		`SELECT id, image_blob, original_image_blob, description, is_primary, sort_order, created_at, updated_at
		 FROM image_collection_items
		 WHERE collection_id = $1
		 ORDER BY sort_order, id`,
		[collection.id]
	);

	return {
		id: collection.id,
		entityType: collection.entity_type,
		entityId: collection.entity_id,
		primaryRequired: collection.primary_required === 1,
		maxItems: collection.max_items,
		items: items.map(mapItem),
		createdAt: collection.created_at,
		updatedAt: collection.updated_at
	};
}

export async function replaceImageCollection(
	entityType: string,
	entityId: number,
	items: ImageCollectionItemInput[],
	policy: ImageCollectionPolicy
): Promise<ImageCollection> {
	const normalizedEntityType = requireLimitedText(entityType, FIELD_LIMITS.imageCollectionEntityType);
	const normalizedItems = normalizeItems(items, policy);

	await execute(
		`INSERT INTO image_collections (entity_type, entity_id, primary_required, max_items, updated_at)
		 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items,
			updated_at = CURRENT_TIMESTAMP`,
		[normalizedEntityType, entityId, policy.primaryRequired ? 1 : 0, policy.maxItems]
	);

	const collection = await selectOne<{ id: number }>(
		'SELECT id FROM image_collections WHERE entity_type = $1 AND entity_id = $2',
		[normalizedEntityType, entityId]
	);
	if (!collection) throw new Error('image_collection_save_failed');

	await execute('DELETE FROM image_collection_items WHERE collection_id = $1', [collection.id]);
	for (const [index, item] of normalizedItems.entries()) {
		await execute(
			`INSERT INTO image_collection_items (
				collection_id, image_blob, original_image_blob, description, is_primary, sort_order, updated_at
			)
			 VALUES ($1, ${bytesToSqlLiteral(item.imageBytes)}, ${bytesToSqlLiteral(item.originalImageBytes)}, $2, $3, $4, CURRENT_TIMESTAMP)`,
			[collection.id, item.description || null, item.isPrimary ? 1 : 0, index]
		);
	}

	const saved = await getImageCollection(normalizedEntityType, entityId);
	if (!saved) throw new Error('image_collection_save_failed');
	return saved;
}
