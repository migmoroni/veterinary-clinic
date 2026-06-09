import { describe, expect, it } from 'vitest';
import {
	validateImageCollectionItems,
	type ImageCollectionItemInput,
	type ImageCollectionPolicy
} from '../image-collection.js';

function image(isPrimary = false): ImageCollectionItemInput {
	return {
		clientId: crypto.randomUUID(),
		imageBytes: Uint8Array.from([1, 2, 3]),
		originalImageBytes: Uint8Array.from([1, 2, 3, 4]),
		description: '',
		isPrimary
	};
}

describe('image collection policies', () => {
	it('accepts an unlimited collection without a primary image', () => {
		const policy: ImageCollectionPolicy = { maxItems: null, primaryRequired: false };
		expect(() => validateImageCollectionItems([image(), image()], policy)).not.toThrow();
	});

	it('requires exactly one primary image when configured and items exist', () => {
		const policy: ImageCollectionPolicy = { maxItems: 9, primaryRequired: true };
		expect(() => validateImageCollectionItems([image(), image()], policy)).toThrow('image_collection_primary_required');
		expect(() => validateImageCollectionItems([image(true), image(true)], policy)).toThrow('image_collection_multiple_primary');
		expect(() => validateImageCollectionItems([image(true), image()], policy)).not.toThrow();
	});

	it('allows an empty required-primary collection and enforces its item limit', () => {
		const policy: ImageCollectionPolicy = { maxItems: 2, primaryRequired: true };
		expect(() => validateImageCollectionItems([], policy)).not.toThrow();
		expect(() => validateImageCollectionItems([image(true), image(), image()], policy)).toThrow('image_collection_limit_exceeded');
	});

	it('requires both the cropped image and its editable original', () => {
		const policy: ImageCollectionPolicy = { maxItems: null, primaryRequired: false };
		expect(() => validateImageCollectionItems([{ ...image(), originalImageBytes: new Uint8Array() }], policy)).toThrow('image_original_required');
		expect(() => validateImageCollectionItems([{ ...image(), imageBytes: new Uint8Array() }], policy)).toThrow('image_required');
	});
});
