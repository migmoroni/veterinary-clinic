import { describe, expect, it } from 'vitest';
import { localizedProductAliases } from '../index.js';

describe('product alias translations', () => {
	it('collects localized terms without duplicates', () => {
		const aliases = localizedProductAliases('productAlias.polyvalent');

		expect(aliases).toContain('polivalente');
		expect(aliases).toContain('polyvalent');
		expect(new Set(aliases).size).toBe(aliases.length);
	});

	it('keeps language-independent codes outside translation dictionaries', () => {
		expect(localizedProductAliases('productAlias.polyvalent')).not.toContain('V10');
	});
});
