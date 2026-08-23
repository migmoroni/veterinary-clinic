import { describe, expect, it } from 'vitest';
import { isUuidV4 } from '@vet/types/domain/shared/uuid.js';
import { CONDITION_TYPES, conditionProfileSectionIds, conditionType, conditionTypeOptions, parseConditionType, stringifyConditionCatalogExtension, stringifyConditionType } from '../catalog.js';
import { defaultConditionCatalogItems } from '../default-catalog.js';
import { FIELD_LIMITS } from '@vet/types/domain/shared/field-limits.js';

describe('condition catalog metadata', () => {
	it('defines condition types as direct tuples from the type tree', () => {
		expect(conditionTypeOptions('disease')).toEqual(['infectiousAndParasitic', 'neoplastic', 'immuneAndInflammatory', 'systemicAndMetabolic', 'geneticAndDevelopmental']);
		expect(conditionTypeOptions('injury')).toContain('mechanicalAndTraumatic');
		expect(CONDITION_TYPES).toEqual(expect.arrayContaining([['condition', 'disease', 'infectiousAndParasitic', 'viral'], ['condition', 'injury', 'mechanicalAndTraumatic', 'softTissueTrauma']]));
	});

	it('round-trips condition type tuples', () => {
		expect(parseConditionType(stringifyConditionType(conditionType('disease', 'infectiousAndParasitic', 'viral')))).toEqual(['condition', 'disease', 'infectiousAndParasitic', 'viral']);
		expect(parseConditionType(stringifyConditionType(conditionType('injury', 'mechanicalAndTraumatic', 'softTissueTrauma')))).toEqual(['condition', 'injury', 'mechanicalAndTraumatic', 'softTissueTrauma']);
	});

	it('includes a complete fictitious condition sample', () => {
		const sample = defaultConditionCatalogItems.find((item) => item.name === 'Condição Fictícia');

		expect(sample).toBeTruthy();
		expect(isUuidV4(sample?.id ?? '')).toBe(true);
		expect(sample?.aliases.every((alias) => alias.length <= FIELD_LIMITS.catalogAlias)).toBe(true);
		expect(stringifyConditionCatalogExtension(sample?.extension).length).toBeLessThanOrEqual(FIELD_LIMITS.productExtensionJson);

		for (const sectionId of conditionProfileSectionIds) {
			expect(sample?.extension?.sections?.[sectionId]?.trim().length).toBeGreaterThan(0);
		}
	});
});
