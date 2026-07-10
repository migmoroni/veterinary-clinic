import { describe, expect, it } from 'vitest';
import { defaultMedicationCatalogItems } from '../../medication/default-catalog.js';
import { isUuidV4 } from '../../shared/uuid.js';
import { defaultTreatmentProtocols } from '../default-protocol.js';
import { canDeleteTreatmentProtocol, canEditTreatmentProtocol } from '../protocol.js';

function bundledMedicationId(kind: string, name: string): string {
	const item = defaultMedicationCatalogItems.find((candidate) => candidate.kind === kind && candidate.name === name);
	if (!item) throw new Error(`Default medication not found: ${kind}:${name}`);
	return item.id;
}

describe('default treatment protocols', () => {
	it('provides the shared canine primary series for bundled vaccines', () => {
		const protocolByName = new Map(defaultTreatmentProtocols.map((protocol) => [protocol.name, protocol]));
		const sharedCatalogItemIds = [bundledMedicationId('vaccine', 'Vanguard Plus'), bundledMedicationId('vaccine', 'Recombitek C6')];

		expect(protocolByName.get('4 doses')).toMatchObject({
			kind: 'vaccine',
			origin: 'system',
			species: ['canine'],
			observation: null,
			doses: [
				{ dose: '1ª', validityValue: 21, validityUnit: 'days' },
				{ dose: '2ª', validityValue: 21, validityUnit: 'days' },
				{ dose: '3ª', validityValue: 21, validityUnit: 'days' },
				{ dose: '4ª', validityValue: 1, validityUnit: 'years' }
			]
		});
		expect(protocolByName.get('4 doses')?.catalogItemIds).toEqual(expect.arrayContaining(sharedCatalogItemIds));
		expect(protocolByName.get('3 doses')?.catalogItemIds).toEqual(expect.arrayContaining(sharedCatalogItemIds));
		expect(protocolByName.get('2 doses')?.catalogItemIds).toEqual(expect.arrayContaining(sharedCatalogItemIds));
	});

	it('only references bundled catalog products of the same kind', () => {
		for (const protocol of defaultTreatmentProtocols) {
			expect(isUuidV4(protocol.id)).toBe(true);
			for (const catalogItemId of protocol.catalogItemIds) {
				expect(defaultMedicationCatalogItems.some((item) => item.kind === protocol.kind && item.id === catalogItemId)).toBe(true);
			}
		}
	});

	it('uses stable unique ids for bundled protocols', () => {
		const ids = defaultTreatmentProtocols.map((protocol) => protocol.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('only allows user-created protocols to be edited or deleted', () => {
		expect(canEditTreatmentProtocol({ origin: 'user' })).toBe(true);
		expect(canEditTreatmentProtocol({ origin: 'system' })).toBe(false);
		expect(canDeleteTreatmentProtocol({ origin: 'user' })).toBe(true);
		expect(canDeleteTreatmentProtocol({ origin: 'system' })).toBe(false);
	});
});
