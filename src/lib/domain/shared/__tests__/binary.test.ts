import { describe, expect, it } from 'vitest';
import { bytesToArrayBuffer, normalizeByteArray } from '../binary.js';

describe('binary helpers', () => {
	it('copies bytes into a detached array buffer', () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const buffer = bytesToArrayBuffer(bytes);

		bytes[0] = 99;

		expect([...new Uint8Array(buffer)]).toEqual([1, 2, 3]);
	});

	it('keeps Uint8Array instances and wraps ArrayBuffer values', () => {
		const bytes = new Uint8Array([4, 5, 6]);

		expect(normalizeByteArray(bytes)).toBe(bytes);
		expect([...(normalizeByteArray(bytes.buffer) ?? [])]).toEqual([4, 5, 6]);
	});

	it('filters array values to byte-like finite numbers', () => {
		expect(normalizeByteArray([0, 255, 256, -1, 1.9, Number.NaN, Number.POSITIVE_INFINITY, '7'])).toEqual(new Uint8Array([0, 255, 1]));
	});

	it('normalizes sqlite-style objects with data arrays', () => {
		expect(normalizeByteArray({ data: [10, 20, 999, null, 30] })).toEqual(new Uint8Array([10, 20, 30]));
	});

	it('returns null for unsupported binary shapes', () => {
		expect(normalizeByteArray(undefined)).toBeNull();
		expect(normalizeByteArray('abc')).toBeNull();
		expect(normalizeByteArray({ data: 'abc' })).toBeNull();
	});
});