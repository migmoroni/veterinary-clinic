import type { DefaultMedicationKind, DefaultMedicationSpecies } from './default-catalog.js';
import type { MedicationValidityUnit } from './protocol.js';
import vaccineProtocols from './defaults/vaccine-protocols.json' with { type: 'json' };
import antiparasiticProtocols from './defaults/antiparasitic-protocols.json' with { type: 'json' };

export type DefaultMedicationProtocolValidityUnit = MedicationValidityUnit;

export interface DefaultMedicationProtocolDose {
	dose: string;
	validityValue: number;
	validityUnit: DefaultMedicationProtocolValidityUnit;
}

export interface DefaultMedicationProtocol {
	kind: DefaultMedicationKind;
	origin: 'system';
	name: string;
	species: DefaultMedicationSpecies[];
	catalogItemNames: string[];
	observation: string | null;
	doses: DefaultMedicationProtocolDose[];
}

type DefaultMedicationProtocolJsonItem = Omit<DefaultMedicationProtocol, 'kind'>;

function withKind(kind: DefaultMedicationKind, items: DefaultMedicationProtocolJsonItem[]): DefaultMedicationProtocol[] {
	return items.map((item) => ({ kind, ...item }));
}

export const defaultMedicationProtocols: DefaultMedicationProtocol[] = [
	...withKind('vaccine', vaccineProtocols as DefaultMedicationProtocolJsonItem[]),
	...withKind('antiparasitic', antiparasiticProtocols as DefaultMedicationProtocolJsonItem[])
];
