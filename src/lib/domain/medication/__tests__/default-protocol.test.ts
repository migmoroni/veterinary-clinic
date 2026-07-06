import { describe, expect, it } from 'vitest';
import { defaultMedicationCatalogItems } from '../default-catalog.js';
import { defaultMedicationProtocols } from '../default-protocol.js';
import { canDeleteMedicationProtocol, canEditMedicationProtocol } from '../protocol.js';

describe('default medication protocols', () => {
	it('provides the shared canine primary series for Vanguard Plus and Recombitek C6', () => {
		expect(defaultMedicationProtocols).toEqual([
			{
				kind: 'vaccine',
				origin: 'system',
				name: '4 doses',
				species: ['canine'],
				catalogItemNames: ['Vanguard Plus', 'Recombitek C6'],
				observation: null,
				doses: [
					{ dose: '1ª dose', validityValue: 21, validityUnit: 'days' },
					{ dose: '2ª dose', validityValue: 21, validityUnit: 'days' },
					{ dose: '3ª dose', validityValue: 21, validityUnit: 'days' },
					{ dose: '4ª dose', validityValue: 1, validityUnit: 'years' },
					{ dose: 'anual', validityValue: 1, validityUnit: 'years' }
				]
			}
		]);
	});

	it('only references bundled catalog products of the same kind', () => {
		for (const protocol of defaultMedicationProtocols) {
			for (const catalogItemName of protocol.catalogItemNames) {
				expect(defaultMedicationCatalogItems.some((item) => item.kind === protocol.kind && item.name === catalogItemName)).toBe(true);
			}
		}
	});

	it('only allows user-created protocols to be edited or deleted', () => {
		expect(canEditMedicationProtocol({ origin: 'user' })).toBe(true);
		expect(canEditMedicationProtocol({ origin: 'system' })).toBe(false);
		expect(canDeleteMedicationProtocol({ origin: 'user' })).toBe(true);
		expect(canDeleteMedicationProtocol({ origin: 'system' })).toBe(false);
	});
});
