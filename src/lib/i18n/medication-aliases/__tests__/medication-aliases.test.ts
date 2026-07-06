import { describe, expect, it } from 'vitest';
import { localizedMedicationAliases } from '../index.js';

describe('medication alias translations', () => {
	it('collects localized terms without duplicates', () => {
		const aliases = localizedMedicationAliases('medicationAlias.polyvalent');

		expect(aliases).toContain('polivalente');
		expect(aliases).toContain('polyvalent');
		expect(new Set(aliases).size).toBe(aliases.length);
	});

	it('keeps language-independent codes outside translation dictionaries', () => {
		expect(localizedMedicationAliases('medicationAlias.polyvalent')).not.toContain('V10');
	});
});
