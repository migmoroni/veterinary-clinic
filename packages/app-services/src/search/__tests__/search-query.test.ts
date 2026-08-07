import { describe, expect, it } from 'vitest';
import { acceptsAverageScore, queryCollectionSearch, searchTerms } from '../search-query.js';

type CatalogRow = {
	id: string;
	name: string;
	manufacturer: string;
	aliases: string[];
	regions: string[];
	section: string;
	kind: 'vaccine' | 'antiparasitic';
};

const rows: CatalogRow[] = [
	{ id: '1', name: 'V10 Polivalente', manufacturer: 'Vet Lab', aliases: ['Decupla'], regions: ['BRA'], section: 'Vacina para cães', kind: 'vaccine' },
	{ id: '2', name: 'Milpro', manufacturer: 'Virbac', aliases: ['Milbemicina'], regions: ['BRA', 'PRY'], section: 'Antiparasitário oral', kind: 'antiparasitic' },
	{ id: '3', name: 'Antiemético Teste', manufacturer: 'Vet Lab', aliases: [], regions: ['USA'], section: 'Uso pontual', kind: 'antiparasitic' }
];

describe('queryCollectionSearch', () => {
	it('filters and sorts by relevance before fallback ordering', () => {
		const result = queryCollectionSearch({
			query: 'vet',
			items: rows,
			fields: (row) => ({
				primary: [row.name],
				support: [row.manufacturer, ...row.aliases],
				metadata: row.regions,
				details: [row.section]
			}),
			compare: (first, second) => first.name.localeCompare(second.name)
		});

		expect(result.items.map((row) => row.id)).toEqual(['3', '1']);
		expect(result.hits.map((hit) => hit.score)).toEqual([80, 80]);
	});

	it('keeps filtered rows when the query is empty', () => {
		const result = queryCollectionSearch({
			query: '',
			items: rows,
			fields: (row) => ({ primary: [row.name] }),
			filters: [{ isActive: true, matches: (row) => row.kind === 'vaccine' }]
		});

		expect(result.items.map((row) => row.id)).toEqual(['1']);
		expect(result.terms).toEqual([]);
	});

	it('can require a query match for global-like searches', () => {
		const result = queryCollectionSearch({
			query: 'a',
			items: rows,
			fields: (row) => ({ primary: [row.name] }),
			termMode: 'locale',
			locale: 'pt-BR',
			requireQueryMatch: true
		});

		expect(result.items).toEqual([]);
	});

	it('matches accents and multiple terms', () => {
		const result = queryCollectionSearch({
			query: 'antiparasitario oral',
			items: rows,
			fields: (row) => ({ primary: [row.name], details: [row.section] })
		});

		expect(result.items.map((row) => row.id)).toEqual(['2']);
	});

	it('supports average score thresholds for reference search', () => {
		const result = queryCollectionSearch({
			query: 'oral',
			items: rows,
			fields: (row) => ({ primary: [row.name], details: [row.section] }),
			acceptsScore: acceptsAverageScore
		});

		expect(result.items).toEqual([]);
	});

	it('normalizes terms according to the selected strategy', () => {
		expect(searchTerms('o cão de Narú', 'pt-BR', 'locale')).toEqual(['cao', 'naru']);
		expect(searchTerms('o cão de Narú', 'pt-BR', 'plain')).toEqual(['o', 'cao', 'de', 'naru']);
	});
});
