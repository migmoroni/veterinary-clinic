/**
 * Persisted image entry. `imageBytes` is ready for display, while
 * `originalImageBytes` is the source retained for later editing.
 */
export interface ImageCollectionItem {
	id: string;
	imageBytes: Uint8Array;
	originalImageBytes: Uint8Array;
	description: string | null;
	isPrimary: boolean;
	sortOrder: number;
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Client-side image entry used while organizing a collection before saving.
 * Array order is authoritative and becomes `sortOrder` during persistence.
 */
export interface ImageCollectionItemInput {
	clientId: string;
	imageBytes: Uint8Array;
	originalImageBytes: Uint8Array;
	description: string;
	isPrimary: boolean;
}

export type ImageCollectionEntityId = number | string;

/** A generic image collection owned by an entity identified by type and id. */
export interface ImageCollection {
	id: string;
	entityType: string;
	entityId: ImageCollectionEntityId;
	primaryRequired: boolean;
	maxItems: number | null;
	items: ImageCollectionItem[];
	createdAt: string | null;
	updatedAt: string | null;
}

/**
 * Collection rules are stored with the collection so different consumers can
 * require a primary image, impose a limit, or allow unlimited images.
 */
export interface ImageCollectionPolicy {
	primaryRequired: boolean;
	maxItems: number | null;
}

/**
 * Enforces collection-wide invariants before persistence.
 *
 * Empty collections are valid even when a primary image is required. Once an
 * item exists, exactly one primary must be selected under that policy.
 */
export function validateImageCollectionItems(items: ImageCollectionItemInput[], policy: ImageCollectionPolicy): void {
	if (policy.maxItems !== null && items.length > policy.maxItems) throw new Error('image_collection_limit_exceeded');
	if (items.some((item) => item.imageBytes.length === 0)) throw new Error('image_required');
	if (items.some((item) => item.originalImageBytes.length === 0)) throw new Error('image_original_required');

	const primaryCount = items.filter((item) => item.isPrimary).length;
	if (primaryCount > 1) throw new Error('image_collection_multiple_primary');
	if (policy.primaryRequired && items.length > 0 && primaryCount !== 1) throw new Error('image_collection_primary_required');
}
