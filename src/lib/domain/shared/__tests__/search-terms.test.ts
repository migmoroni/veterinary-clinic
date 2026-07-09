import { describe, expect, it } from 'vitest';
import { normalizeSearchText, searchTermsForLocale } from '../search-terms.js';

describe('search term normalization', () => {
	it('normalizes accents before matching search text', () => {
		expect(normalizeSearchText('Narú')).toBe('naru');
		expect(normalizeSearchText('São João, Cão e Gato')).toBe('sao joao cao e gato');
	});

	it('uses locale stop words after normalization', () => {
		expect(searchTermsForLocale('o cão de Narú', 'pt-BR')).toEqual(['cao', 'naru']);
		expect(searchTermsForLocale('the feline from Bogotá', 'en-US')).toEqual(['feline', 'bogota']);
		expect(searchTermsForLocale('el perro de Córdoba', 'es-ES')).toEqual(['perro', 'cordoba']);
	});
});
