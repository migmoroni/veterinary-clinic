import type { PreventiveProtocol, PreventiveProtocolDoseInput, PreventiveProtocolInput, PreventiveProtocolKind } from '$lib/domain/preventive/protocol.js';
import { deletePreventiveProtocol, deletePreventiveProtocolDose, listPreventiveProtocols, savePreventiveProtocol, savePreventiveProtocolDose, setPreventiveProtocolHidden } from '$lib/persistence/repositories/preventive-protocol.repository.js';

export async function loadPreventiveProtocols(kind?: PreventiveProtocolKind, includeHidden = false): Promise<PreventiveProtocol[]> {
	return listPreventiveProtocols(kind, includeHidden);
}

export async function saveProtocol(input: PreventiveProtocolInput, id?: number): Promise<PreventiveProtocol> {
	return savePreventiveProtocol(input, id);
}

export async function setProtocolHidden(id: number, hidden: boolean): Promise<PreventiveProtocol> {
	return setPreventiveProtocolHidden(id, hidden);
}

export async function removeProtocol(id: number): Promise<void> {
	await deletePreventiveProtocol(id);
}

export async function saveProtocolDose(protocolId: number, input: PreventiveProtocolDoseInput, id?: number): Promise<PreventiveProtocol> {
	return savePreventiveProtocolDose(protocolId, input, id);
}

export async function removeProtocolDose(protocolId: number, doseId: number): Promise<PreventiveProtocol> {
	return deletePreventiveProtocolDose(protocolId, doseId);
}