import { describe, expect, it } from 'vitest';
import { canDeleteMedicationCatalogItem, canEditMedicationCatalogItem, normalizeMedicationRegions, parseMedicationRegions, stringifyMedicationRegions } from '../catalog.js';

describe('medication catalog metadata', () => {
	it('normalizes unique ISO alpha-3 market country codes', () => {
		expect(normalizeMedicationRegions([' bra ', 'USA', 'BRA', 'invalid', ''])).toEqual(['BRA', 'USA']);
	});

	it('round-trips persisted market regions and rejects malformed input', () => {
		expect(parseMedicationRegions(stringifyMedicationRegions(['PRT', 'BRA']))).toEqual(['PRT', 'BRA']);
		expect(parseMedicationRegions('not-json')).toEqual([]);
		expect(parseMedicationRegions('["BR","BRA"]')).toEqual(['BRA']);
	});

	it('only allows user-created catalog items to be edited or deleted', () => {
		expect(canEditMedicationCatalogItem({ origin: 'user' })).toBe(true);
		expect(canEditMedicationCatalogItem({ origin: 'system' })).toBe(false);
		expect(canDeleteMedicationCatalogItem({ origin: 'user' })).toBe(true);
		expect(canDeleteMedicationCatalogItem({ origin: 'system' })).toBe(false);
	});
});
