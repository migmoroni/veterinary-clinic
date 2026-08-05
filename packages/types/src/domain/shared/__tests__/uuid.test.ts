import { describe, expect, it } from 'vitest';
import { createUuidV4, isUuid, isUuidV4 } from '../uuid.js';

describe('uuid helpers', () => {
	it('recognizes UUID values', () => {
		expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
		expect(isUuid('not-a-uuid')).toBe(false);
	});

	it('generates version 4 UUIDs', () => {
		const first = createUuidV4();
		const second = createUuidV4();

		expect(isUuidV4(first)).toBe(true);
		expect(isUuidV4(second)).toBe(true);
		expect(first).not.toBe(second);
		expect(first[14]).toBe('4');
	});
});
