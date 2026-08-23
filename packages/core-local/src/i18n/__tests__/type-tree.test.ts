import { ACTIVE_INGREDIENT_TYPE_TREE } from '@vet/types/domain/active-ingredient/catalog.js';
import { CONDITION_TYPE_TREE } from '@vet/types/domain/condition/catalog.js';
import { MANUFACTURER_TYPE_TREE } from '@vet/types/domain/manufacturer/catalog.js';
import { PRODUCT_TYPE_TREE } from '@vet/types/domain/product/catalog.js';
import { enUsActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/en-US.js';
import { esEsActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/es-ES.js';
import { frFrActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/fr-FR.js';
import { gnPyActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/gn-PY.js';
import { ptBrActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/pt-BR.js';
import { ptPtActiveIngredientTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/active-ingredient/pt-PT.js';
import { enUsConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/en-US.js';
import { esEsConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/es-ES.js';
import { frFrConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/fr-FR.js';
import { gnPyConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/gn-PY.js';
import { ptBrConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/pt-BR.js';
import { ptPtConditionTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/condition/pt-PT.js';
import { enUsManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/en-US.js';
import { esEsManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/es-ES.js';
import { frFrManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/fr-FR.js';
import { gnPyManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/gn-PY.js';
import { ptBrManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/pt-BR.js';
import { ptPtManufacturerTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/manufacturer/pt-PT.js';
import { enUsProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/en-US.js';
import { esEsProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/es-ES.js';
import { frFrProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/fr-FR.js';
import { gnPyProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/gn-PY.js';
import { ptBrProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/pt-BR.js';
import { ptPtProductTypeTreeTranslations } from '@vet/core-local/i18n/type-tree/product/pt-PT.js';
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
