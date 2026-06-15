import { describe, expect, it } from 'vitest';
import { canDeletePreventiveCatalogItem, canEditPreventiveCatalogItem, normalizePreventiveRegions, parsePreventiveRegions, stringifyPreventiveRegions } from '../catalog.js';

describe('preventive catalog metadata', () => {
	it('normalizes unique ISO alpha-3 market country codes', () => {
		expect(normalizePreventiveRegions([' bra ', 'USA', 'BRA', 'invalid', ''])).toEqual(['BRA', 'USA']);
	});

	it('round-trips persisted market regions and rejects malformed input', () => {
		expect(parsePreventiveRegions(stringifyPreventiveRegions(['PRT', 'BRA']))).toEqual(['PRT', 'BRA']);
		expect(parsePreventiveRegions('not-json')).toEqual([]);
		expect(parsePreventiveRegions('["BR","BRA"]')).toEqual(['BRA']);
	});

	it('only allows user-created catalog items to be edited or deleted', () => {
		expect(canEditPreventiveCatalogItem({ origin: 'user' })).toBe(true);
		expect(canEditPreventiveCatalogItem({ origin: 'system' })).toBe(false);
		expect(canDeletePreventiveCatalogItem({ origin: 'user' })).toBe(true);
		expect(canDeletePreventiveCatalogItem({ origin: 'system' })).toBe(false);
	});
});
