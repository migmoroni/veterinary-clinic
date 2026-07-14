import { describe, expect, it } from 'vitest';
import {
	canDeleteProductCatalogItem,
	canEditProductCatalogItem,
	normalizeProductCatalogExtension,
	normalizeProductRegions,
	parseProductRegions,
	parseProductType,
	PRODUCT_TYPES,
	productType,
	productTypeOptions,
	stringifyProductRegions,
	stringifyProductType
} from '../catalog.js';

describe('product catalog metadata', () => {
	it('defines product types as direct tuples from the type tree', () => {
		expect(productTypeOptions('medication')).toEqual(['vaccine', 'antiparasitic']);
		expect(productTypeOptions('nutrition')).toEqual([]);
		expect(productTypeOptions('hygiene')).toEqual([]);
		expect(productTypeOptions('disinfectants')).toEqual([]);
		expect(PRODUCT_TYPES).toEqual([
			['product', 'medication', 'vaccine'],
			['product', 'medication', 'antiparasitic'],
			['product', 'nutrition', null],
			['product', 'hygiene', null],
			['product', 'disinfectants', null]
		]);
	});

	it('round-trips product type tuples and rejects invalid branches', () => {
		expect(parseProductType(stringifyProductType(productType('medication', 'vaccine')))).toEqual(['product', 'medication', 'vaccine']);
		expect(parseProductType(stringifyProductType(productType('nutrition', null)))).toEqual(['product', 'nutrition', null]);
		expect(() => parseProductType(JSON.stringify(['product', 'nutrition', 'vaccine']))).toThrow('product_type_invalid');
	});

	it('normalizes unique ISO alpha-3 market country codes', () => {
		expect(normalizeProductRegions([' bra ', 'USA', 'BRA', 'invalid', ''])).toEqual(['BRA', 'USA']);
	});

	it('round-trips persisted market regions and rejects malformed input', () => {
		expect(parseProductRegions(stringifyProductRegions(['PRT', 'BRA']))).toEqual(['PRT', 'BRA']);
		expect(parseProductRegions('not-json')).toEqual([]);
		expect(parseProductRegions('["BR","BRA"]')).toEqual(['BRA']);
	});

	it('only allows user-created catalog items to be edited or deleted', () => {
		expect(canEditProductCatalogItem({ origin: 'user' })).toBe(true);
		expect(canEditProductCatalogItem({ origin: 'system' })).toBe(false);
		expect(canDeleteProductCatalogItem({ origin: 'user' })).toBe(true);
		expect(canDeleteProductCatalogItem({ origin: 'system' })).toBe(false);
	});

	it('normalizes product extension clinical and regulatory classification fields', () => {
		expect(
			normalizeProductCatalogExtension({
				classification: {
					commercialTherapeutic: {
						compositionOrigin: 'biological',
						commercialCategory: 'reference',
						therapeuticAction: 'prophylactic'
					},
					formAndAdministration: {
						pharmaceuticalForm: 'injectableSolution',
						administrationRoutes: ['subcutaneous', 'invalid', 'subcutaneous', 'intramuscular'],
						presentationDosage: ' 1 mL por dose '
					},
					targetSpecies: {
						warnings: [' Confirmar especie-alvo. ', '', 'Confirmar especie-alvo.']
					},
					regulatoryIdentifiers: {
						brazilMapa: ' MAPA 00000/2026 ',
						unitedStatesNada: ' NADA 000-000 ',
						unitedStatesAnada: '',
						gtinEan: ' 7890000000000 '
					}
				}
			})
		).toMatchObject({
			classification: {
				commercialTherapeutic: {
					compositionOrigin: 'biological',
					commercialCategory: 'reference',
					therapeuticAction: 'prophylactic'
				},
				formAndAdministration: {
					pharmaceuticalForm: 'injectableSolution',
					administrationRoutes: ['subcutaneous', 'intramuscular'],
					presentationDosage: '1 mL por dose'
				},
				targetSpecies: {
					warnings: ['Confirmar especie-alvo.']
				},
				regulatoryIdentifiers: {
					brazilMapa: 'MAPA 00000/2026',
					unitedStatesNada: 'NADA 000-000',
					unitedStatesAnada: null,
					gtinEan: '7890000000000'
				}
			}
		});
	});
});
