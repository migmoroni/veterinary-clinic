import { describe, expect, it } from 'vitest';
import { normalizePreventiveRegions, parsePreventiveRegions, stringifyPreventiveRegions } from '../catalog.js';

describe('preventive catalog metadata', () => {
	it('normalizes unique ISO alpha-3 market country codes', () => {
		expect(normalizePreventiveRegions([' bra ', 'USA', 'BRA', 'invalid', ''])).toEqual(['BRA', 'USA']);
	});

	it('round-trips persisted market regions and rejects malformed input', () => {
		expect(parsePreventiveRegions(stringifyPreventiveRegions(['PRT', 'BRA']))).toEqual(['PRT', 'BRA']);
		expect(parsePreventiveRegions('not-json')).toEqual([]);
		expect(parsePreventiveRegions('["BR","BRA"]')).toEqual(['BRA']);
	});
});
