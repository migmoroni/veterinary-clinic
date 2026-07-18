import { ACTIVE_INGREDIENT_TYPE_TREE } from '$lib/domain/active-ingredient/catalog.js';
import { CONDITION_TYPE_TREE } from '$lib/domain/condition/catalog.js';
import { MANUFACTURER_TYPE_TREE } from '$lib/domain/manufacturer/catalog.js';
import { PRODUCT_TYPE_TREE } from '$lib/domain/product/catalog.js';
import { enUsActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/en-US.js';
import { esEsActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/es-ES.js';
import { frFrActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/fr-FR.js';
import { gnPyActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/gn-PY.js';
import { ptBrActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/pt-BR.js';
import { ptPtActiveIngredientTypeTreeTranslations } from '$lib/i18n/type-tree/active-ingredient/pt-PT.js';
import { enUsConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/en-US.js';
import { esEsConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/es-ES.js';
import { frFrConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/fr-FR.js';
import { gnPyConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/gn-PY.js';
import { ptBrConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/pt-BR.js';
import { ptPtConditionTypeTreeTranslations } from '$lib/i18n/type-tree/condition/pt-PT.js';
import { enUsManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/en-US.js';
import { esEsManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/es-ES.js';
import { frFrManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/fr-FR.js';
import { gnPyManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/gn-PY.js';
import { ptBrManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/pt-BR.js';
import { ptPtManufacturerTypeTreeTranslations } from '$lib/i18n/type-tree/manufacturer/pt-PT.js';
import { enUsProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/en-US.js';
import { esEsProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/es-ES.js';
import { frFrProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/fr-FR.js';
import { gnPyProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/gn-PY.js';
import { ptBrProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/pt-BR.js';
import { ptPtProductTypeTreeTranslations } from '$lib/i18n/type-tree/product/pt-PT.js';
import { describe, expect, it } from 'vitest';

type TypeTree = Record<string, Record<string, unknown>>;
type TranslationMap = Record<string, string>;

function collectTypeTreeKeys(tree: TypeTree, prefix: string): string[] {
	const root = Object.values(tree)[0] ?? {};
	const keys: string[] = [];

	function walk(node: unknown, path: string[]) {
		if (Array.isArray(node)) {
			for (const item of node) keys.push(`${prefix}.${[...path, item].join('.')}`);
			return;
		}

		if (!node || typeof node !== 'object') return;
		for (const [key, child] of Object.entries(node)) {
			keys.push(`${prefix}.${[...path, key].join('.')}`);
			walk(child, [...path, key]);
		}
	}

	walk(root, []);
	return keys.sort();
}

const locales = [
	['pt-BR', ptBrProductTypeTreeTranslations, ptBrManufacturerTypeTreeTranslations, ptBrActiveIngredientTypeTreeTranslations, ptBrConditionTypeTreeTranslations],
	['pt-PT', ptPtProductTypeTreeTranslations, ptPtManufacturerTypeTreeTranslations, ptPtActiveIngredientTypeTreeTranslations, ptPtConditionTypeTreeTranslations],
	['gn-PY', gnPyProductTypeTreeTranslations, gnPyManufacturerTypeTreeTranslations, gnPyActiveIngredientTypeTreeTranslations, gnPyConditionTypeTreeTranslations],
	['en-US', enUsProductTypeTreeTranslations, enUsManufacturerTypeTreeTranslations, enUsActiveIngredientTypeTreeTranslations, enUsConditionTypeTreeTranslations],
	['es-ES', esEsProductTypeTreeTranslations, esEsManufacturerTypeTreeTranslations, esEsActiveIngredientTypeTreeTranslations, esEsConditionTypeTreeTranslations],
	['fr-FR', frFrProductTypeTreeTranslations, frFrManufacturerTypeTreeTranslations, frFrActiveIngredientTypeTreeTranslations, frFrConditionTypeTreeTranslations]
] as const;

const expected = {
	product: collectTypeTreeKeys(PRODUCT_TYPE_TREE, 'product.type'),
	manufacturer: collectTypeTreeKeys(MANUFACTURER_TYPE_TREE, 'catalog.manufacturer.type'),
	activeIngredient: collectTypeTreeKeys(ACTIVE_INGREDIENT_TYPE_TREE, 'catalog.activeIngredient.type'),
	condition: collectTypeTreeKeys(CONDITION_TYPE_TREE, 'catalog.condition.type')
};

describe('type tree translations', () => {
	it.each(locales)('%s follows the current catalog type trees', (_locale, product, manufacturer, activeIngredient, condition) => {
		expect(Object.keys(product as TranslationMap).sort()).toEqual(expected.product);
		expect(Object.keys(manufacturer as TranslationMap).sort()).toEqual(expected.manufacturer);
		expect(Object.keys(activeIngredient as TranslationMap).sort()).toEqual(expected.activeIngredient);
		expect(Object.keys(condition as TranslationMap).sort()).toEqual(expected.condition);
	});
});
