import { describe, expect, it } from 'vitest';
import { localizedPreventiveAliases } from '../index.js';

describe('preventive alias translations', () => {
	it('collects localized terms without duplicates', () => {
		const aliases = localizedPreventiveAliases('preventiveAlias.polyvalent');

		expect(aliases).toContain('polivalente');
		expect(aliases).toContain('polyvalent');
		expect(new Set(aliases).size).toBe(aliases.length);
	});

	it('keeps language-independent codes outside translation dictionaries', () => {
		expect(localizedPreventiveAliases('preventiveAlias.polyvalent')).not.toContain('V10');
	});
});
