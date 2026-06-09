export interface ImageCollectionItem {
	id: number;
	imageBytes: Uint8Array;
	originalImageBytes: Uint8Array;
	description: string | null;
	isPrimary: boolean;
	sortOrder: number;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ImageCollectionItemInput {
	clientId: string;
	imageBytes: Uint8Array;
	originalImageBytes: Uint8Array;
	description: string;
	isPrimary: boolean;
}

export interface ImageCollection {
	id: number;
	entityType: string;
	entityId: number;
	primaryRequired: boolean;
	maxItems: number | null;
	items: ImageCollectionItem[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface ImageCollectionPolicy {
	primaryRequired: boolean;
	maxItems: number | null;
}

export function validateImageCollectionItems(items: ImageCollectionItemInput[], policy: ImageCollectionPolicy): void {
	if (policy.maxItems !== null && items.length > policy.maxItems) throw new Error('image_collection_limit_exceeded');
	if (items.some((item) => item.imageBytes.length === 0)) throw new Error('image_required');
	if (items.some((item) => item.originalImageBytes.length === 0)) throw new Error('image_original_required');

	const primaryCount = items.filter((item) => item.isPrimary).length;
	if (primaryCount > 1) throw new Error('image_collection_multiple_primary');
	if (policy.primaryRequired && items.length > 0 && primaryCount !== 1) throw new Error('image_collection_primary_required');
}
