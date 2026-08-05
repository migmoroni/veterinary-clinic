import type { TreatmentProtocol, TreatmentProtocolDoseInput, TreatmentProtocolId, TreatmentProtocolInput, TreatmentProtocolKind } from '@vet/types/domain/treatment/protocol.js';
import { deleteTreatmentProtocol, deleteTreatmentProtocolDose, listTreatmentProtocols, saveTreatmentProtocol, saveTreatmentProtocolDose, setTreatmentProtocolHidden } from '../repositories/treatment-protocol.repository.js';

export async function loadTreatmentProtocols(kind?: TreatmentProtocolKind, includeHidden = false): Promise<TreatmentProtocol[]> {
	return listTreatmentProtocols(kind, includeHidden);
}

export async function saveProtocol(input: TreatmentProtocolInput, id?: TreatmentProtocolId): Promise<TreatmentProtocol> {
	return saveTreatmentProtocol(input, id);
}

export async function setProtocolHidden(id: TreatmentProtocolId, hidden: boolean): Promise<TreatmentProtocol> {
	return setTreatmentProtocolHidden(id, hidden);
}

export async function removeProtocol(id: TreatmentProtocolId): Promise<void> {
	await deleteTreatmentProtocol(id);
}

export async function saveProtocolDose(protocolId: TreatmentProtocolId, input: TreatmentProtocolDoseInput, id?: string): Promise<TreatmentProtocol> {
	return saveTreatmentProtocolDose(protocolId, input, id);
}

export async function removeProtocolDose(protocolId: TreatmentProtocolId, doseId: string): Promise<TreatmentProtocol> {
	return deleteTreatmentProtocolDose(protocolId, doseId);
}
