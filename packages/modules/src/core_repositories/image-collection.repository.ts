import {
	validateImageCollectionItems,
	type ImageCollection,
	type ImageCollectionEntityId,
	type ImageCollectionItem,
	type ImageCollectionItemInput,
	type ImageCollectionPolicy
} from '@vet/types/domain/image-collection/image-collection.js';
import { FIELD_LIMITS, nullableMultilineText, requireLimitedText } from '@vet/types/domain/shared/field-limits.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { loadMediaDataMap, mediaHashKey, saveMedia } from '@vet/modules/core_repositories/media.repository.js';
import { execute, selectMany, selectOne, selectSystemMany, selectSystemOne } from '@vet/core-local/sqlite/client.js';
import { mediaHashToSqlLiteral, normalizeMediaHash } from '@vet/core-local/sqlite/media.js';

interface ImageCollectionRow {
	id: string;
	entity_type: string;
	entity_id: ImageCollectionEntityId;
	primary_required: number;
	max_items: number | null;
	created_at: string | null;
	updated_at: string | null;
}

interface ImageCollectionItemRow {
	id: string;
	image_hash: unknown;
	original_image_hash: unknown;
	description: string | null;
	is_primary: number;
	sort_order: number;
	created_at: string | null;
	updated_at: string | null;
}

function mapItem(row: ImageCollectionItemRow, imageBytes: Uint8Array | null, originalImageBytes: Uint8Array | null): ImageCollectionItem {
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

type ImageCollectionSource = 'user' | 'system';

function imageCollectionSelect(source: ImageCollectionSource): {
	selectMany: typeof selectMany;
	selectOne: typeof selectOne;
} {
	return source === 'system' ? { selectMany: selectSystemMany, selectOne: selectSystemOne } : { selectMany, selectOne };
}

function imageCollectionColumns(source: ImageCollectionSource): string {
	return source === 'system'
		? 'id, entity_type, entity_id, primary_required, max_items, NULL AS created_at, NULL AS updated_at'
		: 'id, entity_type, entity_id, primary_required, max_items, created_at, updated_at';
}

function imageCollectionItemColumns(source: ImageCollectionSource): string {
	return source === 'system'
		? 'id, image_hash, original_image_hash, description, is_primary, sort_order, NULL AS created_at, NULL AS updated_at'
		: 'id, image_hash, original_image_hash, description, is_primary, sort_order, created_at, updated_at';
}

/** Validates policy invariants and normalizes optional descriptions. */
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

/**
 * Loads a collection and its ordered items for the owning entity.
 *
 * @returns `null` when the entity has no collection record.
 */
export async function getImageCollection(entityType: string, entityId: ImageCollectionEntityId, source: ImageCollectionSource = 'user'): Promise<ImageCollection | null> {
	const normalizedEntityType = requireLimitedText(entityType, FIELD_LIMITS.imageCollectionEntityType);
	const normalizedEntityId = String(entityId);
	const database = imageCollectionSelect(source);
	const collection = await database.selectOne<ImageCollectionRow>(
		`SELECT ${imageCollectionColumns(source)}
		 FROM image_collections
		 WHERE entity_type = $1 AND entity_id = $2 ${source === 'system' ? '' : 'AND removed_at IS NULL'}`,
		[normalizedEntityType, normalizedEntityId]
	);
	if (!collection) return null;

	const items = await database.selectMany<ImageCollectionItemRow>(
		`SELECT ${imageCollectionItemColumns(source)}
		 FROM image_collection_items
		 WHERE collection_id = $1 ${source === 'system' ? '' : 'AND removed_at IS NULL'}
		 ORDER BY sort_order, id`,
		[collection.id]
	);
	const imageMap = await loadMediaDataMap(source, items.map((item) => normalizeMediaHash(item.image_hash)));
	const originalImageMap = await loadMediaDataMap(source, items.map((item) => normalizeMediaHash(item.original_image_hash)));

	return {
		id: collection.id,
		entityType: collection.entity_type,
		entityId: collection.entity_id,
		primaryRequired: collection.primary_required === 1,
		maxItems: collection.max_items,
		items: items.map((item) => mapItem(item, imageMap.get(mediaHashKey(item.image_hash) ?? '') ?? null, originalImageMap.get(mediaHashKey(item.original_image_hash) ?? '') ?? null)),
		createdAt: collection.created_at,
		updatedAt: collection.updated_at
	};
}

/**
 * Replaces the complete ordered contents and policy of an entity's collection.
 * The input array order is persisted as `sortOrder`.
 */
export async function replaceImageCollection(
	entityType: string,
	entityId: ImageCollectionEntityId,
	items: ImageCollectionItemInput[],
	policy: ImageCollectionPolicy
): Promise<ImageCollection> {
	const normalizedEntityType = requireLimitedText(entityType, FIELD_LIMITS.imageCollectionEntityType);
	const normalizedEntityId = String(entityId);
	const normalizedItems = normalizeItems(items, policy);

	const now = nowIso();
	await execute(
		`INSERT INTO image_collections (id, entity_type, entity_id, primary_required, max_items, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $6)
		 ON CONFLICT(entity_type, entity_id) DO UPDATE SET
			primary_required = excluded.primary_required,
			max_items = excluded.max_items,
			updated_at = excluded.updated_at,
			removed_at = NULL`,
		[createUuidV7(), normalizedEntityType, normalizedEntityId, policy.primaryRequired ? 1 : 0, policy.maxItems, now]
	);

	const collection = await selectOne<{ id: string }>(
		'SELECT id FROM image_collections WHERE entity_type = $1 AND entity_id = $2 AND removed_at IS NULL',
		[normalizedEntityType, normalizedEntityId]
	);
	if (!collection) throw new Error('image_collection_save_failed');

	const removedAt = nowIso();
	await execute('UPDATE image_collection_items SET removed_at = $2, updated_at = $2 WHERE collection_id = $1 AND removed_at IS NULL', [collection.id, removedAt]);
	for (const [index, item] of normalizedItems.entries()) {
		const imageHash = await saveMedia('user', item.imageBytes);
		const originalImageHash = await saveMedia('user', item.originalImageBytes);
		if (!imageHash || !originalImageHash) throw new Error('image_collection_save_failed');
		const createdAt = nowIso();
		await execute(
			`INSERT INTO image_collection_items (
				id, collection_id, image_hash, original_image_hash, description, is_primary, sort_order, created_at, updated_at
			)
			 VALUES ($1, $2, ${mediaHashToSqlLiteral(imageHash)}, ${mediaHashToSqlLiteral(originalImageHash)}, $3, $4, $5, $6, $6)`,
			[createUuidV7(), collection.id, item.description || null, item.isPrimary ? 1 : 0, index, createdAt]
		);
	}

	const saved = await getImageCollection(normalizedEntityType, normalizedEntityId);
	if (!saved) throw new Error('image_collection_save_failed');
	return saved;
}

export async function deleteImageCollection(entityType: string, entityId: ImageCollectionEntityId): Promise<void> {
	const normalizedEntityType = requireLimitedText(entityType, FIELD_LIMITS.imageCollectionEntityType);
	const removedAt = nowIso();
	await execute('UPDATE image_collections SET removed_at = $3, updated_at = $3 WHERE entity_type = $1 AND entity_id = $2 AND removed_at IS NULL', [
		normalizedEntityType,
		String(entityId),
		removedAt
	]);
}
