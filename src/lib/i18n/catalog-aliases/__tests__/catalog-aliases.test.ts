import { describe, expect, it } from 'vitest';
import { localizedCatalogAliases } from '../index.js';

describe('catalog alias translations', () => {
	it('collects localized terms without duplicates', () => {
		const aliases = localizedCatalogAliases('catalogAlias.polyvalent');

		expect(aliases).toContain('polivalente');
		expect(aliases).toContain('polyvalent');
		expect(new Set(aliases).size).toBe(aliases.length);
	});

	it('keeps language-independent codes outside translation dictionaries', () => {
		expect(localizedCatalogAliases('catalogAlias.polyvalent')).not.toContain('V10');
	});
});
