import { describe, expect, it } from 'vitest';
import { localizedCatalogAliases } from '../index.js';
import { defaultProductCatalogItems } from '@vet/types/domain/product/default-catalog.js';
import { productTreatmentKind } from '@vet/types/domain/product/catalog.js';

function vaccine(name: string) {
	const item = defaultProductCatalogItems.find((candidate) => productTreatmentKind(candidate.type) === 'vaccine' && candidate.name === name);
	if (!item) throw new Error(`Default vaccine not found: ${name}`);
	return item;
}

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

	it('matches bundled product aliases without duplicating language-independent codes', () => {
		const vanguard = vaccine('Vanguard Plus');

		expect(vanguard.aliases).toEqual(expect.arrayContaining(localizedCatalogAliases('catalogAlias.polyvalent')));
		expect(vanguard.aliases).toContain('V10');
		expect(new Set(vanguard.aliases).size).toBe(vanguard.aliases.length);
	});
});
