import { describe, expect, it } from 'vitest';
import { isUuidV4 } from '$lib/domain/shared/uuid.js';
import { CONDITION_TYPES, conditionProfileSectionIds, conditionType, conditionTypeOptions, parseConditionType, stringifyConditionCatalogExtension, stringifyConditionType } from '../catalog.js';
import { defaultConditionCatalogItems } from '../default-catalog.js';
import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';

describe('condition catalog metadata', () => {
	it('defines condition types as direct tuples from the type tree', () => {
		expect(conditionTypeOptions('condition')).toEqual(['disease', 'syndrome', 'disorder', 'injury']);
		expect(CONDITION_TYPES).toEqual([
			['condition', 'disease'],
			['condition', 'syndrome'],
			['condition', 'disorder'],
			['condition', 'injury']
		]);
	});

	it('round-trips condition type tuples', () => {
		expect(parseConditionType(stringifyConditionType(conditionType('condition', 'disease')))).toEqual(['condition', 'disease']);
		expect(parseConditionType(stringifyConditionType(conditionType('condition', 'injury')))).toEqual(['condition', 'injury']);
	});

	it('includes a complete fictitious condition sample', () => {
		const sample = defaultConditionCatalogItems.find((item) => item.name === 'Condição Fictícia');

		expect(sample).toBeTruthy();
		expect(sample?.origin).toBe('system');
		expect(isUuidV4(sample?.id ?? '')).toBe(true);
		expect(sample?.aliases.every((alias) => alias.length <= FIELD_LIMITS.catalogAlias)).toBe(true);
		expect(stringifyConditionCatalogExtension(sample?.extension).length).toBeLessThanOrEqual(FIELD_LIMITS.productExtensionJson);

		for (const sectionId of conditionProfileSectionIds) {
			expect(sample?.extension?.sections?.[sectionId]?.trim().length).toBeGreaterThan(0);
		}
	});
});
