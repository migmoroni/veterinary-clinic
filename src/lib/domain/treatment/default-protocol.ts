import type { TreatmentCatalogItemId, TreatmentKind, TreatmentSpecies } from '$lib/domain/treatment/treatment.js';
import type { TreatmentProtocolId, TreatmentProtocolValidityUnit } from './protocol.js';
import vaccineProtocols from './defaults/vaccine-protocols.json' with { type: 'json' };
import antiparasiticProtocols from './defaults/antiparasitic-protocols.json' with { type: 'json' };

export type DefaultTreatmentProtocolValidityUnit = TreatmentProtocolValidityUnit;

export interface DefaultTreatmentProtocolDose {
	dose: string;
	validityValue: number;
	validityUnit: DefaultTreatmentProtocolValidityUnit;
}

export interface DefaultTreatmentProtocol {
	id: TreatmentProtocolId;
	kind: TreatmentKind;
	origin: 'system';
	name: string;
	species: TreatmentSpecies[];
	catalogItemIds: TreatmentCatalogItemId[];
	observation: string | null;
	doses: DefaultTreatmentProtocolDose[];
}

type DefaultTreatmentProtocolJsonItem = Omit<DefaultTreatmentProtocol, 'kind'>;

function withKind(kind: TreatmentKind, items: DefaultTreatmentProtocolJsonItem[]): DefaultTreatmentProtocol[] {
	return items.map((item) => ({ kind, ...item }));
}

export const defaultTreatmentProtocols: DefaultTreatmentProtocol[] = [
	...withKind('vaccine', vaccineProtocols as DefaultTreatmentProtocolJsonItem[]),
	...withKind('antiparasitic', antiparasiticProtocols as DefaultTreatmentProtocolJsonItem[])
];
