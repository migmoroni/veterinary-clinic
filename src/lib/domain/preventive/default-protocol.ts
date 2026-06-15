import type { DefaultPreventiveKind, DefaultPreventiveSpecies } from './default-catalog.js';

export type DefaultPreventiveProtocolValidityUnit = 'days' | 'months' | 'years';

export interface DefaultPreventiveProtocolDose {
	dose: string;
	validityValue: number;
	validityUnit: DefaultPreventiveProtocolValidityUnit;
}

export interface DefaultPreventiveProtocol {
	kind: DefaultPreventiveKind;
	origin: 'system';
	name: string;
	species: DefaultPreventiveSpecies[];
	catalogItemNames: string[];
	observation: string | null;
	doses: DefaultPreventiveProtocolDose[];
}

/**
 * Protocols offered when a new database is created. Product names must match
 * canonical entries from the bundled preventive catalog.
 */
export const defaultPreventiveProtocols: DefaultPreventiveProtocol[] = [
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
];
